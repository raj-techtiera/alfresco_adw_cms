/*
 * Copyright © 2005-2025 Hyland Software, Inc.
 */

import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ProjectDetailsDialogComponent } from './project-details-dialog.component';
import { environment } from '../../../environments/environment';
import { AlfrescoNode, AlfrescoService } from '../../alfresco.service';
import { ProgramCard } from '../../interface/programPortfolio';

type ProgramSortOption = 'created-desc' | 'created-asc' | 'name-asc' | 'name-desc';
type ProgramFilterKey = 'type' | 'status' | 'category';

interface ProgramFilterField {
  key: ProgramFilterKey;
  label: string;
  placeholder: string;
  allLabel: string;
  options: readonly string[];
}

interface SearchNode extends AlfrescoNode {
  createdAt?: string;
  createdByUser?: { displayName?: string };
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatPaginatorModule,
    MatIconModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  selector: 'adw-dashboard-home',
  templateUrl: './view-project.component.html',
  styleUrl: './view-project.component.scss',
  host: { class: 'adw-create-project' },
  encapsulation: ViewEncapsulation.Emulated
})
export class ViewProjectComponent implements OnInit {
  constructor(
    private alfrescoService: AlfrescoService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  search = '';
  private appliedSearch = '';
  loading = false;

  projects: ProgramCard[] = [];
  filteredProjects: ProgramCard[] = [];

  readonly filter: Record<ProgramFilterKey, string> = {
    type: '',
    status: '',
    category: ''
  };
  private readonly appliedFilter: Record<ProgramFilterKey, string> = {
    type: '',
    status: '',
    category: ''
  };

  viewMode: 'grid' | 'list' = 'grid';
  sortOption: ProgramSortOption = 'created-desc';
  readonly sortOptions: ReadonlyArray<{ value: ProgramSortOption; label: string }> = [
    { value: 'name-asc', label: 'Name (A–Z)' },
    { value: 'name-desc', label: 'Name (Z–A)' },
    { value: 'created-desc', label: 'Newest created' },
    { value: 'created-asc', label: 'Oldest created' }
  ];

  pageSizeOptions = [12, 20, 40, 80];
  pageSize = 20;
  pageIndex = 0;
  totalHits = 0;

  private readonly projectImages = [
    'https://img.rocket.new/generatedImages/rocket_gen_img_1babfb90a.png',
    'https://img.rocket.new/generatedImages/rocket_gen_img_1eb58cecf.png',
    'https://img.rocket.new/generatedImages/rocket_gen_img_118c49cdf.png',
    'https://img.rocket.new/generatedImages/rocket_gen_img_1c4089061.png',
    'https://img.rocket.new/generatedImages/rocket_gen_img_1f7b00373.png'
  ];

  private readonly programsParentNodeId =
    environment.programsParentNodeId || '502cf3eb-f8ea-49cc-acf3-ebf8ea59cc0d';

  readonly programTypeOptions = [
    'Civil',
    'Electrical',
    'Mechanical',
    'Pipeline',
    'Instrumentation & Control',
    'Piping'
  ] as const;
  readonly programStatusOptions = ['Active', 'Draft', 'On Hold', 'Completed', 'Closed'] as const;
  readonly programCategoryOptions = ['New Program', 'Existing Program', 'Amendment', 'Upgrade'] as const;

  readonly filterFields: readonly ProgramFilterField[] = [
    {
      key: 'type',
      label: 'Program Type',
      placeholder: 'All types',
      allLabel: 'All types',
      options: this.programTypeOptions
    },
    {
      key: 'status',
      label: 'Program Status',
      placeholder: 'All statuses',
      allLabel: 'All statuses',
      options: this.programStatusOptions
    },
    {
      key: 'category',
      label: 'Program Category',
      placeholder: 'All categories',
      allLabel: 'All categories',
      options: this.programCategoryOptions
    }
  ];

  get totalItems(): number {
    return this.totalHits;
  }

  get appliedSearchActive(): boolean {
    return !!this.appliedSearch.trim();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.appliedSearch.trim() ||
      this.search.trim() ||
      this.filter.type ||
      this.filter.status ||
      this.filter.category ||
      this.appliedFilter.type ||
      this.appliedFilter.status ||
      this.appliedFilter.category
    );
  }

  ngOnInit(): void {
    this.loadProjects();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.loadProjects();
    });
  }

  loadProjects(): void {
    this.loading = true;
    this.alfrescoService
      .searchPrograms({
        parentId: this.programsParentNodeId.trim(),
        name: this.appliedSearch,
        programType: this.appliedFilter.type,
        programStatus: this.appliedFilter.status,
        programCategory: this.appliedFilter.category,
        sort: this.sortOption,
        maxItems: this.pageSize,
        skipCount: this.pageSize * this.pageIndex
      })
      .subscribe({
        next: ({ items, total }) => {
          this.totalHits = total;
          this.projects = items.map((entry, index) => this.mapSearchEntryToProject(entry, index));
          this.filteredProjects = [...this.projects];
          this.loading = false;
        },
        error: (error: unknown) => {
          console.error('Search API ERROR:', error);
          this.projects = [];
          this.filteredProjects = [];
          this.totalHits = 0;
          this.loading = false;
        }
      });
  }

  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  onSortOptionChange(): void {
    this.pageIndex = 0;
    this.loadProjects();
  }

  applyFilters(): void {
    this.appliedFilter.type = this.filter.type.trim();
    this.appliedFilter.status = this.filter.status.trim();
    this.appliedFilter.category = this.filter.category.trim();
    this.pageIndex = 0;
    this.loadProjects();
  }

  submitSearch(): void {
    this.appliedSearch = this.search.trim();
    this.pageIndex = 0;
    this.loadProjects();
  }

  clearSearch(): void {
    this.search = '';
    this.appliedSearch = '';
    this.pageIndex = 0;
    this.loadProjects();
  }

  clearFilters(): void {
    this.search = '';
    this.appliedSearch = '';
    this.filter.type = '';
    this.filter.status = '';
    this.filter.category = '';
    this.appliedFilter.type = '';
    this.appliedFilter.status = '';
    this.appliedFilter.category = '';
    this.pageIndex = 0;
    this.loadProjects();
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
    this.loadProjects();
  }

  goToCreateProject(): void {
    void this.router.navigate(['create-new-project']);
  }

  goToProject(projectId: string): void {
    if (!projectId) {
      return;
    }
    localStorage.setItem('bU-route', 'true');
    localStorage.removeItem('bU-node-id');
    void this.router.navigate(['/projects', projectId]);
  }

  openProjectDetails(project: ProgramCard): void {
    this.dialog.open(ProjectDetailsDialogComponent, {
      data: { project: project as unknown as Record<string, unknown> },
      width: 'calc(100vw - 24px)',
      height: 'calc(100vh - 24px)',
      maxWidth: '100vw',
      maxHeight: '100vh',
      autoFocus: 'dialog',
      panelClass: 'adw-project-details-dialog-panel'
    });
  }

  projectTypeIcon(project: Pick<ProgramCard, 'projectType'>): string {
    const type = (project.projectType || '').toLowerCase();
    if (type.includes('offshore') || type.includes('platform')) {
      return 'waves';
    }
    if (type.includes('onshore') || type.includes('facility')) {
      return 'domain';
    }
    if (type.includes('pipeline')) {
      return 'alt_route';
    }
    return 'precision_manufacturing';
  }

  projectCardAccent(project: Pick<ProgramCard, 'projectScope' | 'projectType'>): string {
    const scope = (project.projectScope || '').toUpperCase();
    if (scope.includes('FEED')) {
      return 'purple';
    }
    if (scope.includes('EPC') || scope.includes('FULL')) {
      return 'blue';
    }
    if (scope.includes('IFC')) {
      return 'green';
    }
    const type = (project.projectType || '').toLowerCase();
    if (type.includes('offshore') || type.includes('platform')) {
      return 'orange';
    }
    if (type.includes('vendor')) {
      return 'pink';
    }
    return 'blue';
  }

  scopeLabel(project: Pick<ProgramCard, 'projectScope'>): string {
    const scope = (project.projectScope || '').trim();
    return !scope || scope.toUpperCase() === 'N/A' ? '' : scope.toUpperCase();
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

  private mapSearchEntryToProject(entry: AlfrescoNode, index: number): ProgramCard {
    const props = (entry.properties || {}) as Record<string, unknown>;
    const node = entry as SearchNode;
    const status = this.pickProp(props, [
      'shaedms:program_status',
      'shaedms:programstatus',
      'programstatus'
    ]);

    return {
      id: entry.id,
      title: this.pickProp(props, ['shaedms:programname', 'programname']) || entry.name || '-',
      reference: this.pickProp(props, ['shaedms:programcode', 'programcode']) || entry.id,
      projectType:
        this.pickProp(props, ['shaedms:program_type', 'shaedms:programtype', 'programtype']) ||
        'Program',
      projectScope: status || 'N/A',
      projectDiscipline: this.pickProp(props, [
        'shaedms:program_catagory',
        'shaedms:programcatagory',
        'programcatagory'
      ]),
      projectDuration: '',
      client: this.pickProp(props, ['shaedms:programcustomer', 'programcustomer']) || '-',
      businessUnit: this.pickProp(props, ['shaedms:businessunit', 'businessunit']),
      estimatedBudget: '',
      plannedStartDate: this.pickDate(props, ['shaedms:plannedstartdate', 'plannedstartdate']),
      targetCompletionDate: this.pickDate(props, ['shaedms:plannedenddate', 'plannedenddate']),
      complianceStandards: '',
      businessJustification: '',
      defaultDaysExternalResponse: '',
      defaultDaysReviewComment: '',
      defaultDaysProjectResponse: '',
      shutdownStatus: status,
      createdAt: node.createdAt,
      createdBy: node.createdByUser?.displayName || '',
      modifiedAt: entry.modifiedAt,
      modifiedBy: entry.modifiedByUser?.displayName || '',
      image: this.projectImages[index % this.projectImages.length],
      projectGroups: this.pickProp(props, ['shaedms:programgroups', 'programgroups']),
      rawEntry: entry
    };
  }

  private pickProp(props: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = props[key];
      if (value != null && String(value).trim() !== '') {
        return String(value);
      }
    }
    return '';
  }

  private pickDate(props: Record<string, unknown>, keys: string[]): string | null {
    const normalize = (key: string) =>
      key.replace(/^[a-zA-Z0-9]+:/, '').replace(/[_-]+/g, '').toLowerCase();
    const preferred = new Set(keys.map(normalize));
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === '') {
        continue;
      }
      if (preferred.has(normalize(key))) {
        return String(value);
      }
    }
    return null;
  }
}
