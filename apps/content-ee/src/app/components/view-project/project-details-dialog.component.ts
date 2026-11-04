/*
 * Copyright © 2005-2025 Hyland Software, Inc.
 */

import { Component, OnInit, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AlfrescoService, LoadedDistributionMatrix } from '../../alfresco.service';
import {
  DetailTab,
  GroupPermissionRows,
  MatrixSection,
  ProjectDetailRow,
  ProjectDetailSection,
  ProjectDetailsDialogData,
  SearchEntry
} from '../../interface/programPortfolio';

/** Friendly labels for program fields after the Alfresco prefix is removed. */
const PROGRAM_LABELS: Record<string, string> = {
  programname: 'Program name',
  programcode: 'Program code',
  programdescription: 'Program description',
  programcatagory: 'Program category',
  programcategory: 'Program category',
  programtype: 'Program type',
  programstatus: 'Program status',
  programcustomer: 'Program customer',
  requestingunit: 'Requesting unit',
  businessunit: 'Business unit',
  programowner: 'Program owner',
  programmanager: 'Program manager',
  owningorganization: 'Owning organization',
  saereference: 'SAE reference',
  shaereference: 'SHAE reference',
  halreference: 'HAL reference',
  plannedstartdate: 'Planned start date',
  plannedenddate: 'Planned end date',
  actualstartdate: 'Actual start date',
  actualenddate: 'Actual end date',
  scmrequired: 'SCM required',
  dvirequired: 'DVI required',
  engineeringrequired: 'Engineering required',
  manufacturingrequired: 'Manufacturing required',
  qualityrequired: 'Quality required',
  industrializationrequired: 'Industrialization required',
  i1required: 'I1 required',
  i2required: 'I2 required',
  i3required: 'I3 required',
  quaapprovalrequired: 'QUA approval required',
  saequalityapprovalrequired: 'SAE quality approval required',
  dvicategory: 'DVI category',
  dvinumberprefix: 'DVI number prefix',
  createdat: 'Created at',
  createdby: 'Created by',
  modifiedat: 'Modified at',
  modifiedby: 'Modified by'
};

/** Tabs shown in this order, only if the program has at least one matching field. */
const SECTION_DEFS: ReadonlyArray<{ title: string; icon: string; keys: string[] }> = [
  {
    title: 'Program identity',
    icon: 'apartment',
    keys: ['programname', 'programcode', 'programdescription', 'programcatagory', 'programcategory', 'programtype', 'programstatus']
  },
  {
    title: 'Organization',
    icon: 'business_center',
    keys: ['requestingunit', 'businessunit', 'programowner', 'programmanager', 'owningorganization', 'department']
  },
  {
    title: 'Customer & references',
    icon: 'badge',
    keys: ['programcustomer', 'saereference', 'shaereference', 'halreference']
  },
  {
    title: 'Timeline',
    icon: 'schedule',
    keys: ['plannedstartdate', 'plannedenddate', 'actualstartdate', 'actualenddate']
  },
  {
    title: 'Function requirements',
    icon: 'tune',
    keys: ['scmrequired', 'dvirequired', 'engineeringrequired', 'manufacturingrequired', 'qualityrequired']
  },
  {
    title: 'DVI & approvals',
    icon: 'verified_user',
    keys: [
      'i1required',
      'i2required',
      'i3required',
      'quaapprovalrequired',
      'saequalityapprovalrequired',
      'industrializationrequired',
      'dvicategory',
      'dvinumberprefix'
    ]
  }
];

/** Fields that belong in the dialog but should not appear as detail rows. */
const SKIP_KEYS = new Set([
  'id',
  'rawentry',
  'image',
  'imageref',
  'imagereference',
  'programgroups',
  'projectgroups',
  'matrixdata',
  'projectgeolocation',
  'geolocation',
  'latitude',
  'longitude',
  'nodetype',
  'isfile',
  'isfolder',
  'parentid',
  'aspectnames',
  'allowableoperations',
  'content',
  'path',
  'localization'
]);

const AUDIT_KEYS = new Set(['createdat', 'createdby', 'modifiedat', 'modifiedby', 'name']);

const FUNCTION_MATRICES: Array<[string, string]> = [
  ['scmMatrix', 'SCM'],
  ['engineeringMatrix', 'Engineering'],
  ['manufacturingMatrix', 'Manufacturing'],
  ['qualityMatrix', 'Quality']
];

const LOADED_FUNCTION_MATRICES: Array<[string, string]> = [
  ['scmrequired', 'SCM'],
  ['engineeringrequired', 'Engineering'],
  ['manufacturingrequired', 'Manufacturing'],
  ['qualityrequired', 'Quality']
];

@Component({
  standalone: true,
  selector: 'adw-project-details-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './project-details-dialog.component.html',
  styleUrl: './project-details-dialog.component.scss'
})
export class ProjectDetailsDialogComponent implements OnInit {
  private readonly data = inject<ProjectDetailsDialogData>(MAT_DIALOG_DATA);
  private readonly alfrescoService = inject(AlfrescoService);

  displayTitle = 'Program';
  statusBadge: string | null = null;
  typeBadge: string | null = null;
  customerBadge: string | null = null;
  aboutText: string | null = null;
  sections: ProjectDetailSection[] = [];
  groupPermissionRows: GroupPermissionRows[] = [];
  matrixSections: MatrixSection[] = [];
  tabs: DetailTab[] = [];
  activeTabId = '';

  ngOnInit(): void {
    void this.loadProgramDetails();
  }

  get activeSection(): ProjectDetailSection | null {
    for (const section of this.sections) {
      if (this.toTabId(section.title) === this.activeTabId) {
        return section;
      }
    }
    return null;
  }

  get isGroupsTabActive(): boolean {
    return this.activeTabId === '__groups__';
  }

  get isMatrixTabActive(): boolean {
    return this.activeTabId === '__matrix__';
  }

  selectTab(tabId: string): void {
    this.activeTabId = tabId;
  }

  private async loadProgramDetails(): Promise<void> {
    const project = this.data?.project ?? {};
    const entry = this.toSearchEntry(project['rawEntry']);
    const properties = this.getProperties(entry);

    this.setHeader(project, entry, properties);
    this.groupPermissionRows = this.readGroupPermissions(
      this.findProperty(properties, ['programgroups', 'projectgroups'])
    );
    this.matrixSections = await this.loadMatrixSections(project, properties);
    this.sections = this.buildSections(entry, properties);
    this.tabs = this.buildTabs();
    this.activeTabId = this.tabs[0]?.id ?? '';
  }

  private async loadMatrixSections(
    project: Record<string, unknown>,
    properties: Record<string, unknown>
  ): Promise<MatrixSection[]> {
    const fromProperties = this.readMatrix(this.findProperty(properties, ['matrixdata']));
    const projectId = String(project['id'] ?? '').trim();
    if (!projectId) {
      return fromProperties;
    }

    try {
      const loaded = await this.alfrescoService.loadDistributionMatrix(projectId);
      const fromFile = this.matrixFromLoaded(loaded);
      return fromFile.length > 0 ? fromFile : fromProperties;
    } catch {
      return fromProperties;
    }
  }

  private matrixFromLoaded(loaded: LoadedDistributionMatrix): MatrixSection[] {
    const sections: MatrixSection[] = [];
    if (loaded.dviRows.length > 0) {
      sections.push({
        title: 'DVI matrix',
        columns: ['Approval', 'Group'],
        rows: loaded.dviRows.map((row) => [row.dviValue, row.groupName || row.groupId])
      });
    }
    for (const [key, title] of LOADED_FUNCTION_MATRICES) {
      const list = loaded.functionRows[key] || [];
      if (!list.length) {
        continue;
      }
      sections.push({
        title: `${title} matrix`,
        columns: ['Discipline', 'Reviewer group', 'Approver group'],
        rows: list.map((row) => [
          row.discipline,
          row.reviewerGroupName || row.reviewerGroupId,
          row.approverGroupName || row.approverGroupId
        ])
      });
    }
    return sections;
  }

  private getProperties(entry: SearchEntry): Record<string, unknown> {
    if (entry.properties && Object.keys(entry.properties).length > 0) {
      return entry.properties;
    }
    return {};
  }

  private setHeader(
    project: Record<string, unknown>,
    entry: SearchEntry,
    properties: Record<string, unknown>
  ): void {
    const titleFromProperties = this.getText(properties, ['shaedms:programname', 'programname']);
    const titleFromProject = typeof project['title'] === 'string' ? project['title'].trim() : '';

    this.displayTitle = titleFromProperties || titleFromProject || entry.name || 'Program';
    this.statusBadge = this.getText(properties, [
      'shaedms:program_status',
      'shaedms:programstatus',
      'programstatus'
    ]);
    this.typeBadge = this.getText(properties, [
      'shaedms:program_type',
      'shaedms:programtype',
      'programtype'
    ]);
    this.customerBadge = this.getText(properties, ['shaedms:programcustomer', 'programcustomer']);
    this.aboutText = this.getText(properties, [
      'shaedms:programdescription',
      'programdescription',
      'cm:description'
    ]);
  }

  private buildTabs(): DetailTab[] {
    const tabs: DetailTab[] = [];

    for (const section of this.sections) {
      tabs.push({
        id: this.toTabId(section.title),
        title: section.title,
        icon: section.icon
      });
    }

    if (this.groupPermissionRows.length > 0) {
      tabs.push({ id: '__groups__', title: 'Group permission', icon: 'group' });
    }

    if (this.matrixSections.length > 0) {
      tabs.push({ id: '__matrix__', title: 'Governance', icon: 'account_tree' });
    }

    return tabs;
  }

  private buildSections(entry: SearchEntry, properties: Record<string, unknown>): ProjectDetailSection[] {
    const rows = this.collectRows(entry, properties);
    const placed = new Set<ProjectDetailRow>();
    const sections: ProjectDetailSection[] = [];

    for (const def of SECTION_DEFS) {
      const sectionRows: ProjectDetailRow[] = [];
      for (const row of rows) {
        if (def.keys.includes(this.cleanKey(row.key))) {
          sectionRows.push(row);
          placed.add(row);
        }
      }
      if (sectionRows.length > 0) {
        sections.push({ title: def.title, icon: def.icon, rows: sectionRows });
      }
    }

    const auditRows: ProjectDetailRow[] = [];
    for (const row of rows) {
      if (AUDIT_KEYS.has(this.cleanKey(row.key))) {
        auditRows.push(row);
        placed.add(row);
      }
    }
    if (auditRows.length > 0) {
      sections.push({ title: 'Audit', icon: 'history', rows: auditRows });
    }

    const otherRows: ProjectDetailRow[] = [];
    for (const row of rows) {
      if (!placed.has(row)) {
        otherRows.push(row);
      }
    }
    if (otherRows.length > 0) {
      sections.push({ title: 'Other details', icon: 'description', rows: otherRows });
    }

    return sections;
  }

  private collectRows(entry: SearchEntry, properties: Record<string, unknown>): ProjectDetailRow[] {
    const source: Record<string, unknown> = { ...properties };

    if (entry.name) {
      source['name'] = entry.name;
    }
    if (entry.createdAt) {
      source['createdAt'] = entry.createdAt;
    }
    if (entry.createdByUser?.displayName) {
      source['createdBy'] = entry.createdByUser.displayName;
    }
    if (entry.modifiedAt) {
      source['modifiedAt'] = entry.modifiedAt;
    }
    if (entry.modifiedByUser?.displayName) {
      source['modifiedBy'] = entry.modifiedByUser.displayName;
    }

    const uniqueRows = new Map<string, ProjectDetailRow>();

    for (const [key, rawValue] of Object.entries(source)) {
      const cleanedKey = this.cleanKey(key);
      if (SKIP_KEYS.has(cleanedKey) || this.isEmpty(rawValue)) {
        continue;
      }

      const value = this.formatValue(key, rawValue);
      if (!value) {
        continue;
      }

      const row: ProjectDetailRow = {
        key,
        label: this.formatLabel(key),
        value,
        multiline: value.includes('\n')
      };

      // Prefer Alfresco names like shaedms:programName over a plain duplicate.
      const alreadySeen = uniqueRows.has(cleanedKey);
      if (!alreadySeen || key.includes(':')) {
        uniqueRows.set(cleanedKey, row);
      }
    }

    return [...uniqueRows.values()];
  }

  private readGroupPermissions(raw: unknown): GroupPermissionRows[] {
    const parsed = this.parseJson(raw);
    const groups = this.getGroupList(parsed);
    if (!groups) {
      return [];
    }

    const rows: GroupPermissionRows[] = [];
    for (const item of groups) {
      const group = this.toObject(item);
      const name = String(group['name'] ?? group['groupId'] ?? group['groupName'] ?? '').trim();
      const role = String(group['role'] ?? group['permission'] ?? '').trim();
      if (name || role) {
        rows.push({ name, role });
      }
    }
    return rows;
  }

  private getGroupList(parsed: unknown): unknown[] | null {
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      const groups = (parsed as Record<string, unknown>)['groups'];
      return Array.isArray(groups) ? groups : null;
    }
    return null;
  }

  private readMatrix(raw: unknown): MatrixSection[] {
    const parsed = this.parseJson(raw);
    if (!parsed) {
      return [];
    }

    if (Array.isArray(parsed)) {
      const rows = this.readFunctionMatrixRows(parsed, true);
      if (rows.length === 0) {
        return [];
      }
      return [
        {
          title: 'Governance',
          columns: ['Item', 'Reviewer group', 'Approver group'],
          rows
        }
      ];
    }

    if (typeof parsed !== 'object') {
      return [];
    }

    const data = parsed as Record<string, unknown>;
    const sections: MatrixSection[] = [];

    const dviRows = this.readDviRows(data['dviMatrix']);
    if (dviRows.length > 0) {
      sections.push({ title: 'DVI matrix', columns: ['Approval', 'Group'], rows: dviRows });
    }

    for (const [key, title] of FUNCTION_MATRICES) {
      const list = data[key];
      if (!Array.isArray(list) || list.length === 0) {
        continue;
      }
      const rows = this.readFunctionMatrixRows(list, false);
      if (rows.length > 0) {
        sections.push({
          title: `${title} matrix`,
          columns: ['Discipline', 'Reviewer group', 'Approver group'],
          rows
        });
      }
    }

    return sections;
  }

  private readDviRows(dvi: unknown): string[][] {
    if (!dvi || typeof dvi !== 'object' || Array.isArray(dvi)) {
      return [];
    }

    const rows: string[][] = [];
    for (const [label, value] of Object.entries(dvi as Record<string, unknown>)) {
      const text = String(value ?? '').trim();
      if (text) {
        rows.push([label, text]);
      }
    }
    return rows;
  }

  private readFunctionMatrixRows(list: unknown[], allowItemAliases: boolean): string[][] {
    const rows: string[][] = [];
    for (const item of list) {
      const row = this.toObject(item);
      const first = allowItemAliases
        ? String(row['facility'] ?? row['asset'] ?? row['discipline'] ?? '').trim()
        : String(row['discipline'] ?? '').trim();
      const reviewer = String(row['reviewerGroup'] ?? '').trim();
      const approver = String(row['approverGroup'] ?? '').trim();
      if (first || reviewer || approver) {
        rows.push([first, reviewer, approver]);
      }
    }
    return rows;
  }

  private parseJson(raw: unknown): unknown {
    if (raw == null || raw === '') {
      return null;
    }

    let parsed: unknown = raw;
    if (typeof parsed !== 'string') {
      return parsed;
    }

    try {
      parsed = JSON.parse(parsed);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private getText(source: Record<string, unknown>, keys: string[]): string | null {
    const value = this.findProperty(source, keys);
    if (value == null) {
      return null;
    }
    const text = String(value).trim();
    return text || null;
  }

  private findProperty(source: Record<string, unknown>, keys: string[]): unknown {
    const wanted = keys.map((key) => this.cleanKey(key));
    for (const [key, value] of Object.entries(source)) {
      if (wanted.includes(this.cleanKey(key)) && !this.isEmpty(value)) {
        return value;
      }
    }
    return undefined;
  }

  private formatLabel(key: string): string {
    const cleaned = this.cleanKey(key);
    if (PROGRAM_LABELS[cleaned]) {
      return PROGRAM_LABELS[cleaned];
    }

    const withoutPrefix = key.replace(/^[a-zA-Z0-9]+:/, '');
    const spaced = withoutPrefix
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .trim();

    if (!spaced) {
      return key;
    }
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  private formatValue(key: string, value: unknown): string {
    const cleaned = this.cleanKey(key);

    if (typeof value === 'boolean' || cleaned.endsWith('required')) {
      if (value === true || value === 'true') {
        return 'Yes';
      }
      if (value === false || value === 'false') {
        return 'No';
      }
    }

    if (cleaned === 'createdat' || cleaned === 'modifiedat') {
      return this.formatDate(value, true) || String(value);
    }

    if (cleaned.endsWith('date')) {
      return this.formatDate(value, false) || String(value);
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return '';
      }
    }

    return String(value).trim();
  }

  private formatDate(value: unknown, withTime: boolean): string | null {
    const date = this.parseDate(value);
    if (!date) {
      return null;
    }

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    };
    if (withTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Intl.DateTimeFormat(undefined, options).format(date);
  }

  private parseDate(value: unknown): Date | null {
    const text = String(value ?? '').trim();
    if (!text) {
      return null;
    }

    const date = new Date(text.replace(/([+-]\d{2})(\d{2})$/, '$1:$2'));
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return date;
  }

  private toSearchEntry(raw: unknown): SearchEntry {
    if (raw && typeof raw === 'object') {
      return raw as SearchEntry;
    }
    return {};
  }

  private toObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object') {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private isEmpty(value: unknown): boolean {
    if (value == null || value === '' || value === '—') {
      return true;
    }
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === 'object') {
      return Object.keys(value as object).length === 0;
    }
    return false;
  }

  private toTabId(title: string): string {
    return title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  /** Strip Alfresco prefixes and punctuation so shaedms:program_name matches programname. */
  private cleanKey(key: string): string {
    return key.replace(/^[a-zA-Z0-9]+:/, '').replace(/[_-]+/g, '').toLowerCase();
  }
}
