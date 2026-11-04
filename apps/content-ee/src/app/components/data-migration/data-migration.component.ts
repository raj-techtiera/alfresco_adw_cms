import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { StepDef, DataSource, TokenDef, ExportDataOption, TabDef, DataMigrationTab } from '../../interface/datamigration';

@Component({
  selector: 'acs-data-migration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-migration.component.html',
  styleUrl: './data-migration.component.scss'
})
export class DataMigrationComponent {
  readonly steps: StepDef[] = [
    { num: 1, label: 'Source' },
    { num: 2, label: 'Size & Approval' },
    { num: 3, label: 'Upload Data' },
    { num: 4, label: 'Preview & Map' },
    { num: 5, label: 'Settings' },
    { num: 6, label: 'Run' }
  ];

  readonly dataSources: DataSource[] = [
    { id: 'csv', icon: '📊', name: 'CSV + ZIP files', type: 'Direct import' },
    { id: 'bulk', icon: '📦', name: 'Bulk ZIP upload', type: 'Direct import' },
    { id: 'aconex', icon: '🔵', name: 'Aconex', type: 'Direct import' },
    { id: 'procore', icon: '🔨', name: 'Procore', type: 'Direct import' },
    { id: 'bim360', icon: '🏗️', name: 'BIM 360 / ACC', type: 'Direct import' },
    { id: 'projectwise', icon: '📐', name: 'ProjectWise', type: 'CSV/file based' },
    { id: 'sharepoint', icon: '☁️', name: 'SharePoint/OneDrive', type: 'CSV/file based' },
    { id: 'googledrive', icon: '🌐', name: 'Google Drive', type: 'CSV/file based' },
    { id: 'newforma', icon: '📋', name: 'Newforma', type: 'CSV/file based' },
    { id: 'excel', icon: '📊', name: 'Excel MDR', type: 'CSV/file based' },
    { id: 'other', icon: '🚛', name: 'Other / Manual', type: 'Manual upload' }
  ];

  readonly tokens: TokenDef[] = [
    { key: '{PROJECT}', example: 'TWOR' },
    { key: '{DISCIPLINE}', example: 'C' },
    { key: '{TYPE}', example: 'DWG' },
    { key: '{AREA}', example: 'EWE305' },
    { key: '{SEQ}', example: '001' },
    { key: '{YEAR}', example: '2026' },
    { key: '{REV}', example: 'A' },
    { key: '{CLIENT}', example: 'ADNOC' },
    { key: '{CUSTOM1}', example: 'INFRA' },
    { key: '{CUSTOM2}', example: 'PKG1' }
  ];

  readonly exportPolicy: string[] = [
    'All export requests are reviewed by platform admin',
    'Exports < 1TB: Free (with approval)',
    'Exports > 1TB: $1 per GB above 1TB (billed before download)',
    'Download links expire in 24 hours',
    'All exports are logged and audited',
    'Exported files include watermark with your organization name and export date'
  ];

  readonly exportDataOptions: ExportDataOption[] = [
    { id: 'documents', icon: '📄', label: 'Documents' },
    { id: 'transmittals', icon: '📨', label: 'Transmittals' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'raid', icon: '⚠️', label: 'RAID Log' },
    { id: 'punch', icon: '✅', label: 'Punch List' }
  ];

  readonly tabs: TabDef[] = [
    { key: 'import', icon: '📥', label: 'Import' },
    { key: 'jobs', icon: '📋', label: 'Jobs' },
    { key: 'numbering', icon: '🔢', label: 'Numbering' },
    { key: 'export', icon: '📤', label: 'Export Request' }
  ];

  activeTab: DataMigrationTab = 'import';
  currentStep = 1;
  selectedSource: string | null = null;

  // Numbering state
  selectedTokens: string[] = [];
  formatName = '';
  separator = '-';
  scope = 'Company-wide';

  // Export state
  exportReason = '';
  exportData: string[] = ['documents'];
  estimatedSize = '';

  get currentStepLabel(): string {
    return this.steps[this.currentStep - 1]?.label ?? '';
  }

  setTab(tab: DataMigrationTab): void {
    this.activeTab = tab;
  }

  goBack(): void {
    this.currentStep = Math.max(1, this.currentStep - 1);
  }

  goNext(): void {
    this.currentStep = Math.min(6, this.currentStep + 1);
  }

  toggleToken(token: string): void {
    this.selectedTokens = this.selectedTokens.includes(token)
      ? this.selectedTokens.filter((t) => t !== token)
      : [...this.selectedTokens, token];
  }

  toggleExportData(id: string): void {
    this.exportData = this.exportData.includes(id)
      ? this.exportData.filter((d) => d !== id)
      : [...this.exportData, id];
  }

  trackByKey(_index: number, item: TabDef): string {
    return item.key;
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  trackByToken(_index: number, item: TokenDef): string {
    return item.key;
  }

  trackByNum(_index: number, item: StepDef): number {
    return item.num;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
