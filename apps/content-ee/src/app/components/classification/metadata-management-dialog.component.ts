import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClassificationService } from '../../services/classification.service';

@Component({
  selector: 'app-metadata-management-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon>data_object</mat-icon>
      Manage Extraction Metadata Fields
    </h2>

    <mat-dialog-content class="dialog-content">
      <p class="dialog-subtitle">
        These keys are sent to the field extraction API as dynamic metadata templates.
        Changes are saved automatically.
      </p>

      <div class="field-list">
        <div *ngFor="let field of metadataFields" class="field-row">
          <mat-icon class="field-icon">key</mat-icon>
          <span class="field-name">{{ field }}</span>
          <button
            mat-icon-button
            class="delete-btn"
            (click)="removeField(field)"
            matTooltip="Remove this field"
            [disabled]="metadataFields.length <= 1">
            <mat-icon>delete_outline</mat-icon>
          </button>
        </div>
        <div *ngIf="metadataFields.length === 0" class="empty-state">
          No metadata fields defined. Add at least one below.
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="add-row">
        <mat-form-field appearance="outline" class="add-field">
          <mat-label>Add new field</mat-label>
          <mat-icon matPrefix>add_circle_outline</mat-icon>
          <input
            matInput
            [(ngModel)]="newFieldName"
            (keydown.enter)="addField()"
            placeholder="e.g. customer_id"
            autocomplete="off" />
          <mat-hint *ngIf="normalizedFieldName && isDuplicate()">Field already exists</mat-hint>
          <mat-hint *ngIf="normalizedFieldName && !isDuplicate()">Will be saved as: {{ normalizedFieldName }}</mat-hint>
        </mat-form-field>
        <button mat-flat-button color="primary" (click)="addField()" [disabled]="!normalizedFieldName || isDuplicate()">
          Add
        </button>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-button class="reset-btn" (click)="resetToDefaults()" matTooltip="Restore original metadata fields">
        <mat-icon>restore</mat-icon>
        Reset to defaults
      </button>
      <button mat-flat-button color="primary" mat-dialog-close>Done</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dialog-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .dialog-title mat-icon {
        color: #1976d2;
        font-size: 22px;
      }

      .dialog-content {
        min-width: 420px;
        padding-top: 4px !important;
      }

      .dialog-subtitle {
        font-size: 13px;
        color: #64748b;
        margin: 0 0 16px 0;
        line-height: 1.5;
      }

      .field-list {
        max-height: 280px;
        overflow-y: auto;
        margin-bottom: 12px;
      }

      .field-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 4px;
        border-radius: 6px;
        transition: background 0.1s;
      }

      .field-row:hover {
        background: rgba(0, 0, 0, 0.04);
      }

      .field-row:hover .delete-btn {
        opacity: 1;
      }

      .field-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
        color: #94a3b8;
        flex-shrink: 0;
      }

      .field-name {
        flex: 1;
        font-size: 14px;
        color: #1e293b;
      }

      .delete-btn {
        opacity: 0.25;
        transition: opacity 0.15s;
        color: #ef4444;
      }

      .delete-btn mat-icon {
        font-size: 19px;
      }

      .delete-btn[disabled] {
        opacity: 0 !important;
      }

      .empty-state {
        color: #94a3b8;
        font-size: 13px;
        padding: 16px 0;
        text-align: center;
      }

      mat-divider {
        margin: 4px 0 16px;
      }

      .add-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }

      .add-row button {
        margin-top: 4px;
      }

      .add-field {
        flex: 1;
      }

      .dialog-actions {
        display: flex;
        justify-content: space-between;
        padding: 0 24px 16px !important;
      }

      .reset-btn {
        color: #94a3b8;
        font-size: 13px;
      }
    `
  ]
})
export class MetadataManagementDialogComponent {
  metadataFields: string[];
  newFieldName = '';

  constructor(private classificationService: ClassificationService) {
    this.metadataFields = [...this.classificationService.getAvailableMetadataFields()];
  }

  get normalizedFieldName(): string {
    return this.classificationService.normalizeMetadataFieldName(this.newFieldName);
  }

  isDuplicate(): boolean {
    return this.metadataFields.includes(this.normalizedFieldName);
  }

  addField(): void {
    const normalized = this.normalizedFieldName;
    if (normalized && !this.metadataFields.includes(normalized)) {
      this.classificationService.addMetadataField(normalized);
      this.metadataFields = [...this.classificationService.getAvailableMetadataFields()];
      this.newFieldName = '';
    }
  }

  removeField(name: string): void {
    this.classificationService.removeMetadataField(name);
    this.metadataFields = [...this.classificationService.getAvailableMetadataFields()];
  }

  resetToDefaults(): void {
    this.classificationService.resetMetadataFieldsToDefaults();
    this.metadataFields = [...this.classificationService.getAvailableMetadataFields()];
  }
}
