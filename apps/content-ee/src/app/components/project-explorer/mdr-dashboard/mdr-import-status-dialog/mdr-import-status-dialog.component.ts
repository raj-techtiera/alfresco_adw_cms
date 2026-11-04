import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export type MdrImportStatusKind = 'importing' | 'timeout' | 'failed' | 'success';

export interface MdrImportStatusDialogData {
  kind: MdrImportStatusKind;
  fileName?: string;
}

@Component({
  selector: 'adw-mdr-import-status-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './mdr-import-status-dialog.component.html',
  styleUrl: './mdr-import-status-dialog.component.scss'
})
export class MdrImportStatusDialogComponent {
  readonly data = inject<MdrImportStatusDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MdrImportStatusDialogComponent>);

  get title(): string {
    switch (this.data.kind) {
      case 'importing':
        return 'Importing MDR Records...';
      case 'timeout':
        return 'Processing is taking longer than expected';
      case 'failed':
        return 'Import Failed';
      case 'success':
        return 'Import complete';
      default:
        return 'Import status';
    }
  }

  get body(): string {
    switch (this.data.kind) {
      case 'importing':
        return 'Please wait while we process your file. Large files may take more than 20 seconds. If this window closes, the import will continue in the background and you will receive an email upon completion.';
      case 'timeout':
        return 'The import is still running in the background, but the connection timed out while waiting for the final response. Please wait for your confirmation email, or refresh the dashboard in a few minutes to check the status.';
      case 'failed':
        return 'We encountered an unexpected error while processing your CSV file. Please refresh the page and try again later.';
      case 'success':
        return this.data.fileName
          ? `"${this.data.fileName}" was imported successfully.`
          : 'Your MDR records were imported successfully.';
      default:
        return '';
    }
  }

  get icon(): string {
    switch (this.data.kind) {
      case 'importing':
        return 'hourglass_top';
      case 'timeout':
        return 'schedule';
      case 'failed':
        return 'error_outline';
      case 'success':
        return 'check_circle';
      default:
        return 'info';
    }
  }

  get showSpinner(): boolean {
    return this.data.kind === 'importing';
  }

  get showActions(): boolean {
    return this.data.kind !== 'importing';
  }

  close(): void {
    this.dialogRef.close();
  }
}
