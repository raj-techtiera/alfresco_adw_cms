import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartDataset, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { AppService } from '@alfresco/aca-shared';
import { NotificationService, UserPreferenceValues, UserPreferencesService } from '@alfresco/adf-core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ReportsService, ReportsDocumentRow, ReportsTransmittalCounts, ReportsTableFilterKey, ReportsTransmittalFilterKey } from './reports.service';
import { VendorDocumentDetailsDialogComponent } from '../vendor-document-details-dialog/vendor-document-details-dialog.component';
import { AlfrescoService } from '../../alfresco.service';

export interface ReportsSummaryCard {
    label: string;
    count: number;
    subtext: string;
    icon: string;
    variant: 'total' | 'draft' | 'review' | 'approved';
    filterKey: ReportsTableFilterKey;
}

@Component({
    selector: 'adw-reports',
    standalone: true,
    providers: [provideNativeDateAdapter()],
    imports: [
        CommonModule,
        FormsModule,
        BaseChartDirective,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatFormFieldModule,
        MatInputModule,
        MatDatepickerModule,
        MatPaginatorModule
    ],
    templateUrl: './reports.component.html',
    styleUrl: './reports.component.scss'
})
export class ReportsComponent implements OnInit {
    @ViewChild('documentTypeChart') documentTypeChart?: BaseChartDirective;
    @ViewChild('statusChart') statusChart?: BaseChartDirective;

    private readonly appService = inject(AppService);
    private readonly userPreferences = inject(UserPreferencesService);
    private readonly reportsService = inject(ReportsService);
    private readonly notification = inject(NotificationService);
    private readonly dialog = inject(MatDialog);
    private readonly alfrescoService = inject(AlfrescoService);
    private readonly destroyRef = inject(DestroyRef);

    isSidenavExpanded = true;
    selectedDate = new Date();
    loading = false;
    tableLoading = false;
    loadError: string | null = null;
    loadWarning: string | null = null;
    activeTableFilter: ReportsTableFilterKey = 'total';

    readonly documentTypeFilterKeys: ReportsTableFilterKey[] = ['engineering', 'vdr'];

    private readonly outgoingTransmittalFilters: ReportsTransmittalFilterKey[] = [
        'outgoingDraft',
        'outgoingIssued',
        'outgoingAll'
    ];

    private readonly incomingTransmittalFilters: ReportsTransmittalFilterKey[] = [
        'incomingDraft',
        'incomingApproved',
        'incomingAll'
    ];

    summaryCards: ReportsSummaryCard[] = this.buildSummaryCards(0, 0, 0, 0);
    transmittals: ReportsTransmittalCounts = {
        outgoing: { draft: 0, issued: 0 },
        incoming: { draft: 0, approved: 0 }
    };
    documents: ReportsDocumentRow[] = [];

    documentTypeLabels = ['Engineering Document', 'VDR Document'];
    documentTypeDatasets: ChartDataset<'doughnut'>[] = [
        { data: [0, 0], backgroundColor: ['#4496F4', '#22C55E'], borderWidth: 0, hoverOffset: 4 }
    ];

    statusLabels = ['Draft', 'Under Review', 'Approved'];
    statusDatasets: ChartDataset<'doughnut'>[] = [
        { data: [0, 0, 0], backgroundColor: ['#9333EA', '#F97316', '#22C55E'], borderWidth: 0, hoverOffset: 4 }
    ];

    chartLegend = false;
    documentTypeChartOptions: ChartOptions<'doughnut'> = this.buildDonutOptions(0);
    statusChartOptions: ChartOptions<'doughnut'> = this.buildDonutOptions(0);

    pageIndex = 0;
    pageSize = 5;
    readonly pageSizeOptions = [5, 10, 25];

    ngOnInit(): void {
        this.userPreferences
            .select<boolean>(UserPreferenceValues.ExpandedSideNavStatus)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((expanded) => {
                this.isSidenavExpanded = expanded ?? true;
            });

        void this.loadDashboard();
    }

    get paginatedDocuments(): ReportsDocumentRow[] {
        const start = this.pageIndex * this.pageSize;
        return this.documents.slice(start, start + this.pageSize);
    }

    get totalDocumentCount(): number {
        return this.summaryCards.find((c) => c.variant === 'total')?.count ?? 0;
    }

    get documentTypeChartTotal(): number {
        const data = this.documentTypeDatasets[0]?.data ?? [];
        return data.reduce((sum, value) => sum + Number(value ?? 0), 0);
    }

    get statusChartTotal(): number {
        const data = this.statusDatasets[0]?.data ?? [];
        return data.reduce((sum, value) => sum + Number(value ?? 0), 0);
    }

    get hasDashboardData(): boolean {
        return this.totalDocumentCount > 0 || this.documents.length > 0;
    }

    get selectedDateLabel(): string {
        return formatDate(this.selectedDate, 'd MMM y', 'en');
    }

    get transmittalTableColumns(): Array<'outgoing' | 'incoming'> {
        if (this.outgoingTransmittalFilters.includes(this.activeTableFilter as ReportsTransmittalFilterKey)) {
            return ['outgoing'];
        }
        if (this.incomingTransmittalFilters.includes(this.activeTableFilter as ReportsTransmittalFilterKey)) {
            return ['incoming'];
        }
        if (this.activeTableFilter === 'transmittalsAll') {
            return ['outgoing', 'incoming'];
        }
        return [];
    }

    get documentsFilterLabel(): string {
        switch (this.activeTableFilter) {
            case 'draft':
                return 'Draft documents';
            case 'underReview':
                return 'Under review documents';
            case 'approved':
                return 'Approved documents';
            case 'engineering':
                return 'Engineering documents';
            case 'vdr':
                return 'VDR documents';
            case 'outgoingDraft':
                return 'Outgoing transmittals — Draft';
            case 'outgoingIssued':
                return 'Outgoing transmittals — Issued';
            case 'incomingDraft':
                return 'Incoming transmittals — Draft';
            case 'incomingApproved':
                return 'Incoming transmittals — Approved';
            case 'outgoingAll':
                return 'All outgoing transmittals';
            case 'incomingAll':
                return 'All incoming transmittals';
            case 'transmittalsAll':
                return 'All transmittals';
            default:
                return 'All documents';
        }
    }

    isSummaryCardActive(card: ReportsSummaryCard): boolean {
        return this.activeTableFilter === card.filterKey;
    }

    isDocumentTypeFilterActive(index: number): boolean {
        return this.activeTableFilter === this.documentTypeFilterKeys[index];
    }

    onSummaryCardClick(card: ReportsSummaryCard): void {
        void this.applyTableFilter(card.filterKey);
    }

    onDocumentTypeFilterClick(index: number): void {
        void this.applyTableFilter(this.documentTypeFilterKeys[index]);
    }

    onTransmittalFilterClick(filter: ReportsTransmittalFilterKey): void {
        void this.applyTableFilter(filter);
    }

    isTransmittalStatActive(filter: ReportsTransmittalFilterKey): boolean {
        return this.activeTableFilter === filter;
    }

    openSidenav(): void {
        this.appService.setAppNavbarMode('expanded');
        this.appService.appNavNarMode$.next('expanded');
        this.appService.toggleAppNavBar$.next();
        this.userPreferences.set(UserPreferenceValues.ExpandedSideNavStatus, true);
    }

    refresh(): void {
        this.activeTableFilter = 'total';
        void this.loadDashboard();
    }

    onPageChange(event: PageEvent): void {
        this.pageIndex = event.pageIndex;
        this.pageSize = event.pageSize;
    }

    statusClass(status: ReportsDocumentRow['status']): string {
        switch (status) {
            case 'Approved':
                return 'adw-reports-status-badge--approved';
            case 'Under Review':
                return 'adw-reports-status-badge--review';
            default:
                return 'adw-reports-status-badge--draft';
        }
    }

    fileIconClass(icon: string): string {
        return `adw-reports-file-icon--${icon.replace(/[^a-z0-9_-]/gi, '-')}`;
    }

    transmittalColumnLabel(column: 'outgoing' | 'incoming'): string {
        return column === 'outgoing' ? 'Outgoing Transmittals' : 'Incoming Transmittals';
    }

    transmittalStatusValue(column: 'outgoing' | 'incoming', row: ReportsDocumentRow): string {
        return column === 'outgoing' ? row.outgoingTransmittalStatus : row.incomingTransmittalStatus;
    }

    transmittalStatusClass(column: 'outgoing' | 'incoming', row: ReportsDocumentRow): string {
        const value = this.transmittalStatusValue(column, row).toLowerCase();
        if (value === 'issued' || value === 'approved') {
            return 'adw-reports-status-badge--approved';
        }
        if (value === 'draft') {
            return 'adw-reports-status-badge--draft';
        }
        return 'adw-reports-status-badge--review';
    }

    percentOfTotal(value: number, total: number): string {
        if (total <= 0) {
            return '0.00%';
        }
        return `${((value / total) * 100).toFixed(2)}%`;
    }

    openDocument(row: ReportsDocumentRow): void {
        const id = (row.nodeId ?? '').trim();
        if (!id) {
            this.notification.openSnackMessage('Document id is not available for preview.');
            return;
        }
        this.dialog.open(VendorDocumentDetailsDialogComponent, {
            data: { nodeId: id },
            width: 'min(1240px, calc(100vw - 48px))',
            maxWidth: '98vw',
            maxHeight: '92vh',
            autoFocus: 'dialog',
            panelClass: 'adw-vendor-document-details-dialog-panel'
        });
    }

    downloadDocument(row: ReportsDocumentRow): void {
        const id = (row.nodeId ?? '').trim();
        if (!id) {
            this.notification.openSnackMessage('Document id is not available for download.');
            return;
        }
        const fileName = (row.fileName ?? row.title ?? 'document').trim() || 'document';
        this.alfrescoService.getNodeContent(id).subscribe({
            next: (blob) => this.saveBlobAsFile(blob, fileName),
            error: () => this.notification.openSnackMessage('Unable to download document.')
        });
    }

    private saveBlobAsFile(blob: Blob, fileName: string): void {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.rel = 'noopener';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    }

    private async loadDashboard(): Promise<void> {
        this.loading = true;
        this.loadError = null;
        this.loadWarning = null;
        try {
            const result = await this.reportsService.loadDashboard();
            const data = result.data;
            this.summaryCards = this.buildSummaryCards(data.total, data.draft, data.underReview, data.approved);
            this.transmittals = data.transmittals;
            this.documents = data.documents;
            this.activeTableFilter = 'total';
            this.pageIndex = 0;

            this.documentTypeDatasets = [
                {
                    data: [data.engineeringDocs, data.vdrDocs],
                    backgroundColor: ['#4496F4', '#22C55E'],
                    borderWidth: 0,
                    hoverOffset: 4
                }
            ];
            this.statusDatasets = [
                {
                    data: [data.draft, data.underReview, data.approved],
                    backgroundColor: ['#9333EA', '#F97316', '#22C55E'],
                    borderWidth: 0,
                    hoverOffset: 4
                }
            ];
            const documentTypeTotal = data.engineeringDocs + data.vdrDocs;
            const statusTotal = data.draft + data.underReview + data.approved;
            this.documentTypeChartOptions = this.buildDonutOptions(documentTypeTotal);
            this.statusChartOptions = this.buildDonutOptions(statusTotal);

            if (result.partialFailure) {
                this.loadWarning = 'Some report data could not be loaded. Showing available results.';
            }

            this.documentTypeChart?.update();
            this.statusChart?.update();
        } catch {
            this.loadError = 'Unable to load reports dashboard data.';
            if (!this.hasDashboardData) {
                this.notification.openSnackMessage(this.loadError);
            }
        } finally {
            this.loading = false;
        }
    }

    async applyTableFilter(filter: ReportsTableFilterKey): Promise<void> {
        if (this.tableLoading) {
            return;
        }

        this.activeTableFilter = filter;
        this.tableLoading = true;
        this.pageIndex = 0;

        try {
            this.documents = await this.reportsService.loadDocumentsByFilter(filter);
        } catch {
            this.documents = [];
            this.notification.openSnackMessage('Unable to load documents for the selected filter.');
        } finally {
            this.tableLoading = false;
        }
    }

    private buildSummaryCards(total: number, draft: number, underReview: number, approved: number): ReportsSummaryCard[] {
        return [
            {
                label: 'Total Documents',
                count: total,
                subtext: 'All Documents',
                icon: 'description',
                variant: 'total',
                filterKey: 'total'
            },
            {
                label: 'Draft',
                count: draft,
                subtext: `${this.percentOfTotal(draft, total)} of total`,
                icon: 'edit_note',
                variant: 'draft',
                filterKey: 'draft'
            },
            {
                label: 'Under Review',
                count: underReview,
                subtext: `${this.percentOfTotal(underReview, total)} of total`,
                icon: 'rate_review',
                variant: 'review',
                filterKey: 'underReview'
            },
            {
                label: 'Approved',
                count: approved,
                subtext: `${this.percentOfTotal(approved, total)} of total`,
                icon: 'check_circle',
                variant: 'approved',
                filterKey: 'approved'
            }
        ];
    }

    private buildDonutOptions(total: number): ChartOptions<'doughnut'> {
        return {
            cutout: '72%',
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 0 },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const value = Number(ctx.raw ?? 0);
                            return `${ctx.label}: ${value} (${this.percentOfTotal(value, total)})`;
                        }
                    }
                }
            }
        };
    }
}
