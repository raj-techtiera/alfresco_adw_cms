import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';
import { BulkUploadService } from '../../services/bulk-upload.service';

export interface BulkUploadDialogData {
  /** Alfresco project folder node id (segment after Projects). */
  projectFolderId: string;
  projectName?: string;
}

export interface BulkUploadDialogResult {
  success: boolean;
}

type BulkUploadKind = 'zip' | 'csv';

interface BulkUploadSlot {
  kind: BulkUploadKind;
  label: string;
  hint: string;
  file: File | null;
  error: string | null;
}

@Component({
  selector: 'adw-bulk-upload-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './bulk-upload-dialog.component.html',
  styleUrl: './bulk-upload-dialog.component.scss'
})
export class BulkUploadDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<BulkUploadDialogComponent, BulkUploadDialogResult | undefined>);
  private readonly bulkUploadService = inject(BulkUploadService);
  private readonly notificationService = inject(NotificationService);
  readonly data = inject<BulkUploadDialogData>(MAT_DIALOG_DATA);

  @ViewChild('zipInput') private zipInput?: ElementRef<HTMLInputElement>;
  @ViewChild('csvInput') private csvInput?: ElementRef<HTMLInputElement>;

  uploading = false;

  readonly slots: BulkUploadSlot[] = [
    {
      kind: 'zip',
      label: 'Bulk Document Package (ZIP)',
      hint: 'Accepts .zip files only',
      file: null,
      error: null
    },
    {
      kind: 'csv',
      label: 'Document Metadata Sheet (CSV)',
      hint: 'Accepts .csv files only',
      file: null,
      error: null
    }
  ];

  get canUpload(): boolean {
    return this.slots.every((s) => !!s.file) && !this.uploading;
  }

  close(): void {
    if (this.uploading) {
      return;
    }
    this.dialogRef.close(undefined);
  }

  triggerPick(kind: BulkUploadKind): void {
    if (this.uploading) {
      return;
    }
    const input = kind === 'zip' ? this.zipInput?.nativeElement : this.csvInput?.nativeElement;
    input?.click();
  }

  onFileSelected(kind: BulkUploadKind, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';

    const slot = this.slots.find((s) => s.kind === kind);
    if (!slot) {
      return;
    }

    slot.error = null;
    if (!file) {
      slot.file = null;
      return;
    }

    if (!this.isAllowedExtension(file, kind)) {
      slot.file = null;
      slot.error = kind === 'zip' ? 'Please select a .zip file.' : 'Please select a .csv file.';
      return;
    }

    slot.file = file;
  }

  clearFile(kind: BulkUploadKind): void {
    const slot = this.slots.find((s) => s.kind === kind);
    if (!slot || this.uploading) {
      return;
    }
    slot.file = null;
    slot.error = null;
  }

  async upload(): Promise<void> {
    const projectFolderId = this.data?.projectFolderId?.trim();
    const zipSlot = this.slots.find((s) => s.kind === 'zip');
    const csvSlot = this.slots.find((s) => s.kind === 'csv');
    const zipFile = zipSlot?.file;
    const csvFile = csvSlot?.file;

    if (!projectFolderId || !zipFile || !csvFile || this.uploading) {
      return;
    }

    this.uploading = true;
    this.slots.forEach((s) => (s.error = null));

    try {
      let zipContentId: string;
      try {
        zipContentId = await firstValueFrom(this.bulkUploadService.uploadRawContent(zipFile));
      } catch (err) {
        const msg = this.resolveErrorMessage(err, 'Failed to upload ZIP file.');
        if (zipSlot) {
          zipSlot.error = msg;
        }
        this.notificationService.showError(msg);
        return;
      }

      let csvContentId: string;
      try {
        csvContentId = await firstValueFrom(this.bulkUploadService.uploadRawContent(csvFile));
      } catch (err) {
        const msg = this.resolveErrorMessage(err, 'Failed to upload CSV file.');
        if (csvSlot) {
          csvSlot.error = msg;
        }
        this.notificationService.showError(msg);
        return;
      }

      try {
        await firstValueFrom(
          this.bulkUploadService.startBulkProjectDocumentProcess(zipContentId, csvContentId, projectFolderId)
        );
      } catch (err) {
        const msg = this.resolveErrorMessage(err, 'Failed to start bulk document process.');
        this.notificationService.showError(msg);
        return;
      }

      this.dialogRef.close({ success: true });
    } finally {
      this.uploading = false;
    }
  }

  private isAllowedExtension(file: File, kind: BulkUploadKind): boolean {
    const name = (file.name || '').toLowerCase();
    if (kind === 'zip') {
      return name.endsWith('.zip');
    }
    return name.endsWith('.csv');
  }

  private resolveErrorMessage(err: unknown, fallback: string): string {
    const e = err as {
      message?: string;
      error?: {
        message?: string;
        exception?: string;
        error?: { briefSummary?: string; description?: string; message?: string };
      };
    };
    return (
      e?.error?.error?.briefSummary ||
      e?.error?.error?.description ||
      e?.error?.error?.message ||
      e?.error?.exception ||
      e?.error?.message ||
      e?.message ||
      fallback
    );
  }
}
