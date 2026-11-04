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
  selector: 'app-category-management-dialog',
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
      <mat-icon>tune</mat-icon>
      Manage Classification Categories
    </h2>

    <mat-dialog-content class="dialog-content">
      <p class="dialog-subtitle">
        These categories are used by AI classification and the manual category dropdown.
        Changes are saved automatically.
      </p>

      <div class="category-list">
        <div *ngFor="let category of categories" class="category-row">
          <mat-icon class="category-icon">label_outline</mat-icon>
          <span class="category-name">{{ category }}</span>
          <button
            mat-icon-button
            class="delete-btn"
            (click)="removeCategory(category)"
            matTooltip="Remove this category"
            [disabled]="categories.length <= 1">
            <mat-icon>delete_outline</mat-icon>
          </button>
        </div>
        <div *ngIf="categories.length === 0" class="empty-state">
          No categories defined. Add at least one below.
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="add-row">
        <mat-form-field appearance="outline" class="add-field">
          <mat-label>Add new category</mat-label>
          <mat-icon matPrefix>add_circle_outline</mat-icon>
          <input
            matInput
            [(ngModel)]="newCategoryName"
            (keydown.enter)="addCategory()"
            placeholder="e.g. Tax Document"
            autocomplete="off" />
          <mat-hint *ngIf="isDuplicate()">Category already exists</mat-hint>
        </mat-form-field>
        <button mat-flat-button color="primary" (click)="addCategory()" [disabled]="!newCategoryName.trim() || isDuplicate()">
          Add
        </button>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions class="dialog-actions">
      <button mat-button class="reset-btn" (click)="resetToDefaults()" matTooltip="Restore original set of categories">
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
        min-width: 380px;
        padding-top: 4px !important;
      }

      .dialog-subtitle {
        font-size: 13px;
        color: #64748b;
        margin: 0 0 16px 0;
        line-height: 1.5;
      }

      .category-list {
        max-height: 280px;
        overflow-y: auto;
        margin-bottom: 12px;
      }

      .category-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 4px;
        border-radius: 6px;
        transition: background 0.1s;
      }

      .category-row:hover {
        background: rgba(0, 0, 0, 0.04);
      }

      .category-row:hover .delete-btn {
        opacity: 1;
      }

      .category-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
        color: #94a3b8;
        flex-shrink: 0;
      }

      .category-name {
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
export class CategoryManagementDialogComponent {
  categories: string[];
  newCategoryName = '';

  constructor(private classificationService: ClassificationService) {
    this.categories = [...this.classificationService.getAvailableCategories()];
  }

  isDuplicate(): boolean {
    return this.categories.includes(this.newCategoryName.trim());
  }

  addCategory(): void {
    const trimmed = this.newCategoryName.trim();
    if (trimmed && !this.categories.includes(trimmed)) {
      this.classificationService.addCategory(trimmed);
      this.categories = [...this.classificationService.getAvailableCategories()];
      this.newCategoryName = '';
    }
  }

  removeCategory(name: string): void {
    this.classificationService.removeCategory(name);
    this.categories = [...this.classificationService.getAvailableCategories()];
  }

  resetToDefaults(): void {
    this.classificationService.resetToDefaults();
    this.categories = [...this.classificationService.getAvailableCategories()];
  }
}
