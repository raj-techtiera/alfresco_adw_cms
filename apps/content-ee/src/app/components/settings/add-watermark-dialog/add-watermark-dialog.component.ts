import { Component, ElementRef, OnDestroy, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '@alfresco/adf-core';
import {
  WatermarkTemplateKind,
  SettingsService
} from '../../../services/settings.service';

@Component({
  selector: 'adw-add-watermark-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './add-watermark-dialog.component.html',
  styleUrl: './add-watermark-dialog.component.scss'
})
export class AddWatermarkDialogComponent implements OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<AddWatermarkDialogComponent, WatermarkTemplateKind | undefined>);
  private readonly settingsService = inject(SettingsService);
  private readonly notificationService = inject(NotificationService);
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('imageFileInput');

  kind: WatermarkTemplateKind | '' = '';
  title = '';
  description = '';
  imageFile: File | null = null;
  imageFileName = '';
  imagePreviewUrl: string | null = null;
  imageFileSize = '';
  dragOver = false;
  submitting = false;
  error: string | null = null;

  cancel(): void {
    if (this.submitting) {
      return;
    }
    this.dialogRef.close(undefined);
  }

  ngOnDestroy(): void {
    this.clearImageSelection();
  }

  onKindChange(kind: WatermarkTemplateKind | ''): void {
    this.kind = kind;
    this.error = null;
    this.title = '';
    this.description = '';
    this.clearImageSelection();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setImageFile(input.files?.[0] ?? null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.submitting) {
      return;
    }
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver = false;
    if (this.submitting) {
      return;
    }
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file && file.type.startsWith('image/')) {
      this.setImageFile(file);
    } else if (file) {
      this.error = 'Please choose an image file.';
    }
  }

  openFilePicker(): void {
    if (this.submitting) {
      return;
    }
    this.fileInput()?.nativeElement.click();
  }

  removeImage(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.clearImageSelection();
    const input = this.fileInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  get canSubmit(): boolean {
    if (this.submitting) {
      return false;
    }
    if (this.kind === 'text') {
      return !!this.title.trim() && !!this.description.trim();
    }
    if (this.kind === 'image') {
      return !!this.description.trim() && !!this.imageFile;
    }
    return false;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit) {
      this.error = this.kind === 'text' ? 'Title and description are required.' : 'Image and description are required.';
      return;
    }

    this.submitting = true;
    this.error = null;
    try {
      if (this.kind === 'text') {
        await this.settingsService.createTextTemplate({
          title: this.title,
          description: this.description
        });
      } else {
        await this.settingsService.createImageTemplate({
          description: this.description,
          file: this.imageFile as File
        });
      }
      this.notificationService.openSnackMessage(
        this.kind === 'image' ? 'Image watermark created successfully.' : 'Text watermark created successfully.'
      );
      this.dialogRef.close(this.kind);
    } catch (err: unknown) {
      this.error = this.apiErrorMessage(err) || 'Failed to add watermark.';
    } finally {
      this.submitting = false;
    }
  }

  private apiErrorMessage(err: unknown): string {
    const e = err as { message?: string; error?: { error?: { briefSummary?: string; message?: string }; message?: string } };
    return e?.error?.error?.briefSummary?.trim() || e?.error?.error?.message?.trim() || e?.error?.message?.trim() || e?.message?.trim() || '';
  }

  private setImageFile(file: File | null): void {
    this.clearImageSelection();
    if (!file) {
      return;
    }
    this.imageFile = file;
    this.imageFileName = file.name;
    this.imageFileSize = this.formatFileSize(file.size);
    this.imagePreviewUrl = URL.createObjectURL(file);
    this.error = null;
  }

  private clearImageSelection(): void {
    if (this.imagePreviewUrl) {
      URL.revokeObjectURL(this.imagePreviewUrl);
    }
    this.imageFile = null;
    this.imageFileName = '';
    this.imageFileSize = '';
    this.imagePreviewUrl = null;
    this.dragOver = false;
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
