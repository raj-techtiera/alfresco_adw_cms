import { Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import {
  SettingsService,
  WatermarkTemplate,
  WatermarkTemplateKind
} from '../../services/settings.service';

export interface SelectWatermarkDialogData {
  kind: WatermarkTemplateKind;
  fileName?: string;
}

export interface SelectWatermarkDialogResult {
  template: WatermarkTemplate;
}

@Component({
  selector: 'adw-select-watermark-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatRadioModule],
  templateUrl: './select-watermark-dialog.component.html',
  styleUrl: './select-watermark-dialog.component.scss'
})
export class SelectWatermarkDialogComponent {
  readonly data = inject<SelectWatermarkDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(
    MatDialogRef<SelectWatermarkDialogComponent, SelectWatermarkDialogResult | undefined>
  );
  private readonly settingsService = inject(SettingsService);

  readonly kind: WatermarkTemplateKind = this.data?.kind === 'image' ? 'image' : 'text';
  readonly title = this.kind === 'image' ? 'Select image watermark' : 'Select text watermark';
  templates: WatermarkTemplate[] = [];
  selectedId = '';
  loading = true;
  error: string | null = null;

  constructor() {
    void this.loadTemplates();
  }

  get selectedTemplate(): WatermarkTemplate | undefined {
    return this.templates.find((item) => item.id === this.selectedId);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  confirm(): void {
    const template = this.selectedTemplate;
    if (template) this.dialogRef.close({ template });
  }

  selectTemplate(template: WatermarkTemplate): void {
    this.selectedId = template.id;
  }

  displayName(item: WatermarkTemplate): string {
    return this.kind === 'image'
      ? item.templateDescription || item.name || 'Image watermark'
      : item.templateValue || item.name || 'Text watermark';
  }

  private async loadTemplates(): Promise<void> {
    this.loading = true;
    this.error = null;
    try {
      this.templates = await this.settingsService.listTemplates(this.kind);
      this.selectedId = this.templates[0]?.id ?? '';
    } catch {
      this.templates = [];
      this.error = `Unable to load ${this.kind} watermarks.`;
    } finally {
      this.loading = false;
    }
  }
}
