import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { HrRequisitionDetailsDialogData, JobRequisitionStep } from '../../../interface/hrManagement';
import { HrManagementService } from '../../../services/hr-management.service';
import { ViewTrackComponent } from '../../project-explorer/trac-flow/view-track.component';

@Component({
  standalone: true,
  selector: 'adw-hr-requisition-details-dialog',
  imports: [
    CommonModule,
    ScrollingModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    ViewTrackComponent
  ],
  templateUrl: './hr-requisition-details-dialog.component.html',
  styleUrls: [
    '../../project-explorer/mdr-dashboard/mdr-details-dialog/mdr-details-dialog.component.scss',
    './hr-requisition-details-dialog.component.scss'
  ]
})
export class HrRequisitionDetailsDialogComponent implements OnInit {
  private readonly data = inject<HrRequisitionDetailsDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<HrRequisitionDetailsDialogComponent>);
  private readonly hrManagement = inject(HrManagementService);
  private readonly router = inject(Router);

  loading = true;
  error: string | null = null;
  displayTitle = this.data?.title?.trim() || 'Job requisition';
  statusBadge = this.data?.status?.trim() || null;
  steps: JobRequisitionStep[] = [];
  selectedStepId = '';

  get selectedStep(): JobRequisitionStep | null {
    return this.steps.find((step) => step.id === this.selectedStepId) ?? null;
  }

  isStepLocked = (step: JobRequisitionStep): boolean => step.tone !== 'completed';

  selectStep(step: JobRequisitionStep): void {
    if (step.tone === 'completed') this.selectedStepId = step.id;
  }

  async ngOnInit(): Promise<void> {
    const nodeId = this.data?.nodeId?.trim() ?? '';
    if (!nodeId) {
      this.loading = false;
      this.error = 'No job requisition id.';
      return;
    }
    try {
      const details = await this.hrManagement.getRequisitionDetails(nodeId);
      this.displayTitle = details.title || this.displayTitle;
      this.statusBadge = details.status || this.statusBadge;
      this.steps = details.steps;
      this.selectedStepId = this.steps.find((step) => step.tone === 'completed')?.id ?? '';
    } catch {
      this.error = 'Unable to load job requisition details.';
    } finally {
      this.loading = false;
    }
  }

  route_div_folder(): void {
    const folderId = this.selectedStepId.trim();
    if (!folderId) return;
    this.dialogRef.close();
    void this.router.navigate(['/projects', folderId], { state: { explorerTab: 'details' } });
  }
}
