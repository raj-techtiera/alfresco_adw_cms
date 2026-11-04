import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AppService, PageLayoutComponent, PageLayoutContentComponent } from '@alfresco/aca-shared';
import { AuthenticationService, NotificationService, UserPreferenceValues, UserPreferencesService } from '@alfresco/adf-core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConstructionDocumentDetailsDialogComponent } from '../construction-document-details-dialog/construction-document-details-dialog.component';
import { ConstructionDocumentRow, ConstructionStatusKey, ConstructionStatusOption, ConstructionStatusDashboardCard } from '../../interface/compliance';

@Component({
    standalone: true,
    selector: 'adw-construction-documents',
    imports: [
        CommonModule,
        FormsModule,
        PageLayoutComponent,
        PageLayoutContentComponent,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatPaginatorModule,
        MatDialogModule
    ],
    templateUrl: './construction-documents.component.html',
    styleUrl: './construction-documents.component.scss'
})
export class ConstructionDocumentsComponent implements OnInit {
    private readonly notification = inject(NotificationService);
    private readonly authService = inject(AuthenticationService);
    private readonly http = inject(HttpClient);
    private readonly dialog = inject(MatDialog);
    private readonly appService = inject(AppService);
    private readonly userPreferences = inject(UserPreferencesService);
    private readonly destroyRef = inject(DestroyRef);

    private readonly searchUrl = '/alfresco/api/-default-/public/search/versions/1/search';

    isSidenavExpanded = true;
    tableSearch = '';
    statusFilter = '';
    rows: ConstructionDocumentRow[] = [];
    loading = false;
    loadError: string | null = null;

    readonly statusFilterOptions: ConstructionStatusOption[] = [
        { value: 'approved', label: 'Approved', aliases: ['approved'] },
        { value: 'under review', label: 'Under review', aliases: ['under review'] },
        { value: 'Draft', label: 'Draft', aliases: ['draft', 'Draft'] },
        {
            value: 'As-Built',
            label: 'As-Built',
            aliases: ['As-Built', 'as-built', 'as built', 'asbuilt']
        },
        {
            value: 'IFC',
            label: 'IFC (Issued for Construction)',
            aliases: ['IFC', 'ifc', 'Issued for Construction', 'IFC (Issued for Construction)', 'issued for construction']
        }
    ];

    dashboardCards: ConstructionStatusDashboardCard[] = [];
    dashboardLoading = false;

    readonly pageSizeOptions = [5, 10, 20];
    pageSize = 10;
    pageIndex = 0;

    readonly heroStatPlaceholderLabels = [
        'All documents',
        'Approved',
        'Under review',
        'Draft',
        'As-Built',
        'IFC (Issued for Construction)'
    ];

    get filteredRows(): ConstructionDocumentRow[] {
        const q = (this.tableSearch ?? '').trim().toLowerCase();
        return this.rows.filter((row) => this.rowMatchesStatusFilter(row) && this.rowMatchesSearch(row, q));
    }

    get paginatedRows(): ConstructionDocumentRow[] {
        const start = this.pageIndex * this.pageSize;
        return this.filteredRows.slice(start, start + this.pageSize);
    }

    get dashboardStripPrimary(): ConstructionStatusDashboardCard[] {
        return this.dashboardCards;
    }

    ngOnInit(): void {
        this.userPreferences
            .select<boolean>(UserPreferenceValues.ExpandedSideNavStatus)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((expanded) => {
                this.isSidenavExpanded = expanded ?? true;
            });

        void this.loadDocuments();
    }

    openSidenav(): void {
        this.appService.setAppNavbarMode('expanded');
        this.appService.appNavNarMode$.next('expanded');
        this.appService.toggleAppNavBar$.next();
        this.userPreferences.set(UserPreferenceValues.ExpandedSideNavStatus, true);
    }

    onPageChange(event: PageEvent): void {
        this.pageSize = event.pageSize;
        this.pageIndex = event.pageIndex;
    }

    onTableSearchChange(): void {
        this.pageIndex = 0;
    }

    onStatusFilterChange(): void {
        this.pageIndex = 0;
    }

    isDashboardCardActive(card: ConstructionStatusDashboardCard): boolean {
        if (card.id === 'total') {
            return this.statusFilter === '';
        }
        if (!card.selectable) {
            return false;
        }
        return this.statusFilter === card.filterValue;
    }

    onDashboardCardClick(card: ConstructionStatusDashboardCard): void {
        if (!card.selectable) {
            return;
        }
        this.statusFilter = card.filterValue;
        this.pageIndex = 0;
    }

    dashboardTrendDirection(card: ConstructionStatusDashboardCard): 'up' | 'down' | 'neutral' {
        if (card.id === 'st-under-review') {
            return 'down';
        }
        if (card.id === 'st-draft') {
            return 'neutral';
        }
        return 'up';
    }

    dashboardTrendIcon(card: ConstructionStatusDashboardCard): string {
        const d = this.dashboardTrendDirection(card);
        if (d === 'down') {
            return 'arrow_downward';
        }
        if (d === 'neutral') {
            return 'remove';
        }
        return 'arrow_upward';
    }

    openDocumentDetails(row: ConstructionDocumentRow): void {
        const id = (row.nodeId ?? '').trim();
        if (!id) {
            this.notification.openSnackMessage('Document id is not available for details.');
            return;
        }
        this.dialog.open(ConstructionDocumentDetailsDialogComponent, {
            data: { nodeId: id },
            width: 'min(1240px, calc(100vw - 48px))',
            maxWidth: '98vw',
            maxHeight: '92vh',
            autoFocus: 'dialog',
            panelClass: 'adw-vendor-document-details-dialog-panel'
        });
    }

    iconForDoc(row: ConstructionDocumentRow): string {
        const mime = (row?.mimeType || '').toLowerCase();
        const title = (row?.title || '').toLowerCase();
        if (mime.includes('pdf') || title.endsWith('.pdf')) {
            return 'picture_as_pdf';
        }
        if (mime.includes('spreadsheet') || mime.includes('excel') || /\.(xlsx?|csv)$/i.test(title)) {
            return 'table_chart';
        }
        if (mime.includes('wordprocessingml') || mime.includes('msword') || /\.(docx?)$/i.test(title)) {
            return 'description';
        }
        if (mime.startsWith('image/') || /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(title)) {
            return 'image';
        }
        return 'insert_drive_file';
    }

    normalizedStatus(status: string): ConstructionStatusKey {
        const s = (status || '').trim().toLowerCase();
        if (s === 'approved') {
            return 'approved';
        }
        if (s === 'under review') {
            return 'under-review';
        }
        if (s === 'draft') {
            return 'draft';
        }
        if (s === 'as-built' || s === 'as built' || s === 'asbuilt') {
            return 'as-built';
        }
        if (s === 'ifc' || s === 'issued for construction' || s === 'ifc (issued for construction)') {
            return 'ifc';
        }
        return 'other';
    }

    statusIcon(status: string): string {
        const key = this.normalizedStatus(status);
        if (key === 'approved') {
            return 'check_circle';
        }
        if (key === 'under-review') {
            return 'hourglass_top';
        }
        if (key === 'draft') {
            return 'edit_note';
        }
        if (key === 'as-built') {
            return 'build_circle';
        }
        if (key === 'ifc') {
            return 'architecture';
        }
        return 'info';
    }

    statusLabel(status: string): string {
        const key = this.normalizedStatus(status);
        if (key === 'under-review') {
            return 'Under Review';
        }
        if (key === 'approved') {
            return 'Approved';
        }
        if (key === 'draft') {
            return 'Draft';
        }
        if (key === 'as-built') {
            return 'As-Built';
        }
        if (key === 'ifc') {
            return 'IFC (Issued for Construction)';
        }
        return (status || 'Unknown').trim() || 'Unknown';
    }

    private rowMatchesStatusFilter(row: ConstructionDocumentRow): boolean {
        const selected = (this.statusFilter ?? '').trim();
        if (!selected) {
            return true;
        }
        return this.normalizedStatus(row.documentStatus) === this.normalizedStatus(selected);
    }

    private rowMatchesSearch(row: ConstructionDocumentRow, q: string): boolean {
        if (!q) {
            return true;
        }
        const hay = [
            row.title,
            row.project,
            row.poNumber,
            row.vdrLineItemId,
            row.documentStatus,
            this.statusLabel(row.documentStatus),
            row.nodeId
        ]
            .join(' ')
            .toLowerCase();
        return hay.includes(q);
    }

    private buildBaseQuery(): string {
        return `TYPE:'edms:engineeringDoc' AND =edms:is_construction_document:true`;
    }

    private async loadDocuments(): Promise<void> {
        this.loading = true;
        this.dashboardLoading = true;
        this.loadError = null;
        try {
            const body = {
                query: { query: this.buildBaseQuery() },
                include: ['properties'],
                paging: { maxItems: 500 },
                sort: [{ type: 'FIELD', field: 'cm:created', ascending: false }]
            };
            const response: any = await firstValueFrom(
                this.http.post(this.searchUrl, body, await this.buildAuthOptions(this.searchUrl))
            );
            const entries = response?.list?.entries ?? [];
            this.rows = entries.map((row: any) => this.mapSearchEntry(row?.entry));
            this.pageIndex = 0;
            this.refreshDashboardFromRows();
        } catch {
            this.rows = [];
            this.pageIndex = 0;
            this.dashboardCards = [];
            this.loadError = 'Unable to load construction documents.';
        } finally {
            this.loading = false;
            this.dashboardLoading = false;
        }
    }

    private refreshDashboardFromRows(): void {
        const byKey = new Map<string, number>();
        for (const r of this.rows) {
            const key = (r.documentStatus || '—').trim().toLowerCase();
            byKey.set(key, (byKey.get(key) ?? 0) + 1);
        }
        this.dashboardCards = this.composeDashboardCards(byKey, this.rows.length);
    }

    private composeDashboardCards(byKey: Map<string, number>, totalRows: number): ConstructionStatusDashboardCard[] {
        const known = new Set(
            this.statusFilterOptions.flatMap((o) => o.aliases.map((a) => a.toLowerCase()))
        );
        const cards: ConstructionStatusDashboardCard[] = [
            {
                id: 'total',
                label: 'All documents',
                count: totalRows,
                filterValue: '',
                icon: 'folder_open',
                variant: 'total',
                selectable: true
            }
        ];
        for (const opt of this.statusFilterOptions) {
            const key = opt.value.toLowerCase();
            cards.push({
                id: `st-${key.replace(/\s+/g, '-')}`,
                label: opt.label,
                count: this.countForAliases(byKey, opt.aliases),
                filterValue: opt.value,
                icon: this.dashboardIconForFilterValue(opt.value),
                variant: this.dashboardVariantForFilterValue(opt.value),
                selectable: true
            });
        }
        let other = 0;
        byKey.forEach((n, key) => {
            if (key === '—' || key === '-') {
                return;
            }
            if (!known.has(key)) {
                other += n;
            }
        });
        if (other > 0) {
            cards.push({
                id: 'other',
                label: 'Other statuses',
                count: other,
                filterValue: '',
                icon: 'category',
                variant: 'other',
                selectable: false
            });
        }
        return cards;
    }

    private countForAliases(byKey: Map<string, number>, aliases: string[]): number {
        let n = 0;
        const seen = new Set<string>();
        for (const alias of aliases) {
            const key = alias.toLowerCase();
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            n += byKey.get(key) ?? 0;
        }
        return n;
    }

    private dashboardVariantForFilterValue(value: string): ConstructionStatusDashboardCard['variant'] {
        const key = this.normalizedStatus(value);
        if (key === 'approved') {
            return 'approved';
        }
        if (key === 'under-review') {
            return 'review';
        }
        if (key === 'draft') {
            return 'draft';
        }
        if (key === 'as-built') {
            return 'as-built';
        }
        if (key === 'ifc') {
            return 'ifc';
        }
        return 'other';
    }

    private dashboardIconForFilterValue(value: string): string {
        return this.statusIcon(value);
    }

    private mapSearchEntry(entry: any): ConstructionDocumentRow {
        const p = entry?.properties ?? {};
        const title =
            p['cm:title'] != null && String(p['cm:title']).trim()
                ? String(p['cm:title']).trim()
                : entry?.name != null
                  ? String(entry.name).trim()
                  : '—';
        const project = this.strProp(p, [
            'edms:vdr_project',
            'edms:vdrProject',
            'edms:project_name',
            'edms:projectName',
            'edms:project_ref',
            'edms:projectRef',
            'edms:engineeringProject'
        ]);
        const poNumber = this.strProp(p, ['edms:vdr_po_number', 'edms:vdrPoNumber', 'edms:po_number', 'edms:poNumber']);
        const vdrLineItemId = this.strProp(p, [
            'edms:vdr_line_item_id',
            'edms:vdrLineItemId',
            'edms:document_number',
            'edms:documentNumber',
            'edms:doc_number'
        ]);
        const documentStatus = this.strProp(p, [
            'edms:vdr_document_status',
            'edms:vdrDocumentStatus',
            'edms:document_status',
            'edms:documentStatus',
            'edms:vdr_status',
            'edms:status'
        ]);
        const mimeType = typeof entry?.content?.mimeType === 'string' ? String(entry.content.mimeType).trim() : '';

        return {
            nodeId: this.extractSearchResultNodeId(entry),
            title,
            project: project || '—',
            poNumber: poNumber || '—',
            vdrLineItemId: vdrLineItemId || '—',
            documentStatus: documentStatus || '—',
            mimeType
        };
    }

    private extractSearchResultNodeId(entry: any): string {
        if (!entry) {
            return '';
        }
        const p = entry.properties ?? {};
        const candidates = [entry.id, entry.guid, p['edms:document_id'], p['cmis:objectId']];
        for (const c of candidates) {
            const u = this.extractUuidFromAlfrescoRef(c);
            if (u) {
                return u;
            }
        }
        return entry.id != null && String(entry.id).trim() ? String(entry.id).trim() : '';
    }

    private extractUuidFromAlfrescoRef(raw: unknown): string {
        if (raw == null) {
            return '';
        }
        const s = String(raw).trim();
        if (!s) {
            return '';
        }
        const m = s.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        return m ? m[1] : '';
    }

    private strProp(properties: Record<string, unknown>, keys: string[]): string {
        for (const key of keys) {
            const v = properties[key];
            if (v != null && String(v).trim()) {
                return String(v).trim();
            }
        }
        return '';
    }

    private async buildAuthOptions(url: string): Promise<{ headers: HttpHeaders }> {
        const headers = await firstValueFrom(
            this.authService.addTokenToHeader(
                url,
                new HttpHeaders({
                    'Cache-Control': 'no-store',
                    Pragma: 'no-cache'
                })
            )
        );
        return { headers };
    }
}
