import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthenticationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';

export interface ReportsDocumentRow {
    nodeId: string;
    fileName: string;
    title: string;
    documentType: string;
    status: 'Approved' | 'Under Review' | 'Draft';
    outgoingTransmittalStatus: string;
    incomingTransmittalStatus: string;
    securityLevel: string;
    createdDate: string;
    createdBy: string;
    fileIcon: string;
}

export interface ReportsTransmittalCounts {
    outgoing: { draft: number; issued: number };
    incoming: { draft: number; approved: number };
}

export interface ReportsDashboardData {
    total: number;
    approved: number;
    underReview: number;
    draft: number;
    engineeringDocs: number;
    vdrDocs: number;
    transmittals: ReportsTransmittalCounts;
    documents: ReportsDocumentRow[];
}

export interface ReportsDashboardLoadResult {
    data: ReportsDashboardData;
    partialFailure: boolean;
}

interface AlfrescoSearchResponse {
    list?: {
        pagination?: { count?: number; totalItems?: number };
        entries?: Array<{ entry?: Record<string, unknown> }>;
    };
}

/** Alfresco public search queries from Reports API integration spec. */
export type ReportsDocumentTypeFilterKey = 'total' | 'approved' | 'underReview' | 'draft' | 'engineering' | 'vdr';

export type ReportsTransmittalFilterKey =
    | 'outgoingDraft'
    | 'outgoingIssued'
    | 'incomingDraft'
    | 'incomingApproved'
    | 'outgoingAll'
    | 'incomingAll'
    | 'transmittalsAll';

export type ReportsTableFilterKey = ReportsDocumentTypeFilterKey | ReportsTransmittalFilterKey;

export const REPORTS_DOCUMENT_FILTER_QUERIES: Record<ReportsDocumentTypeFilterKey, string> = {
    total: "TYPE:'edms:vdrDocument' OR TYPE:'edms:engineeringDoc'",
    approved:
        "(TYPE:'edms:engineeringDoc' AND =edms:status:'approved') OR (TYPE:'edms:vdrDocument' AND =edms:vdr_document_status:'approved')",
    underReview:
        "(TYPE:'edms:engineeringDoc' AND =edms:status:'under review') OR (TYPE:'edms:vdrDocument' AND =edms:vdr_document_status:'under review')",
    draft:
        "(TYPE:'edms:engineeringDoc' AND =edms:status:'Draft') OR (TYPE:'edms:vdrDocument' AND =edms:vdr_document_status:'Draft')",
    engineering: "TYPE:'edms:engineeringDoc'",
    vdr: "TYPE:'edms:vdrDocument'"
};

export const REPORTS_TRANSMITTAL_FILTER_QUERIES: Record<ReportsTransmittalFilterKey, string> = {
    outgoingDraft: "TYPE:'edms:engineeringDoc' AND =edms:outgoing_transmittal_status:'Draft'",
    outgoingIssued: "TYPE:'edms:engineeringDoc' AND =edms:outgoing_transmittal_status:'Issued'",
    incomingDraft: "TYPE:'edms:engineeringDoc' AND =edms:incoming_transmittal_status:'Draft'",
    incomingApproved: "TYPE:'edms:engineeringDoc' AND =edms:incoming_transmittal_status:'approved'",
    outgoingAll:
        "TYPE:'edms:engineeringDoc' AND (=edms:outgoing_transmittal_status:'Draft' OR =edms:outgoing_transmittal_status:'Issued')",
    incomingAll:
        "TYPE:'edms:engineeringDoc' AND (=edms:incoming_transmittal_status:'Draft' OR =edms:incoming_transmittal_status:'approved')",
    transmittalsAll:
        "TYPE:'edms:engineeringDoc' AND (=edms:outgoing_transmittal_status:'Draft' OR =edms:outgoing_transmittal_status:'Issued' OR =edms:incoming_transmittal_status:'Draft' OR =edms:incoming_transmittal_status:'approved')"
};

/** @deprecated Use REPORTS_DOCUMENT_FILTER_QUERIES */
export const REPORTS_TABLE_FILTER_QUERIES = REPORTS_DOCUMENT_FILTER_QUERIES;

const REPORTS_FILTER_QUERIES: Record<ReportsTableFilterKey, string> = {
    ...REPORTS_DOCUMENT_FILTER_QUERIES,
    ...REPORTS_TRANSMITTAL_FILTER_QUERIES
};

const SEARCH_QUERIES = {
    outgoingDraft: REPORTS_TRANSMITTAL_FILTER_QUERIES.outgoingDraft,
    outgoingIssued: REPORTS_TRANSMITTAL_FILTER_QUERIES.outgoingIssued,
    incomingDraft: REPORTS_TRANSMITTAL_FILTER_QUERIES.incomingDraft,
    incomingApproved: REPORTS_TRANSMITTAL_FILTER_QUERIES.incomingApproved,
    ...REPORTS_DOCUMENT_FILTER_QUERIES
} as const;

@Injectable({ providedIn: 'root' })
export class ReportsService {
    private readonly http = inject(HttpClient);
    private readonly authService = inject(AuthenticationService);
    private readonly searchUrl = '/alfresco/api/-default-/public/search/versions/1/search';

    async loadDashboard(): Promise<ReportsDashboardLoadResult> {
        const results = await Promise.allSettled([
            this.searchCount(SEARCH_QUERIES.total),
            this.searchCount(SEARCH_QUERIES.approved),
            this.searchCount(SEARCH_QUERIES.underReview),
            this.searchCount(SEARCH_QUERIES.draft),
            this.searchCount(SEARCH_QUERIES.engineering),
            this.searchCount(SEARCH_QUERIES.vdr),
            this.searchCount(SEARCH_QUERIES.outgoingDraft),
            this.searchCount(SEARCH_QUERIES.outgoingIssued),
            this.searchCount(SEARCH_QUERIES.incomingDraft),
            this.searchCount(SEARCH_QUERIES.incomingApproved),
            this.searchDocuments(SEARCH_QUERIES.total)
        ]);

        const partialFailure = results.some((result) => result.status === 'rejected');
        const countAt = (index: number): number => {
            const result = results[index];
            return result.status === 'fulfilled' && typeof result.value === 'number' ? result.value : 0;
        };
        const documentsAt = (index: number): ReportsDocumentRow[] => {
            const result = results[index];
            return result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : [];
        };

        const data: ReportsDashboardData = {
            total: countAt(0),
            approved: countAt(1),
            underReview: countAt(2),
            draft: countAt(3),
            engineeringDocs: countAt(4),
            vdrDocs: countAt(5),
            transmittals: {
                outgoing: { draft: countAt(6), issued: countAt(7) },
                incoming: { draft: countAt(8), approved: countAt(9) }
            },
            documents: documentsAt(10)
        };

        if (results[0].status === 'rejected' && results[10].status === 'rejected') {
            throw new Error('Reports dashboard unavailable');
        }

        return { data, partialFailure };
    }

    loadDocumentsByFilter(filter: ReportsTableFilterKey): Promise<ReportsDocumentRow[]> {
        return this.searchDocuments(REPORTS_FILTER_QUERIES[filter]);
    }

    private async searchCount(query: string): Promise<number> {
        const body = {
            query: { query },
            paging: { maxItems: 100, skipCount: 0 }
        };

        const response = await this.postSearch(body);
        return this.extractTotalCount(response);
    }

    private async searchDocuments(query: string): Promise<ReportsDocumentRow[]> {
        const body = {
            query: { query },
            paging: { maxItems: 100, skipCount: 0 },
            include: ['properties', 'path', 'allowableOperations']
        };

        const response = await this.postSearch(body);
        const entries = response?.list?.entries ?? [];
        return entries.map((row) => this.mapEntryToDocumentRow(row?.entry));
    }

    private async postSearch(body: unknown): Promise<AlfrescoSearchResponse> {
        const options = await this.buildAuthOptions(this.searchUrl);
        return firstValueFrom(this.http.post<AlfrescoSearchResponse>(this.searchUrl, body, options));
    }

    private extractTotalCount(response: AlfrescoSearchResponse): number {
        const pagination = response?.list?.pagination;
        if (typeof pagination?.totalItems === 'number' && pagination.totalItems >= 0) {
            return pagination.totalItems;
        }
        if (typeof pagination?.count === 'number' && pagination.count >= 0) {
            return pagination.count;
        }
        return response?.list?.entries?.length ?? 0;
    }

    private mapEntryToDocumentRow(entry: Record<string, unknown> | undefined): ReportsDocumentRow {
        const properties = (entry?.['properties'] as Record<string, unknown> | undefined) ?? {};
        const nodeType = String(entry?.['nodeType'] ?? '');
        const isVdr = nodeType.includes('vdrDocument');
        const isEngineering = nodeType.includes('engineeringDoc');

        const title = this.firstNonEmpty(
            properties['cm:title'],
            properties['edms:documenttitle'],
            entry?.['name']
        );

        const rawStatus = isVdr
            ? this.firstNonEmpty(properties['edms:vdr_document_status'], properties['edms:vdrDocumentStatus'])
            : this.firstNonEmpty(properties['edms:status'], properties['edms:document_status']);

        const mimeType =
            typeof (entry?.['content'] as { mimeType?: string } | undefined)?.mimeType === 'string'
                ? String((entry?.['content'] as { mimeType: string }).mimeType)
                : '';

        return {
            nodeId: String(entry?.['id'] ?? ''),
            fileName: String(entry?.['name'] ?? (title || 'document')),
            title: title || '—',
            documentType: isVdr ? 'VDR Document' : isEngineering ? 'Engineering Document' : 'Document',
            status: this.normalizeStatus(rawStatus),
            outgoingTransmittalStatus: this.normalizeTransmittalStatus(
                this.firstNonEmpty(properties['edms:outgoing_transmittal_status'])
            ),
            incomingTransmittalStatus: this.normalizeTransmittalStatus(
                this.firstNonEmpty(properties['edms:incoming_transmittal_status'])
            ),
            securityLevel:
                this.firstNonEmpty(
                    properties['edms:confidentiality'],
                    properties['edms:security_classification'],
                    properties['edms:securityClassification'],
                    properties['edms:security_level'],
                    properties['edms:securityLevel']
                ) || '—',
            createdDate: this.formatCreatedDate(
                properties['cm:created'],
                entry?.['createdAt']
            ),
            createdBy:
                this.firstNonEmpty(
                    properties['cm:creator'],
                    (entry?.['createdByUser'] as { displayName?: string } | undefined)?.displayName
                ) || '—',
            fileIcon: this.iconForMime(title, mimeType)
        };
    }

    private normalizeStatus(raw: string): ReportsDocumentRow['status'] {
        const value = raw.trim().toLowerCase();
        if (value === 'approved') {
            return 'Approved';
        }
        if (value === 'under review') {
            return 'Under Review';
        }
        if (value === 'draft') {
            return 'Draft';
        }
        return 'Draft';
    }

    private normalizeTransmittalStatus(raw: string): string {
        const value = raw.trim();
        if (!value) {
            return '—';
        }
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }

    private iconForMime(title: string, mimeType: string): string {
        const mime = mimeType.toLowerCase();
        const name = title.toLowerCase();
        if (mime.includes('pdf') || name.endsWith('.pdf')) {
            return 'picture_as_pdf';
        }
        if (mime.includes('spreadsheet') || mime.includes('excel') || /\.(xlsx?|csv)$/i.test(name)) {
            return 'table_chart';
        }
        if (mime.includes('wordprocessingml') || mime.includes('msword') || /\.(docx?)$/i.test(name)) {
            return 'description';
        }
        return 'insert_drive_file';
    }

    private formatCreatedDate(...values: unknown[]): string {
        for (const raw of values) {
            if (raw == null) {
                continue;
            }
            const date = raw instanceof Date ? raw : new Date(String(raw));
            if (!Number.isNaN(date.getTime())) {
                return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            }
        }
        return '—';
    }

    private firstNonEmpty(...values: unknown[]): string {
        for (const value of values) {
            if (value != null && String(value).trim()) {
                return String(value).trim();
            }
        }
        return '';
    }

    private async buildAuthOptions(url: string): Promise<{ headers: HttpHeaders }> {
        const headers = await firstValueFrom(
            this.authService.addTokenToHeader(
                url,
                new HttpHeaders({
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                    Pragma: 'no-cache'
                })
            )
        );
        return { headers };
    }
}
