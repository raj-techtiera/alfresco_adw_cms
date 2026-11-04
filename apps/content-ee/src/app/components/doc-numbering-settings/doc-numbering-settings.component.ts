import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

type DocNumberingTab = 'disciplines' | 'deliverable-types' | 'area-codes' | 'section-codes' | 'numbering-scheme';
type SchemeStandard = 'general' | 'epc' | 'iso' | 'custom';

interface TabDef {
  key: DocNumberingTab;
  label: string;
  icon: string;
}

interface SchemeDef {
  key: SchemeStandard;
  title: string;
  desc: string;
  example: string;
}

interface Token {
  id: string;
  label: string;
  type: 'token' | 'separator';
}

@Component({
  selector: 'acs-doc-numbering-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './doc-numbering-settings.component.html',
  styleUrl: './doc-numbering-settings.component.scss'
})
export class DocNumberingSettingsComponent {
  readonly tabs: TabDef[] = [
    { key: 'disciplines', label: 'Disciplines', icon: '📐' },
    { key: 'deliverable-types', label: 'Deliverable Types', icon: '📋' },
    { key: 'area-codes', label: 'Area Codes', icon: '📍' },
    { key: 'section-codes', label: 'Section Codes', icon: '🔢' },
    { key: 'numbering-scheme', label: 'Numbering Scheme', icon: '⚙️' }
  ];

  activeTab: DocNumberingTab = 'disciplines';

  // Modal visibility per tab
  showDisciplineModal = false;
  showTypeModal = false;
  showAreaModal = false;
  showSectionModal = false;

  readonly disciplineFilterOptions = ['All Disciplines'];
  readonly projectFilterOptions = ['All Projects'];
  readonly applyProjectOptions = ['ECE-020 — name'];
  readonly disciplineOptions: string[] = [];
  readonly projectOptions: string[] = [];
  readonly sectionProjectOptions: string[] = [];

  // Filters
  typeDisciplineFilter = 'All Disciplines';
  sectionCodesProjectFilter = 'All Projects';
  applyToProject = 'ECE-020 — name';

  // Disciplines form
  discCode = '';
  discColor = '#6B7280';
  discName = '';
  discDescription = '';

  // Deliverable types form
  typeDiscipline = '';
  typeCode = '';
  typeName = '';
  typeDescription = '';

  // Area codes form
  areaCode = '';
  areaProject = '';
  areaName = '';
  areaDescription = '';

  // Section codes form
  sectionCode = '';
  sectionName = '';
  sectionDescription = '';
  sectionProject = '';

  // Numbering scheme
  selectedStandard: SchemeStandard = 'general';
  schemeDiscipline = 'CIV';
  schemeDocType = 'DWG';
  schemeArea = 'A01';
  schemeSection = '100';

  readonly standards: SchemeDef[] = [
    { key: 'general', title: 'General', desc: 'Project – Discipline – Doc Type – Sequence', example: 'GEN-CIV-DWG-001' },
    { key: 'epc', title: 'EPC Standard', desc: 'Project – Discipline – Type – Area – Sequence', example: 'GEN-CIV-DWG-A01-001' },
    { key: 'iso', title: 'ISO 19650', desc: 'ISO 19650-2 compliant format', example: 'GEN-ORG-ZZ-00-DR-C-0001' },
    { key: 'custom', title: 'Custom', desc: 'Define your own token sequence', example: '–' }
  ];

  readonly addTokenButtons: string[] = [
    '+ Project Code', '+ Discipline', '+ Doc Type', '+ Area Code',
    '+ Section', '+ Sequence No.', '+ Year', '+ Free Text', '+ Separator'
  ];

  tokens: Token[] = [
    { id: '1', label: 'Project Code', type: 'token' },
    { id: '2', label: '-', type: 'separator' },
    { id: '3', label: 'Discipline', type: 'token' },
    { id: '4', label: '-', type: 'separator' },
    { id: '5', label: 'Doc Type', type: 'token' },
    { id: '6', label: '-', type: 'separator' },
    { id: '7', label: 'Sequence No.', type: 'token' }
  ];

  get livePreview(): string {
    return `ECE-020-${this.schemeDiscipline}-${this.schemeDocType}-001`;
  }

  setTab(key: DocNumberingTab): void {
    this.activeTab = key;
  }

  removeToken(id: string): void {
    this.tokens = this.tokens.filter((t) => t.id !== id);
  }

  addTokenFromButton(btn: string): void {
    const label = btn.replace('+ ', '');
    const type: 'token' | 'separator' = label === 'Separator' ? 'separator' : 'token';
    this.tokens = [...this.tokens, { id: Date.now().toString(), label: label === 'Separator' ? '-' : label, type }];
  }

  trackByKey(_index: number, item: TabDef): string {
    return item.key;
  }

  trackByStandard(_index: number, item: SchemeDef): string {
    return item.key;
  }

  trackByToken(_index: number, item: Token): string {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }
}
