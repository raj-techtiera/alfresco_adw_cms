import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { DviFlowStep } from '../../../../interface/programPortfolio';
import { MdrService } from '../../../../services/mdr.service';
import { ViewTrackComponent } from '../../trac-flow/view-track.component';

export interface MdrDetailsDialogData {
  nodeId: string;
  title?: string;
  status?: string;
}

@Component({
  standalone: true,
  selector: 'adw-mdr-details-dialog',
  imports: [
    CommonModule,
    ScrollingModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ViewTrackComponent
  ],
  templateUrl: './mdr-details-dialog.component.html',
  styleUrl: './mdr-details-dialog.component.scss'
})
export class MdrDetailsDialogComponent implements OnInit {
  private readonly mdrService = inject(MdrService);
  readonly data = inject<MdrDetailsDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MdrDetailsDialogComponent>);
  private readonly router = inject(Router);

  loading = true;
  error: string | null = null;
  displayTitle = 'DVI';
  statusBadge: string | null = null;
  steps: DviFlowStep[] = [];
  selectedStepId = '';
  hasDocuments = false;

  get selectedStep(): DviFlowStep | null {
    return this.steps.find((step) => step.id === this.selectedStepId) ?? null;
  }

  isStepLocked(step: DviFlowStep): boolean {
    return step.tone !== 'completed';
  }

  async selectStep(step: DviFlowStep): Promise<void> {
    if (this.isStepLocked(step)) {
      return;
    }
    this.selectedStepId = step.id;
    await this.refreshDocumentCount(step.id);
  }

  async ngOnInit(): Promise<void> {
    const dviId = this.data?.nodeId?.trim() ?? '';
    this.displayTitle = this.data?.title?.trim() || 'DVI';
    this.statusBadge = this.data?.status?.trim() || null;

    if (!dviId) {
      this.loading = false;
      this.error = 'No DVI document id.';
      return;
    }

    try {
      this.steps = await this.mdrService.getDviFlowSteps(dviId);
      const firstCompleted = this.steps.find((step) => step.tone === 'completed');
      if (firstCompleted) {
        this.selectedStepId = firstCompleted.id;
        await this.refreshDocumentCount(firstCompleted.id);
      }
    } catch {
      this.error = 'Unable to load MDR details.';
    } finally {
      this.loading = false;
    }
  }

  private async refreshDocumentCount(folderId: string): Promise<void> {
    this.hasDocuments = false;
    try {
      this.hasDocuments = (await this.mdrService.getFolderCount(folderId)) > 0;
    } catch {
      this.hasDocuments = false;
    }
  }

  route_div_folder(): void {
    const folderId = this.selectedStepId.trim();
    if (!folderId) {
      return;
    }
    this.dialogRef.close();
    void this.router.navigate(['/projects', folderId], { state: { explorerTab: 'details' } });
  }
}
