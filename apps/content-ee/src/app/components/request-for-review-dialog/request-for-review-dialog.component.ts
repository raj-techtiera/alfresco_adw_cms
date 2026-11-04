import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@alfresco/adf-core';
import { RequestForReviewService, ReviewFileEntry } from '../../services/request-for-review.service';

export interface RequestForReviewDialogData {
  projectId: string;
  projectName?: string;
  folderId: string;
  folderName?: string;
}

export type { ReviewFileEntry };

type DialogStep = 'select' | 'submit';

@Component({
  selector: 'adw-request-for-review-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './request-for-review-dialog.component.html',
  styleUrl: './request-for-review-dialog.component.scss'
})
export class RequestForReviewDialogComponent implements OnInit {
  readonly data = inject<RequestForReviewDialogData>(MAT_DIALOG_DATA);

  step: DialogStep = 'select';
  files: ReviewFileEntry[] = [];
  selectedIds = new Set<string>();
  loadingFiles = false;
  submitting = false;
  submitError: string | null = null;
  loadError: string | null = null;

  constructor(
    private readonly dialogRef: MatDialogRef<RequestForReviewDialogComponent, boolean | undefined>,
    private readonly requestForReviewService: RequestForReviewService,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    void this.loadFolderFiles();
  }

  get selectedFiles(): ReviewFileEntry[] {
    return this.files.filter((f) => this.selectedIds.has(f.id));
  }

  get primaryActionLabel(): string {
    return this.step === 'select' ? 'Confirm' : 'Submit';
  }

  cancel(): void {
    if (this.submitting) {
      return;
    }
    this.dialogRef.close(undefined);
  }

  async onPrimaryAction(): Promise<void> {
    if (this.step === 'select') {
      this.confirmSelection();
      return;
    }
    await this.submitForReview();
  }

  toggleFile(id: string, checked: boolean): void {
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.files.forEach((f) => this.selectedIds.add(f.id));
    } else {
      this.selectedIds.clear();
    }
  }

  get allSelected(): boolean {
    return this.files.length > 0 && this.files.every((f) => this.selectedIds.has(f.id));
  }

  get someSelected(): boolean {
    return this.selectedIds.size > 0 && !this.allSelected;
  }

  private confirmSelection(): void {
    if (this.selectedIds.size === 0) {
      this.notificationService.openSnackMessage('Select at least one file to continue.');
      return;
    }
    this.submitError = null;
    this.step = 'submit';
  }

  private async loadFolderFiles(): Promise<void> {
    const folderId = this.data.folderId?.trim();
    if (!folderId) {
      this.loadError = 'Folder id is missing.';
      return;
    }

    this.loadingFiles = true;
    this.loadError = null;
    try {
      this.files = await this.requestForReviewService.listFolderFiles(folderId);
    } catch {
      this.loadError = 'Failed to load files from this folder.';
      this.files = [];
    } finally {
      this.loadingFiles = false;
    }
  }

  private async submitForReview(): Promise<void> {
    const projectId = this.data.projectId?.trim();
    if (!projectId) {
      this.submitError = 'Project id is missing. Reopen from a project folder.';
      return;
    }

    const documentIds = [...this.selectedIds];
    if (documentIds.length === 0) {
      this.submitError = 'Select at least one file to submit.';
      this.step = 'select';
      return;
    }

    this.submitting = true;
    this.submitError = null;
    try {
      const errorMessage = await this.requestForReviewService.submitForReview(documentIds);
      errorMessage ? this.notificationService.showError(errorMessage) : this.dialogRef.close(true);
    } catch (err: unknown) {
      this.submitError =
        RequestForReviewDialogComponent.apiErrorMessage(err) || 'Failed to submit documents for review.';
    } finally {
      this.submitting = false;
    }
  }

  private static apiErrorMessage(err: unknown): string {
    const hiddenStackTraceMessage =
      'For security reasons the stack trace is no longer displayed, but the property is kept for previous versions.';
    const anyErr = err as {
      message?: string;
      error?: { message?: string; error?: { errorKey?: string; briefSummary?: string; message?: string } };
    };
    const body = anyErr?.error;
    if (body && typeof body === 'object') {
      const apiError = (body as { error?: { errorKey?: string; briefSummary?: string; message?: string } }).error;
      if (apiError && typeof apiError === 'object') {
        if (typeof apiError.errorKey === 'string' && apiError.errorKey.trim()) {
          return apiError.errorKey.trim();
        }
        if (typeof apiError.briefSummary === 'string' && apiError.briefSummary.trim()) {
          return apiError.briefSummary.trim();
        }
        if (typeof apiError.message === 'string' && apiError.message.trim()) {
          const m = apiError.message.trim();
          if (m !== hiddenStackTraceMessage) {
            return m;
          }
        }
      }
      if (typeof (body as { message?: string }).message === 'string' && (body as { message: string }).message.trim()) {
        const m = (body as { message: string }).message.trim();
        if (m !== hiddenStackTraceMessage) {
          return m;
        }
      }
    }
    if (typeof (anyErr as { message?: string })?.message === 'string' && (anyErr as { message: string }).message.trim()) {
      return (anyErr as { message: string }).message.trim();
    }
    return '';
  }
}
