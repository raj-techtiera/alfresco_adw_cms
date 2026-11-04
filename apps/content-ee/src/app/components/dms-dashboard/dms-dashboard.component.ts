import { CommonModule, formatPercent } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartDataset, ChartOptions } from 'chart.js';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LinearScale,
  Tooltip
} from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { NotificationService } from '@alfresco/adf-core';
import { DmsDashboardFilters, DmsDashboardRow, DmsDonutChart } from '../../interface/dms';
import { MdrKpiCard } from '../../interface/programPortfolio';
import { DmsDocumentDetailsDialogComponent } from './dms-document-details-dialog/dms-document-details-dialog.component';
import { DmsDashboardService } from './dms-dashboard.service';

const STATUS_COLORS: Record<string, string> = {
  Draft: '#64748B',
  'Under Review': '#F97316',
  'Need Correction': '#E11D48',
  Approved: '#22C55E'
};

const STATUS_CLASS: Record<string, string> = {
  draft: 'mdr-status--draft',
  'under review': 'mdr-status--in-progress',
  'need correction': 'mdr-status--rejected',
  approved: 'mdr-status--approved'
};

const TYPE_PALETTE = ['#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#14B8A6', '#F43F5E'];

@Component({
  selector: 'adw-dms-dashboard',
  standalone: true,
  providers: [
    provideCharts({
      registerables: [DoughnutController, BarController, Legend, ArcElement, BarElement, CategoryScale, LinearScale, Tooltip]
    })
  ],
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule
  ],
  templateUrl: './dms-dashboard.component.html',
  styleUrl: './dms-dashboard.component.scss'
})
export class DmsDashboardComponent implements OnInit {
  private readonly dmsDashboardService = inject(DmsDashboardService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  loading = false;
  filtersApplying = false;
  loadError: string | null = null;
  allItems: DmsDashboardRow[] = [];
  filters: DmsDashboardFilters = this.emptyFilters();
  tablePageIndex = 0;
  tablePageSize = 25;
  readonly pageSizeOptions = [25, 50, 100];
  readonly displayedColumns = ['title', 'discipline', 'documentType', 'status', 'sheetNumber', 'createdDate', 'actions'];
  readonly statusOptions = ['Draft', 'Under Review', 'Need Correction', 'Approved'];
  disciplineOptions: string[] = [];
  documentTypeOptions: string[] = [];
  kpiCards: MdrKpiCard[] = [];
  donutCharts: DmsDonutChart[] = [];
  disciplineLabels: string[] = [];
  disciplineDatasets: ChartDataset<'bar'>[] = [{ data: [], backgroundColor: '#3B82F6', borderRadius: 6, maxBarThickness: 28 }];

  readonly donutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: { legend: { display: false }, tooltip: { enabled: true } }
  };
  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 12, bottom: 4, left: 4 } },
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748B', font: { size: 12 }, maxRotation: 0, minRotation: 0 }, offset: true },
      y: { beginAtZero: true, ticks: { precision: 0, color: '#64748B' }, grid: { color: '#E2E8F0' } }
    }
  };

  get filterSelects() {
    return [
      { id: 'dms-filter-discipline', label: 'Discipline', key: 'discipline' as const, icon: 'account_tree', options: this.disciplineOptions },
      { id: 'dms-filter-type', label: 'Document Type', key: 'documentType' as const, icon: 'description', options: this.documentTypeOptions },
      { id: 'dms-filter-status', label: 'Status', key: 'status' as const, icon: 'flag', options: this.statusOptions }
    ];
  }

  ngOnInit(): void {
    void this.loadFilterOptions();
    void this.loadDocuments('load');
  }

  get tableItems(): DmsDashboardRow[] {
    const start = this.tablePageIndex * this.tablePageSize;
    return this.allItems.slice(start, start + this.tablePageSize);
  }

  percent(value: number, total: number): string {
    return total ? formatPercent(value / total, 'en-US', '1.0-1') : '0%';
  }

  statusClass(status: string): string {
    return STATUS_CLASS[status.trim().toLowerCase()] ?? 'mdr-status--other';
  }

  chartColor(dataset: ChartDataset<'doughnut' | 'bar'>, index: number): string {
    const colors = dataset.backgroundColor;
    const color = Array.isArray(colors) ? colors[index] : colors;
    return typeof color === 'string' ? color : '#94A3B8';
  }

  applyFilters(): Promise<void> | void {
    if (this.filtersApplying || this.loading) {
      return;
    }
    return this.loadDocuments('filter');
  }

  resetFilters(): void {
    this.filters = this.emptyFilters();
    void this.loadDocuments('load');
  }

  onPage(event: PageEvent): void {
    this.tablePageIndex = event.pageIndex;
    this.tablePageSize = event.pageSize;
  }

  openDetails(row: DmsDashboardRow): void {
    if (!row.nodeId) {
      this.notificationService.openSnackMessage('Document id is not available for details.');
      return;
    }
    this.dialog.open(DmsDocumentDetailsDialogComponent, {
      data: { nodeId: row.nodeId },
      width: 'calc(100vw - 24px)',
      height: 'calc(100vh - 24px)',
      maxWidth: '100vw',
      maxHeight: '100vh',
      autoFocus: 'dialog',
      panelClass: 'adw-mdr-details-dialog-panel'
    });
  }

  displayLabel(value: string): string {
    return (value || '').replace(/_/g, ' ').trim();
  }

  async loadDocuments(mode: 'load' | 'filter'): Promise<void> {
    const loading = mode === 'load';
    if (loading) {
      this.loading = true;
    } else {
      this.filtersApplying = true;
    }
    this.loadError = null;
    try {
      const response = await this.dmsDashboardService.searchDocuments(this.filters);
      this.allItems = (response?.list?.entries ?? []).map((row) => this.mapEntry(row?.entry)).filter((row): row is DmsDashboardRow => !!row);
      this.tablePageIndex = 0;
      this.mergeFilterOptionsFromItems(this.allItems);
      this.rebuildDerived();
    } catch (err: unknown) {
      this.loadError = this.errorMessage(err, loading ? 'Failed to load DMS documents' : 'Failed to apply DMS filters');
      this.allItems = [];
      this.rebuildDerived();
    } finally {
      if (loading) {
        this.loading = false;
      } else {
        this.filtersApplying = false;
      }
    }
  }

  private async loadFilterOptions(): Promise<void> {
    try {
      const [disciplines, documentTypes] = await Promise.all([
        this.dmsDashboardService.getDisciplines(),
        this.dmsDashboardService.getDocumentTypes()
      ]);
      this.disciplineOptions = this.mergeUnique(this.disciplineOptions, this.listLabels(this.asList(disciplines), 'disciplineName', 'name', 'label'));
      this.documentTypeOptions = this.mergeUnique(
        this.documentTypeOptions,
        this.listLabels(this.asList(documentTypes), 'documentTypeName', 'name', 'label')
      );
    } catch {
      /* dropdowns still fill from search results */
    }
  }

  private rebuildDerived(): void {
    const items = this.allItems;
    const total = items.length;
    const kpi = (status: string, key: string, tone: MdrKpiCard['tone']) => {
      const value = items.filter((item) => item.status === status).length;
      return { key, label: status, value, subtext: this.percent(value, total) + ' of total', tone };
    };
    this.kpiCards = [
      { key: 'total', label: 'Total Documents', value: total, subtext: 'All DMS records', tone: 'blue' },
      kpi('Draft', 'draft', 'slate'),
      kpi('Under Review', 'review', 'orange'),
      kpi('Need Correction', 'correction', 'rose'),
      kpi('Approved', 'approved', 'green')
    ];

    const statusGroups = this.groupCount(items, (item) => item.status || 'Draft');
    const statusLabels = this.statusOptions.filter((label) => (statusGroups[label] ?? 0) > 0);
    const typeGroups = this.groupCount(items, (item) => this.displayLabel(item.documentType) || '—');
    const disciplineGroups = this.groupCount(items, (item) => this.displayLabel(item.discipline) || '—');
    this.donutCharts = [
      this.donut('Document Status', 'No status data for the current filters.', statusLabels.length ? statusLabels : Object.keys(statusGroups), statusGroups, (label) => STATUS_COLORS[label] ?? '#64748B'),
      this.donut('Document Type', 'No document type data for the current filters.', Object.keys(typeGroups), typeGroups, (_, i) => TYPE_PALETTE[i % TYPE_PALETTE.length])
    ];

    const sorted = Object.entries(disciplineGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    this.disciplineLabels = sorted.map(([label]) => label);
    this.disciplineDatasets = [
      { data: sorted.map(([, n]) => n), backgroundColor: '#3B82F6', borderRadius: 6, maxBarThickness: 56, barPercentage: 0.7, categoryPercentage: 0.7 }
    ];
  }

  private donut(
    title: string,
    empty: string,
    labels: string[],
    groups: Record<string, number>,
    color: (label: string, index: number) => string
  ): DmsDonutChart {
    const data = labels.map((label) => groups[label] ?? 0);
    return {
      title,
      empty,
      labels,
      total: data.reduce((sum, n) => sum + n, 0),
      datasets: [{ data, backgroundColor: labels.map(color), borderWidth: 0, hoverOffset: 4 }]
    };
  }

  private groupCount(items: DmsDashboardRow[], selector: (item: DmsDashboardRow) => string): Record<string, number> {
    return items.reduce<Record<string, number>>((groups, item) => {
      const key = selector(item) || '—';
      groups[key] = (groups[key] ?? 0) + 1;
      return groups;
    }, {});
  }

  private mergeFilterOptionsFromItems(items: DmsDashboardRow[]): void {
    this.disciplineOptions = this.mergeUnique(this.disciplineOptions, items.map((item) => item.discipline));
    this.documentTypeOptions = this.mergeUnique(this.documentTypeOptions, items.map((item) => item.documentType));
  }

  private listLabels(items: any[], ...keys: string[]): string[] {
    return (items ?? []).map((item) => this.optionLabel(item, ...keys)).filter(Boolean);
  }

  private optionLabel(option: any, ...keys: string[]): string {
    if (option == null) {
      return '';
    }
    if (typeof option !== 'object') {
      return String(option).trim();
    }
    const match = keys.find((key) => option[key] != null && option[key] !== '');
    return String(match ? option[match] : option.label || option.name || option.code || '').trim();
  }

  private mergeUnique(...lists: string[][]): string[] {
    return [...new Set(lists.flat().map((value) => value.trim()).filter((value) => value && value !== '—'))].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  private asList(res: any): any[] {
    return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.entries) ? res.entries : Array.isArray(res?.list) ? res.list : [];
  }

  private mapEntry(entry: Record<string, unknown> | undefined): DmsDashboardRow | null {
    const nodeId = String(entry?.['id'] ?? '').trim();
    if (!nodeId) {
      return null;
    }
    const properties = (entry?.['properties'] as Record<string, unknown> | undefined) ?? {};
    const name = this.firstNonEmpty(entry?.['name'], properties['cm:name']) || 'document';
    return {
      nodeId,
      name,
      title: this.firstNonEmpty(properties['cm:title'], name),
      discipline: this.firstNonEmpty(properties['dms:discipline']) || '—',
      documentType: this.firstNonEmpty(properties['dms:document_type']) || '—',
      status: this.normalizeStatus(this.firstNonEmpty(properties['dms:document_status'])),
      sheetNumber: this.firstNonEmpty(properties['dms:document_sheet_number']) || '—',
      createdDate: this.formatDate(properties['cm:created'], entry?.['createdAt'])
    };
  }

  private normalizeStatus(raw: string): string {
    const value = raw.trim().toLowerCase();
    if (!value) {
      return 'Draft';
    }
    if (value.includes('correction')) {
      return 'Need Correction';
    }
    if (value.includes('approved')) {
      return 'Approved';
    }
    if (value.includes('review')) {
      return 'Under Review';
    }
    if (value.includes('draft')) {
      return 'Draft';
    }
    return raw.trim();
  }

  private formatDate(...values: unknown[]): string {
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
    return values.map((value) => (value == null ? '' : String(value).trim())).find(Boolean) ?? '';
  }

  private emptyFilters(): DmsDashboardFilters {
    return { search: '', status: '', discipline: '', documentType: '' };
  }

  private errorMessage(err: unknown, fallback: string): string {
    return err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : fallback;
  }
}
