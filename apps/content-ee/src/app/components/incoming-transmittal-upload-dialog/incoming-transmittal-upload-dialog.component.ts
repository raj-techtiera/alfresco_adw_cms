import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';
import { AlfrescoService } from '../../alfresco.service';

export interface IncomingTransmittalUploadDialogData {
  folderId: string;
  projectId?: string;
  projectName?: string;
  folderName?: string;
}

@Component({
  selector: 'adw-incoming-transmittal-upload-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './incoming-transmittal-upload-dialog.component.html',
  styleUrl: './incoming-transmittal-upload-dialog.component.scss'
})
export class IncomingTransmittalUploadDialogComponent {
  readonly form: FormGroup;
  uploadedFiles: File[] = [];
  submitting = false;
  isDragOver = false;
  readonly maxUploadSizeMb = 500;
  readonly data = inject<IncomingTransmittalUploadDialogData>(MAT_DIALOG_DATA);

  constructor(
    private readonly alfrescoService: AlfrescoService,
    private readonly notificationService: NotificationService,
    fb: FormBuilder,
    readonly dialogRef: MatDialogRef<IncomingTransmittalUploadDialogComponent, boolean | undefined>
  ) {
    this.form = fb.group({
      transmittalNumber: ['', Validators.required]
    });
  }

  cancel(): void {
    if (this.submitting) {
      return;
    }
    this.dialogRef.close(undefined);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.addUploadedFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer?.files?.length) {
      this.addUploadedFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  removeUploadedFile(index: number): void {
    this.uploadedFiles = this.uploadedFiles.filter((_, i) => i !== index);
  }

  formatFileSize(bytes: number): string {
    if (!bytes) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** index;
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notificationService.showError('Transmittal number is required.');
      return;
    }

    if (!this.uploadedFiles.length) {
      this.notificationService.showError('Select at least one file to upload.');
      return;
    }

    const folderId = this.data.folderId?.trim();
    if (!folderId) {
      this.notificationService.showError('Folder id is missing. Reopen from Incoming Transmittal.');
      return;
    }

    const projectTitle = this.data.projectName?.trim();
    if (!projectTitle) {
      this.notificationService.showError('Project name is missing. Reopen from a project folder.');
      return;
    }

    const transmittalNumber = String(this.form.getRawValue().transmittalNumber ?? '').trim();
    this.submitting = true;

    try {
      for (const file of this.uploadedFiles) {
        await firstValueFrom(
          this.alfrescoService.uploadIncomingTransmittalFile(file, folderId, projectTitle, transmittalNumber)
        );
      }
      this.dialogRef.close(true);
    } catch (err: unknown) {
      this.notificationService.showError(this.resolveErrorMessage(err, 'Failed to upload file(s).'));
    } finally {
      this.submitting = false;
    }
  }

  private addUploadedFiles(files: File[]): void {
    const maxBytes = this.maxUploadSizeMb * 1024 * 1024;
    for (const file of files) {
      if (file.size > maxBytes) {
        this.notificationService.showError(`"${file.name}" exceeds the ${this.maxUploadSizeMb} MB limit.`);
        continue;
      }
      this.uploadedFiles = [...this.uploadedFiles, file];
    }
  }

  private resolveErrorMessage(err: unknown, fallback: string): string {
    const anyErr = err as {
      error?: { message?: string; error?: { message?: string; briefSummary?: string } };
      message?: string;
    };
    const body = anyErr?.error;
    if (body && typeof body === 'object') {
      const nested = body.error;
      if (nested && typeof nested === 'object') {
        if (typeof nested.briefSummary === 'string' && nested.briefSummary.trim()) {
          return nested.briefSummary.trim();
        }
        if (typeof nested.message === 'string' && nested.message.trim()) {
          return nested.message.trim();
        }
      }
      if (typeof body.message === 'string' && body.message.trim()) {
        return body.message.trim();
      }
    }
    if (
      typeof anyErr?.message === 'string' &&
      anyErr.message.trim() &&
      !/^Http failure response for /i.test(anyErr.message)
    ) {
      return anyErr.message.trim();
    }
    return fallback;
  }
}
