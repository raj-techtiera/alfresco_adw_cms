import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { firstValueFrom } from 'rxjs';
import { AlfrescoService } from '../../../alfresco.service';
import { environment } from '../../../../environments/environment';
import {
  BusinessUnitPropertiesDialogComponent,
  BusinessUnitPropertyRow
} from '../business-unit-properties-dialog/business-unit-properties-dialog.component';
import { CreateBusinessUnitDialogComponent } from '../create-business-unit-dialog/create-business-unit-dialog.component';

/** Business unit row from Alfresco children + properties. */
export interface BusinessUnitProject  {
  id: string;
  title: string;
  code: string;
  status: string;
  description: string;
  contractType: string;
  industryType: string;
  budgetAmount: string;
  projectType: string;
  projectScope: string;
  client: string;
  createdBy: string;
  modifiedBy: string;
  createdAt: string | null;
  modifiedAt: string | null;
  nodeType: string;
  properties: Record<string, unknown>;
}

type SortOption = 'created-desc' | 'created-asc' | 'name-asc' | 'name-desc';

@Component({
  selector: 'acs-business-units',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatPaginatorModule
  ],
  templateUrl: './business-units.component.html',
  styleUrl: './business-units.component.scss'
})
export class BusinessUnitsComponent implements OnInit {
  private readonly alfresco = inject(AlfrescoService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly parentNodeId = environment.businessUnitsParentNodeId;

  projects: BusinessUnitProject[] = [];
  loading = false;
  loadError: string | null = null;
  search = '';
  sortOption: SortOption = 'created-desc';
  pageSizeOptions: number[] = [12, 20, 40, 80];
  pageSize = 20;
  pageIndex = 0;
  totalHits = 0;

  ngOnInit(): void {
    void this.loadProjects();
  }

  get totalItems(): number {
    return this.totalHits;
  }

  get filteredProjects(): BusinessUnitProject[] {
    const q = this.search.trim().toLowerCase();
    if (!q) {
      return this.projects;
    }
    return this.projects.filter((p) => {
      const hay = [
        p.title,
        p.code,
        p.status,
        p.description,
        p.contractType,
        p.industryType,
        p.projectType,
        p.projectScope,
        p.client,
        p.createdBy
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }

  async loadProjects(): Promise<void> {
    this.loading = true;
    this.loadError = null;
    const maxItems = this.pageSize;
    const skipCount = maxItems * this.pageIndex;
    try {
      const response: any = await firstValueFrom(
        this.alfresco.getNodes(this.parentNodeId, {
          include: 'properties',
          maxItems,
          skipCount,
          orderBy: this.toChildrenOrderBy(this.sortOption)
        })
      );
      const entries = response?.list?.entries ?? [];
      this.totalHits = Number(response?.list?.pagination?.totalItems ?? entries.length) || 0;
      this.projects = entries
        .map((row: any) => this.mapEntry(row?.entry))
        .filter((p: BusinessUnitProject | null): p is BusinessUnitProject => p != null);
    } catch {
      this.projects = [];
      this.totalHits = 0;
      this.loadError = 'Unable to load business units.';
    } finally {
      this.loading = false;
    }
  }

  onSortOptionChange(): void {
    this.pageIndex = 0;
    void this.loadProjects();
  }

  clearSearch(): void {
    this.search = '';
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    void this.loadProjects();
  }

  goToProject(projectId: string): void {
    if (!projectId) {
      return;
    }
    localStorage.setItem('bU-route', 'false');
    localStorage.setItem('bU-node-id', projectId);
    void this.router.navigate(['/projects', projectId]);
  }

  openCreateBusiness(): void {
    const ref = this.dialog.open(CreateBusinessUnitDialogComponent, {
      width: 'min(880px, calc(100vw - 32px))',
      maxWidth: '880px',
      maxHeight: 'min(900px, calc(100vh - 24px))',
      autoFocus: 'dialog',
      panelClass: 'adw-create-business-unit-dialog-panel'
    });
    ref.afterClosed().subscribe((created) => {
      if (created) {
        this.pageIndex = 0;
        void this.loadProjects();
      }
    });
  }

  openProperties(project: BusinessUnitProject, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    this.dialog.open(BusinessUnitPropertiesDialogComponent, {
      data: {
        title: project.title,
        nodeId: project.id,
        nodeType: project.nodeType,
        createdAt: project.createdAt,
        modifiedAt: project.modifiedAt,
        createdBy: project.createdBy,
        modifiedBy: project.modifiedBy,
        rows: this.toPropertyRows(project.properties),
        properties: project.properties
      },
      width: 'min(920px, calc(100vw - 32px))',
      maxWidth: '920px',
      height: 'auto',
      maxHeight: 'min(780px, calc(100vh - 32px))',
      autoFocus: 'dialog',
      panelClass: 'adw-business-unit-properties-dialog-panel'
    });
  }

  projectTypeIcon(project: BusinessUnitProject): string {
    const t = (project.projectType || project.industryType || '').toLowerCase();
    if (t.includes('offshore') || t.includes('platform')) {
      return 'waves';
    }
    if (t.includes('onshore') || t.includes('facility')) {
      return 'domain';
    }
    if (t.includes('pipeline')) {
      return 'alt_route';
    }
    return 'precision_manufacturing';
  }

  projectCardAccent(project: BusinessUnitProject): string {
    const scope = (project.projectScope || project.status || '').toUpperCase();
    if (scope.includes('FEED') || scope.includes('ACTIVE')) {
      return 'purple';
    }
    if (scope.includes('EPC') || scope.includes('FULL')) {
      return 'blue';
    }
    if (scope.includes('IFC')) {
      return 'green';
    }
    const type = (project.projectType || project.industryType || '').toLowerCase();
    if (type.includes('offshore') || type.includes('platform')) {
      return 'orange';
    }
    return 'blue';
  }

  scopeLabel(project: BusinessUnitProject): string {
    const scope = (project.projectScope || project.status || '').trim();
    if (!scope || scope.toUpperCase() === 'N/A') {
      return '';
    }
    return scope.toUpperCase();
  }

  initials(name: string | undefined): string {
    if (!name?.trim()) {
      return '—';
    }
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  trackById(_index: number, project: BusinessUnitProject): string {
    return project.id;
  }

  private toChildrenOrderBy(sort: SortOption): string {
    switch (sort) {
      case 'created-asc':
        return 'createdAt ASC';
      case 'name-asc':
        return 'name ASC';
      case 'name-desc':
        return 'name DESC';
      case 'created-desc':
      default:
        return 'createdAt DESC';
    }
  }

  private mapEntry(entry: any): BusinessUnitProject | null {
    if (!entry?.id) {
      return null;
    }
    if (entry.isFile === true) {
      return null;
    }
    const props = (entry.properties || {}) as Record<string, unknown>;
    const buName = this.strProp(props, ['edms:business_unit_name', 'cm:title']);
    return {
      id: String(entry.id),
      title: buName || entry.name || '—',
      code: this.strProp(props, ['edms:business_unit_code']),
      status: this.strProp(props, ['edms:business_unit_status']),
      description: this.strProp(props, [
        'edms:businessunit_description',
        'edms:business_unit_description',
        'cm:description'
      ]),
      contractType: this.strProp(props, ['edms:contract_type']),
      industryType: this.strProp(props, ['edms:industry_type']),
      budgetAmount: this.formatPropertyValue('edms:budget_amount', props['edms:budget_amount']),
      projectType:
        this.strProp(props, [
          'edms:projectType',
          'edms:project_type',
          'tt:projectType',
          'tt:project_type'
        ]) || 'Project',
      projectScope:
        this.strProp(props, [
          'edms:projectScope',
          'edms:project_scope',
          'tt:projectScope',
          'tt:project_scope',
          'projectscope'
        ]) || '',
      client:
        this.normalizeClient(
          this.strProp(props, [
            'edms:project_client',
            'tt:project_client',
            'tt:client',
            'client'
          ])
        ) || 'PTTEP',
      createdBy: entry.createdByUser?.displayName || '',
      modifiedBy: entry.modifiedByUser?.displayName || entry.createdByUser?.displayName || '',
      createdAt: entry.createdAt || null,
      modifiedAt: entry.modifiedAt || null,
      nodeType: entry.nodeType || '',
      properties: props
    };
  }

  private toPropertyRows(properties: Record<string, unknown>): BusinessUnitPropertyRow[] {
    return Object.entries(properties || {})
      .map(([key, value]) => ({
        key,
        label: this.formatPropertyLabel(key),
        value: this.formatPropertyValue(key, value)
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  }

  private formatPropertyLabel(key: string): string {
    const overrides: Record<string, string> = {
      'edms:budget_amount': 'Budget amount',
      'edms:business_unit_code': 'Business unit code',
      'edms:business_unit_name': 'Business unit name',
      'edms:business_unit_status': 'Business unit status',
      'edms:business_unit_groups': 'Business unit groups',
      'edms:businessunit_description': 'Description',
      'edms:business_unit_description': 'Description',
      'edms:contract_type': 'Contract type',
      'edms:industry_type': 'Industry type',
      'cm:title': 'Title',
      'cm:description': 'Description',
      'cm:name': 'Name'
    };
    if (overrides[key]) {
      return overrides[key];
    }

    const withoutNamespace = key.replace(/^[a-zA-Z0-9]+:/, '');
    const spaced = withoutNamespace
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();

    if (!spaced) {
      return key;
    }

    return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  }

  private formatPropertyValue(key: string, value: unknown): string {
    if (value == null || value === '') {
      return '—';
    }

    const norm = key.replace(/^[a-zA-Z0-9]+:/, '').replace(/[_-]+/g, '').toLowerCase();
    if (norm.includes('group')) {
      return typeof value === 'string' ? value : JSON.stringify(value);
    }

    if (norm.includes('budget') || norm.includes('amount')) {
      const num = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
      if (!Number.isNaN(num)) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.formatPropertyValue(key, v)).join(', ');
    }

    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private strProp(properties: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const v = properties[key];
      if (v != null && String(v).trim()) {
        return String(v).trim();
      }
    }
    return '';
  }

  private normalizeClient(value: string): string {
    const s = (value || '').trim();
    if (!s) {
      return '';
    }
    if (/^pttep$/i.test(s)) {
      return 'PTTEP';
    }
    return s;
  }
}
