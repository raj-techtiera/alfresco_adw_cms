import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageLayoutComponent, PageLayoutContentComponent } from '@alfresco/aca-shared';
import { NotificationService } from '@alfresco/adf-core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { HrManagementService } from '../../../services/hr-management.service';
import { HrStatusCard, JobRequisition } from '../../../interface/hrManagement';
import { HrRequisitionDetailsDialogComponent } from '../hr-requisition-details-dialog/hr-requisition-details-dialog.component';

@Component({
  standalone: true,
  selector: 'adw-hr-management',
  imports: [
    CommonModule,
    FormsModule,
    PageLayoutComponent,
    PageLayoutContentComponent,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatPaginatorModule,
    MatTableModule,
    MatDialogModule
  ],
  templateUrl: './hr-management.component.html',
  styleUrls: [
    '../../vendor-document-creation/vendor-document-creation.component.scss',
    './hr-management.component.scss'
  ]
})
export class HrManagementComponent implements OnInit {
  private readonly hrManagement = inject(HrManagementService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  rows: JobRequisition[] = [];
  cards: HrStatusCard[] = [];
  loading = false;
  search = '';
  statusFilter = '';
  pageSize = 10;
  pageIndex = 0;
  readonly pageSizeOptions = [5, 10, 20];
  readonly statusOptions = ['Open', 'Close', 'Draft'];
  readonly displayedColumns = [
    'icon',
    'jobId',
    'jobTitle',
    'status',
    'departmentName',
    'requestedBy',
    'priority',
    'employmentType',
    'actions'
  ];

  get pageRows(): JobRequisition[] {
    return this.rows.slice(this.pageIndex * this.pageSize, this.pageIndex * this.pageSize + this.pageSize);
  }

  ngOnInit(): void {
    this.load(true);
  }

  load(updateCards = false): void {
    this.loading = true;
    this.hrManagement.searchJobRequisitions({ name: this.search, status: this.statusFilter }).subscribe({
      next: (rows) => this.setRows(rows, updateCards),
      error: () => {
        this.setRows([], updateCards);
        this.notification.openSnackMessage('Unable to load job requisitions.');
      }
    });
  }

  openDetails(row: JobRequisition): void {
    if (!row.id.trim()) {
      this.notification.openSnackMessage('Document id is not available for details.');
      return;
    }
    this.dialog.open(HrRequisitionDetailsDialogComponent, {
      data: { nodeId: row.id.trim(), title: row.jobId, status: row.status },
      width: 'calc(100vw - 24px)',
      height: 'calc(100vh - 24px)',
      maxWidth: '100vw',
      maxHeight: '100vh',
      autoFocus: 'dialog',
      panelClass: 'adw-mdr-details-dialog-panel'
    });
  }

  statusKey(status: string): string {
    const value = status.trim().toLowerCase();
    return value === 'open' ? 'under-review' : value === 'close' || value === 'closed' ? 'approved' : value === 'draft' ? 'draft' : 'other';
  }

  statusIcon(status: string): string {
    const key = this.statusKey(status);
    return key === 'approved' ? 'check_circle' : key === 'under-review' ? 'hourglass_top' : key === 'draft' ? 'edit_note' : 'info';
  }

  private setRows(rows: JobRequisition[], updateCards: boolean): void {
    this.rows = rows;
    if (updateCards) this.cards = this.buildCards(rows);
    this.pageIndex = 0;
    this.loading = false;
  }

  private buildCards(rows: JobRequisition[]): HrStatusCard[] {
    const count = (value: string) =>
      rows.filter((row) => value === 'close' ? ['close', 'closed'].includes(row.status.toLowerCase()) : row.status.toLowerCase() === value).length;
    return [
      { id: 'total', label: 'All requisitions', count: rows.length, filter: '', icon: 'folder_open', variant: 'total' },
      { id: 'open', label: 'Open', count: count('open'), filter: 'Open', icon: 'hourglass_top', variant: 'review' },
      { id: 'close', label: 'Close', count: count('close'), filter: 'Close', icon: 'check_circle', variant: 'approved' },
      { id: 'draft', label: 'Draft', count: count('draft'), filter: 'Draft', icon: 'edit_note', variant: 'draft' }
    ];
  }
}
