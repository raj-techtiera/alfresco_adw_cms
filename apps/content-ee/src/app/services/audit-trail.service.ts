import { Injectable, inject } from '@angular/core';
import { AlfrescoApiService } from '@alfresco/adf-content-services';
import { AuditApi, AuditAppPaging, AuditEntryEntry, AuditEntryPaging, Node } from '@alfresco/js-api';
import { Observable, forkJoin, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export interface AuditTrailEntryView {
    id: string;
    createdAt: Date | string;
    createdBy: string;
    action: string;
    details: string;
    values: any;
}

@Injectable({
    providedIn: 'root'
})
export class AuditTrailService {
    private readonly apiService = inject(AlfrescoApiService);
    private auditApi?: AuditApi;

    getAuditEntriesForNode(nodeId: string): Observable<AuditTrailEntryView[]> {
        return from(
            this.getAuditApi().listAuditEntriesForNode(nodeId, {
                skipCount: 0,
                maxItems: 200,
                orderBy: ['createdAt DESC'],
                include: ['values']
            })
        ).pipe(
            map((response: AuditEntryPaging) => this.mapEntries(response.list?.entries || [])),
            catchError((error) => {
                if (error?.status !== 404) {
                    throw error;
                }

                return this.getAuditEntriesFromAllApps(nodeId);
            })
        );
    }

    getNodeLabel(node?: Node): string {
        if (!node) {
            return 'Item';
        }

        if (node.isFolder) {
            return 'Folder';
        }

        if (node.isFile) {
            return 'Document';
        }

        return 'Item';
    }

    private getAuditApi(): AuditApi {
        this.auditApi ??= new AuditApi(this.apiService.getInstance());
        return this.auditApi;
    }

    private mapEntries(entries: AuditEntryEntry[]): AuditTrailEntryView[] {
        return entries
            .map(({ entry }) => {
                const values = entry?.values || {};
                const flattened = this.flattenValues(values);
                return {
                    id: entry?.id || '',
                    createdAt: entry?.createdAt || '',
                    createdBy: entry?.createdByUser?.displayName || entry?.createdByUser?.id || 'System',
                    action: this.resolveAction(values, flattened),
                    details: this.resolveDetails(values, flattened),
                    values
                };
            })
            .filter((entry) => !!entry.id);
    }

    private getAuditEntriesFromAllApps(nodeId: string): Observable<AuditTrailEntryView[]> {
        return from(this.getAuditApi().listAuditApps({ maxItems: 100 })).pipe(
            switchMap((apps: AuditAppPaging) => {
                const appIds = (apps.list?.entries || []).map(({ entry }) => entry.id).filter(Boolean);

                if (appIds.length === 0) {
                    return of([] as AuditTrailEntryView[]);
                }

                return forkJoin(
                    appIds.map((appId) =>
                        from(
                            this.getAuditApi().listAuditEntriesForAuditApp(appId, {
                                skipCount: 0,
                                maxItems: 1000,
                                orderBy: ['createdAt DESC'],
                                include: ['values']
                            })
                        ).pipe(
                            map((response: AuditEntryPaging) => response.list?.entries || []),
                            catchError(() => of([] as AuditEntryEntry[]))
                        )
                    )
                ).pipe(
                    map((entriesByApp) => entriesByApp.flat()),
                    map((entries) => this.filterEntriesForNode(entries, nodeId)),
                    map((entries) => this.sortEntries(entries)),
                    map((entries) => this.mapEntries(entries))
                );
            }),
            catchError(() =>
                from(
                    this.getAuditApi().listAuditEntriesForAuditApp('alfresco-access', {
                        skipCount: 0,
                        maxItems: 1000,
                        orderBy: ['createdAt DESC'],
                        include: ['values']
                    })
                ).pipe(
                    map((response: AuditEntryPaging) => this.filterEntriesForNode(response.list?.entries || [], nodeId)),
                    map((entries) => this.sortEntries(entries)),
                    map((entries) => this.mapEntries(entries))
                )
            )
        );
    }

    private filterEntriesForNode(entries: AuditEntryEntry[], nodeId: string): AuditEntryEntry[] {
        const nodeRef = `workspace://SpacesStore/${nodeId}`;

        return entries.filter(({ entry }) => {
            const serialized = JSON.stringify(entry?.values || {});
            return serialized.includes(nodeId) || serialized.includes(nodeRef);
        });
    }

    private sortEntries(entries: AuditEntryEntry[]): AuditEntryEntry[] {
        return [...entries].sort((left, right) => {
            const leftTime = new Date(left.entry?.createdAt || 0).getTime();
            const rightTime = new Date(right.entry?.createdAt || 0).getTime();
            if (rightTime !== leftTime) {
                return rightTime - leftTime;
            }

            const leftAction = this.getPrimaryActionValue(left.entry?.values || {});
            const rightAction = this.getPrimaryActionValue(right.entry?.values || {});

            if (leftAction === rightAction) {
                return 0;
            }

            if (leftAction === 'READ') {
                return 1;
            }

            if (rightAction === 'READ') {
                return -1;
            }

            return 0;
        });
    }

    private flattenValues(value: any, prefix = ''): Array<{ key: string; value: string }> {
        if (value === null || value === undefined) {
            return [];
        }

        if (typeof value !== 'object') {
            return [{ key: prefix || 'value', value: String(value) }];
        }

        if (Array.isArray(value)) {
            return value.flatMap((item, index) => this.flattenValues(item, prefix ? `${prefix}[${index}]` : `[${index}]`));
        }

        return Object.entries(value).flatMap(([key, child]) => this.flattenValues(child, prefix ? `${prefix}.${key}` : key));
    }

    private resolveAction(values: any, flattened: Array<{ key: string; value: string }>): string {
        const directAction = this.extractActionValue(values, flattened);

        if (directAction) {
            return this.mapTransactionAction(String(directAction));
        }
        return 'Read';
    }

    private resolveDetails(values: any, flattened: Array<{ key: string; value: string }>): string {
        const directDetails = [
            values?.['/alfresco-access/transaction/sub-actions'],
            values?.['/alfresco-access/transaction/type'],
            values?.['/alfresco-access/node/type'],
            values?.['/alfresco-access/properties']
        ]
            .filter(Boolean)
            .map((value) => this.humanize(String(value)));

        if (directDetails.length > 0) {
            return directDetails.join(' | ');
        }

        const filtered = flattened.filter(({ value }) => !!value && value.length < 120);
        const selected = filtered
            .filter(({ key }) => !/(createdAt|createdBy|id)$/i.test(key))
            .filter(({ key }) => key !== '/alfresco-access/transaction/action')
            .slice(0, 4)
            .map(({ key, value }) => `${this.humanizeKey(key)}: ${value}`);

        if (selected.length > 0) {
            return selected.join(' | ');
        }

        return 'No additional details available.';
    }

    private mapTransactionAction(action: string): string {
        const normalized = action.trim().toUpperCase().replace(/[\s._-]+/g, ' ');

        if (/(UPDATE|EDIT).*(PROPERTY|PROPERTIES|METADATA)/.test(normalized)) {
            return 'Edit Properties';
        }

        if (normalized === 'READ') {
            return 'Read';
        }

        if (normalized === 'CREATE') {
            return 'Create';
        }

        if (normalized === 'DELETE') {
            return 'Delete';
        }

        if (normalized === 'UPDATE') {
            return 'Edit Properties';
        }

        if (normalized === 'UPDATE NODE PROPERTIES' || normalized === 'EDIT PROPERTY' || normalized === 'EDIT PROPERTIES') {
            return 'Edit Properties';
        }

        if (normalized === 'MOVE') {
            return 'Move';
        }

        if (normalized === 'COPY') {
            return 'Copy';
        }

        if (normalized === 'DOWNLOAD') {
            return 'Download';
        }

        return this.humanize(action);
    }

    private getPrimaryActionValue(values: any): string {
        return String(
            values?.['/alfresco-access/transaction/action'] ||
            values?.['transaction/action'] ||
            values?.action ||
            values?.event ||
            ''
        )
            .trim()
            .toUpperCase();
    }

    private extractActionValue(values: any, flattened?: Array<{ key: string; value: string }>): string {
        const primary = this.getPrimaryActionValue(values);
        if (primary) {
            return primary;
        }

        const flattenedValues = flattened || this.flattenValues(values || {});
        return String(
            flattenedValues.find(({ key }) => key === '/alfresco-access/transaction/action')?.value ||
            flattenedValues.find(({ key, value }) => /(^|\/|\.)(transaction\/action|action|event|operation|verb)$/i.test(key) && !!value)?.value ||
            ''
        )
            .trim()
            .toUpperCase();
    }

    private humanize(value: string): string {
        return value
            .replace(/^[/.]+/g, '')
            .replace(/[._-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, (match) => match.toUpperCase());
    }

    private humanizeKey(key: string): string {
        const segments = key.split('.');
        return this.humanize(segments[segments.length - 1] || key);
    }
}
