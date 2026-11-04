import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule, formatPercent } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartDataset, ChartOptions } from 'chart.js';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
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
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NotificationService } from '@alfresco/adf-core';
import { DVI_STATUS_ORDER, MdrItemRecord, MdrService } from '../../../services/mdr.service';
import {
  CreateMdrDialogComponent,
  CreateMdrDialogData
} from './create-mdr-dialog/create-mdr-dialog.component';
import { MdrDetailsDialogComponent } from './mdr-details-dialog/mdr-details-dialog.component';
import { MdrFilters, MdrKpiCard } from '../../../interface/programPortfolio';
@Component({
  selector: 'adw-mdr-dashboard',
  standalone: true,
  providers: [
    provideCharts({
      registerables: [
        DoughnutController,
        BarController,
        Legend,
        ArcElement,
        BarElement,
        CategoryScale,
        LinearScale,
        Tooltip
      ]
    })
  ],
  imports: [
    CommonModule,
    FormsModule,
    BaseChartDirective,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatMenuModule,
    MatDialogModule
  ],
  templateUrl: './mdr-dashboard.component.html',
  styleUrl: './mdr-dashboard.component.scss'
})
export class MdrDashboardComponent implements OnChanges {
  private static readonly STATUS_COLORS: Record<string, string> = {
    Draft: '#64748B',
    'In Progress': '#F97316',
    Approved: '#22C55E',
    Rejected: '#EF4444',
    Closed: '#14B8A6'
  };

  @Input() projectId: string | null = null;
  @Input() projectName = '';
  @Input() active = false;

  private readonly mdrService = inject(MdrService);
  private readonly notificationService = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  
  loading = false;
  filtersApplying = false;
  loadError: string | null = null;
  allItems: MdrItemRecord[] = [];
  private optionItems: MdrItemRecord[] = [];
  totalItems = 0;

  filters: MdrFilters = this.emptyFilters();
  /** Snapshot used for table/charts/KPIs; updated only when Apply Filters is clicked. */
  appliedFilters: MdrFilters = this.emptyFilters();
  tablePageIndex = 0;
  tablePageSize = 25;
  readonly pageSizeOptions = [25, 50, 100];

  kpiCards: MdrKpiCard[] = [];

  statusLabels: string[] = [];
  statusDatasets: ChartDataset<'doughnut'>[] = [{ data: [], backgroundColor: [], borderWidth: 0 }];

  classLabels: string[] = [];
  classDatasets: ChartDataset<'doughnut'>[] = [{ data: [], backgroundColor: [], borderWidth: 0 }];

  disciplineLabels: string[] = [];
  disciplineDatasets: ChartDataset<'bar'>[] = [{ data: [], backgroundColor: '#3B82F6', borderRadius: 6, maxBarThickness: 28 }];

  deliverableLabels: string[] = [];
  deliverableDatasets: ChartDataset<'doughnut'>[] = [{ data: [], backgroundColor: [], borderWidth: 0 }];

  readonly chartLegend = false;
  readonly donutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: { legend: { display: false }, tooltip: { enabled: true } }
  };
  readonly pieOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: true } }
  };
  readonly barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 12, bottom: 4, left: 4 } },
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#64748B', font: { size: 11 }, maxRotation: 45, minRotation: 0 },
        offset: true
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0, color: '#64748B' },
        grid: { color: '#E2E8F0' }
      }
    }
  };

  private loadedProjectId: string | null = null;
  private loadingForProjectId: string | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.active || !this.projectId) {
      return;
    }

    if (this.loadedProjectId === this.projectId || this.loadingForProjectId === this.projectId) {
      return;
    }

    if (changes['projectId'] || changes['active']) {
      void this.loadData();
    }
  }

  get filteredItems(): MdrItemRecord[] {
    return this.allItems;
  }

  get tableItems(): MdrItemRecord[] {
    const start = this.tablePageIndex * this.tablePageSize;
    return this.filteredItems.slice(start, start + this.tablePageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredItems.length / this.tablePageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get rangeLabel(): string {
    const total = this.filteredItems.length;
    if (total === 0) {
      return 'Showing 0 of 0';
    }
    const start = this.tablePageIndex * this.tablePageSize + 1;
    const end = Math.min(start + this.tablePageSize - 1, total);
    return `Showing ${start}-${end} of ${total}`;
  }

  get filterDocumentClasses(): string[] {
    return this.uniqueValues(this.optionItems.map((item) => item.documentClass));
  }

  get filterDisciplines(): string[] {
    return this.uniqueValues(this.optionItems.map((item) => item.discipline));
  }

  get filterDeliverableTypes(): string[] {
    return this.uniqueValues(this.optionItems.map((item) => item.deliverableType));
  }

  get filterStatuses(): string[] {
    return [...DVI_STATUS_ORDER];
  }

  get hasMdrData(): boolean {
    return this.allItems.length > 0;
  }

  get statusChartTotal(): number {
    return this.sumDataset(this.statusDatasets[0]?.data);
  }

  get classChartTotal(): number {
    return this.sumDataset(this.classDatasets[0]?.data);
  }

  get deliverableChartTotal(): number {
    return this.sumDataset(this.deliverableDatasets[0]?.data);
  }

  percent(value: number, total: number): string {
    if (!total) {
      return '0%';
    }
    return formatPercent(value / total, 'en-US', '1.0-1');
  }

  displayStatus(item: MdrItemRecord): string {
    return this.effectiveStatus(item);
  }

  displayOverdueDays(item: MdrItemRecord): string {
    if (item.overdueDays === null || item.overdueDays <= 0) {
      return '—';
    }
    const label = item.overdueDays === 1 ? 'day' : 'days';
    return `${item.overdueDays} ${label}`;
  }

  overdueDaysClass(item: MdrItemRecord): string {
    if (item.overdueDays !== null && item.overdueDays > 0) {
      return 'mdr-overdue-days--late';
    }
    return '';
  }

  /** Opens MDR details dialog (tabbed sections like Project Details + document preview). */
  openMdrDetails(row: MdrItemRecord): void {
    const mdrId = (row.id ?? '').trim();
    if (!mdrId) {
      this.notificationService.openSnackMessage('Document id is not available for details.');
      return;
    }

    this.dialog.open(MdrDetailsDialogComponent, {
      data: { nodeId: mdrId, title: row.mdrNumber, status: row.status },
      /* Same near-fullscreen shell as Project Details. */
      width: 'calc(100vw - 24px)',
      height: 'calc(100vh - 24px)',
      maxWidth: '100vw',
      maxHeight: '100vh',
      autoFocus: 'dialog',
      panelClass: 'adw-mdr-details-dialog-panel'
    });
  }

  statusClass(status: string): string {
    switch (status.trim().toLowerCase()) {
      case 'draft':
        return 'mdr-status--draft';
      case 'in progress':
        return 'mdr-status--in-progress';
      case 'approved':
        return 'mdr-status--approved';
      case 'rejected':
        return 'mdr-status--rejected';
      case 'closed':
        return 'mdr-status--closed';
      default:
        return 'mdr-status--other';
    }
  }

  async applyFilters(): Promise<void> {
    if (!this.projectId || this.filtersApplying || this.loading) {
      return;
    }

    this.appliedFilters = { ...this.filters };
    this.tablePageIndex = 0;
    this.filtersApplying = true;
    this.loadError = null;

    try {
      const result = await this.mdrService.loadMdrItemsForProject(this.projectId, {
        name: this.filters.search,
        component: this.filters.discipline,
        dviLevel: this.filters.documentClass,
        status: this.filters.status
      });
      this.allItems = result.items ?? [];
      this.totalItems = this.allItems.length;
      this.rebuildDerived();
    } catch (err: unknown) {
      this.loadError =
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Failed to apply DVI filters';
      this.allItems = [];
      this.totalItems = 0;
      this.rebuildDerived();
    } finally {
      this.filtersApplying = false;
    }
  }

  resetFilters(): void {
    this.filters = this.emptyFilters();
    this.appliedFilters = this.emptyFilters();
    void this.loadData();
  }

  setPageSize(size: number): void {
    if (size === this.tablePageSize) {
      return;
    }
    this.tablePageSize = size;
    this.tablePageIndex = 0;
  }

  goToPage(pageIndex: number): void {
    const clamped = Math.min(Math.max(pageIndex, 0), this.totalPages - 1);
    this.tablePageIndex = clamped;
  }

  prevPage(): void {
    this.goToPage(this.tablePageIndex - 1);
  }

  nextPage(): void {
    this.goToPage(this.tablePageIndex + 1);
  }

  async refresh(): Promise<void> {
    this.loadedProjectId = null;
    this.loadingForProjectId = null;
    await this.loadData();
  }

  openCreateMdrDialog(): void {
    if (!this.projectId) {
      return;
    }

    const data: CreateMdrDialogData = {
      projectId: this.projectId,
      projectName: this.projectName
    };

    this.dialog
      .open(CreateMdrDialogComponent, {
        width: 'min(720px, calc(100vw - 32px))',
        maxWidth: '100vw',
        maxHeight: 'min(90vh, 900px)',
        autoFocus: true,
        panelClass: 'adw-create-mdr-dialog-panel',
        data
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          void this.refresh();
        }
      });
  }

  private async loadData(): Promise<void> {
    if (!this.projectId) {
      return;
    }

    const projectId = this.projectId;
    if (this.loadingForProjectId === projectId) {
      return;
    }

    this.loadingForProjectId = projectId;
    this.loading = true;
    this.loadError = null;

    try {
      const result = await this.mdrService.loadMdrItemsForProject(projectId);
      if (this.projectId !== projectId) {
        return;
      }

      this.allItems = result.items ?? [];
      this.optionItems = this.allItems;
      this.totalItems = result.items?.length ?? 0;
      this.loadedProjectId = projectId;
      this.filters = this.emptyFilters();
      this.appliedFilters = this.emptyFilters();
      this.tablePageIndex = 0;
      this.rebuildDerived();
    } catch (err: unknown) {
      if (this.projectId !== projectId) {
        return;
      }
      this.loadError =
        err && typeof err === 'object' && 'message' in err
          ? String((err as Error).message)
          : 'Failed to load MDR data';
      this.allItems = [];
      this.optionItems = [];
      this.totalItems = 0;
      this.rebuildDerived();
    } finally {
      if (this.loadingForProjectId === projectId) {
        this.loadingForProjectId = null;
      }
      this.loading = false;
    }
  }

  private rebuildDerived(): void {
    const items = this.filteredItems;
    const total = items.length;
    this.buildKpis(items, total);
    this.buildStatusChart(items);
    this.buildClassChart(items);
    this.buildDisciplineChart(items);
    this.buildDeliverableChart(items);
  }

  private sumDataset(data: unknown): number {
    if (!Array.isArray(data)) {
      return 0;
    }
    return data.reduce<number>((sum, value) => sum + Number(value ?? 0), 0);
  }

  chartColor(dataset: ChartDataset<'doughnut' | 'bar' | 'pie'>, index: number): string {
    const colors = dataset.backgroundColor;
    if (Array.isArray(colors)) {
      const color = colors[index];
      return typeof color === 'string' ? color : '#94A3B8';
    }
    return typeof colors === 'string' ? colors : '#94A3B8';
  }

  private buildKpis(items: MdrItemRecord[], total: number): void {
    const countByStatus = (status: string) =>
      items.filter((item) => this.effectiveStatus(item) === status).length;
    const draft = countByStatus('Draft');
    const inProgress = countByStatus('In Progress');
    const approved = countByStatus('Approved');
    const rejected = countByStatus('Rejected');
    const closed = countByStatus('Closed');

    this.kpiCards = [
      { key: 'total', label: 'Total DVIs', value: total, subtext: 'All records', tone: 'blue' },
      { key: 'draft', label: 'Draft', value: draft, subtext: this.percent(draft, total) + ' of total', tone: 'slate' },
      { key: 'inProgress', label: 'In Progress', value: inProgress, subtext: this.percent(inProgress, total) + ' of total', tone: 'orange' },
      { key: 'approved', label: 'Approved', value: approved, subtext: this.percent(approved, total) + ' of total', tone: 'green' },
      { key: 'rejected', label: 'Rejected', value: rejected, subtext: this.percent(rejected, total) + ' of total', tone: 'rose' },
      { key: 'closed', label: 'Closed', value: closed, subtext: this.percent(closed, total) + ' of total', tone: 'teal' }
    ];
  }

  private buildStatusChart(items: MdrItemRecord[]): void {
    const groups = this.groupCount(items, (item) => this.effectiveStatus(item));
    const labels = DVI_STATUS_ORDER.filter((label) => (groups[label] ?? 0) > 0);
    this.statusLabels = labels;
    this.statusDatasets = [
      {
        data: labels.map((label) => groups[label] ?? 0),
        backgroundColor: labels.map((label) => MdrDashboardComponent.STATUS_COLORS[label] ?? '#64748B'),
        borderWidth: 0,
        hoverOffset: 4
      }
    ];
  }

  private buildClassChart(items: MdrItemRecord[]): void {
    const groups = this.groupCount(items, (item) => item.documentClass || '—');
    this.classLabels = Object.keys(groups);
    const palette = ['#3B82F6', '#22C55E', '#F59E0B', '#8B5CF6', '#14B8A6', '#F43F5E'];
    this.classDatasets = [
      {
        data: this.classLabels.map((label) => groups[label] ?? 0),
        backgroundColor: this.classLabels.map((_, i) => palette[i % palette.length]),
        borderWidth: 0,
        hoverOffset: 4
      }
    ];
  }

  private buildDisciplineChart(items: MdrItemRecord[]): void {
    const groups = this.groupCount(items, (item) => item.discipline || '—');
    const sorted = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 8);
    this.disciplineLabels = sorted.map(([label]) => label);
    this.disciplineDatasets = [
      {
        data: sorted.map(([, count]) => count),
        backgroundColor: '#3B82F6',
        borderRadius: 6,
        barPercentage: 0.72,
        categoryPercentage: 0.82
      }
    ];
  }

  private buildDeliverableChart(items: MdrItemRecord[]): void {
    const groups = this.groupCount(items, (item) => item.deliverableType || '—');
    this.deliverableLabels = Object.keys(groups);
    const palette = ['#2563EB', '#0EA5E9', '#14B8A6', '#F59E0B', '#A855F7', '#64748B'];
    this.deliverableDatasets = [
      {
        data: this.deliverableLabels.map((label) => groups[label] ?? 0),
        backgroundColor: this.deliverableLabels.map((_, i) => palette[i % palette.length]),
        borderWidth: 0,
        hoverOffset: 4
      }
    ];
  }

  private effectiveStatus(item: MdrItemRecord): string {
    return item.status || 'Draft';
  }

  private groupCount(items: MdrItemRecord[], selector: (item: MdrItemRecord) => string): Record<string, number> {
    const groups: Record<string, number> = {};
    for (const item of items) {
      const key = selector(item) || '—';
      groups[key] = (groups[key] ?? 0) + 1;
    }
    return groups;
  }

  private uniqueValues(values: string[]): string[] {
    return Array.from(new Set(values.filter((value) => value && value !== '—'))).sort();
  }

  private emptyFilters(): MdrFilters {
    return {
      documentClass: '',
      discipline: '',
      deliverableType: '',
      status: '',
      handoverRequired: '',
      plannedFrom: '',
      plannedTo: '',
      search: ''
    };
  }
}
