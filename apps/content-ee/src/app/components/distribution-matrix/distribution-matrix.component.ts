/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 */

import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { NotificationService } from '@alfresco/adf-core';
import { AlfrescoService, DVI_MATRIX_OPTIONS } from '../../alfresco.service';
import { DviMatrixRow, EngineeringMatrixRow, FlagField } from '../../interface/programPortfolio';
import { ManagedGroup, UserManagementService } from '../../services/user-management.service';
import { environment } from '../../../environments/environment';

const FUNCTION_FIELDS: FlagField[] = [
  { key: 'scmrequired', label: 'SCM' },
  { key: 'dvirequired', label: 'DVI' },
  { key: 'engineeringrequired', label: 'Engineering' },
  { key: 'manufacturingrequired', label: 'Manufacturing' },
  { key: 'qualityrequired', label: 'Quality' }
];

const ENGINEERING_DISCIPLINES = [
  'Electrical',
  'Mechanical',
  'Civil',
  'Pipeline',
  'Instrumentation & Control',
  'Piping'
];

@Component({
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSelectModule],
  selector: 'adw-distribution-matrix',
  templateUrl: './distribution-matrix.component.html',
  styleUrl: './distribution-matrix.component.scss',
  host: { class: 'adw-distribution-matrix' }
})
export class DistributionMatrixComponent {
  readonly functionFields = FUNCTION_FIELDS;
  readonly dviOptions = DVI_MATRIX_OPTIONS;
  readonly engineeringDisciplines = ENGINEERING_DISCIPLINES;

  selectedRoutingFunction = 'engineeringrequired';
  showMatrixEditor = false;
  savedDviRows: DviMatrixRow[] = [];
  savedFunctionRows: Record<string, EngineeringMatrixRow[]> = {};
  draftDviRows: DviMatrixRow[] = [];
  draftEngineeringRows: EngineeringMatrixRow[] = [];
  availableGroups: ManagedGroup[] = [];
  groupsLoading = false;
  loading = false;
  saving = false;

  private projectId: string | null = null;
  private matrixNodeId: string | null = null;
  private matrixPropertyKey = 'edms:matrix_data';

  private readonly dialogRef = inject(MatDialogRef<DistributionMatrixComponent>);
  private readonly notificationService = inject(NotificationService);
  private readonly alfrescoService = inject(AlfrescoService);
  private readonly userManagementService = inject(UserManagementService);

  get hasProject(): boolean {
    return !!this.projectId;
  }

  get isDviRoutingSelected(): boolean {
    return this.selectedRoutingFunction === 'dvirequired';
  }

  initForProject(projectIdFromParent: string): void {
    this.projectId = projectIdFromParent?.trim() || null;
    this.reload();
  }

  functionRows(functionKey: string): EngineeringMatrixRow[] {
    return this.savedFunctionRows[functionKey] || [];
  }

  selectedFunctionLabel(): string {
    return this.functionFields.find((field) => field.key === this.selectedRoutingFunction)?.label || 'routing';
  }

  groupLabel(groupId: string): string {
    const id = groupId.trim();
    return !id
      ? '—'
      : this.availableGroups.find((group) => group.id === id)?.displayName || id.replace(/^GROUP_/i, '');
  }

  onRoutingFunctionChange(functionKey: string): void {
    if (!functionKey || functionKey === this.selectedRoutingFunction) {
      return;
    }
    this.selectedRoutingFunction = functionKey;
    this.closeMatrixEditor();
  }

  openMatrixEditor(): void {
    this.showMatrixEditor = true;
    this.isDviRoutingSelected
      ? (this.draftDviRows = this.copyOrEmpty(this.savedDviRows, () => this.emptyDviRow()))
      : (this.draftEngineeringRows = this.copyOrEmpty(this.functionRows(this.selectedRoutingFunction), () =>
          this.emptyEngineeringRow()
        ));
  }

  closeMatrixEditor(): void {
    this.showMatrixEditor = false;
    this.draftDviRows = [];
    this.draftEngineeringRows = [];
  }

  addDraftMatrixRow(): void {
    this.isDviRoutingSelected
      ? (this.draftDviRows = [...this.draftDviRows, this.emptyDviRow()])
      : (this.draftEngineeringRows = [...this.draftEngineeringRows, this.emptyEngineeringRow()]);
  }

  removeDraftDviRow(id: string): void {
    this.draftDviRows = this.keepOrEmpty(
      this.draftDviRows.filter((row) => row.id !== id),
      () => this.emptyDviRow()
    );
  }

  removeDraftEngineeringRow(id: string): void {
    this.draftEngineeringRows = this.keepOrEmpty(
      this.draftEngineeringRows.filter((row) => row.id !== id),
      () => this.emptyEngineeringRow()
    );
  }

  onDraftDviSelected(row: DviMatrixRow, value: string): void {
    row.dviValue = value || '';
  }

  onDraftDviGroupSelected(row: DviMatrixRow, groupId: string): void {
    row.groupId = groupId || '';
    row.groupName = this.availableGroups.find((item) => item.id === groupId)?.displayName || '';
  }

  onDraftDisciplineSelected(row: EngineeringMatrixRow, discipline: string): void {
    row.discipline = discipline || '';
  }

  onDraftEngineeringGroupSelected(
    row: EngineeringMatrixRow,
    field: 'reviewer' | 'approver',
    groupId: string
  ): void {
    const name = this.availableGroups.find((item) => item.id === groupId)?.displayName || '';
    if (field === 'reviewer') {
      row.reviewerGroupId = groupId || '';
      row.reviewerGroupName = name;
      return;
    }
    row.approverGroupId = groupId || '';
    row.approverGroupName = name;
  }

  isDviDraftValueTaken(value: string, rowId: string): boolean {
    const current = value.trim();
    return !!current && this.draftDviRows.some((row) => row.id !== rowId && row.dviValue === current);
  }

  isDisciplineTaken(discipline: string, rowId: string): boolean {
    const current = discipline.trim();
    return !!current && this.draftEngineeringRows.some((row) => row.id !== rowId && row.discipline === current);
  }

  applyDraftRows(): void {
    if (this.isDviRoutingSelected) {
      const cleaned = this.draftDviRows
        .map((row) => ({
          ...row,
          dviValue: row.dviValue.trim(),
          groupId: row.groupId.trim(),
          groupName: row.groupName.trim() || this.groupLabel(row.groupId)
        }))
        .filter((row) => row.dviValue && row.groupId);
      if (!cleaned.length) {
        this.notificationService.openSnackMessage('Select a DVI value and group before applying.');
        return;
      }
      this.savedDviRows = cleaned;
      this.closeMatrixEditor();
      return;
    }

    const cleaned = this.draftEngineeringRows
      .map((row) => ({
        ...row,
        discipline: row.discipline.trim(),
        reviewerGroupId: row.reviewerGroupId.trim(),
        reviewerGroupName: row.reviewerGroupName.trim() || this.groupLabel(row.reviewerGroupId),
        approverGroupId: row.approverGroupId.trim(),
        approverGroupName: row.approverGroupName.trim() || this.groupLabel(row.approverGroupId)
      }))
      .filter((row) => row.discipline && row.reviewerGroupId && row.approverGroupId);
    if (!cleaned.length) {
      this.notificationService.openSnackMessage(
        'Select discipline, reviewer group, and approver group before applying.'
      );
      return;
    }
    this.savedFunctionRows = { ...this.savedFunctionRows, [this.selectedRoutingFunction]: cleaned };
    this.closeMatrixEditor();
  }

  removeSavedDviRow(id: string): void {
    this.savedDviRows = this.savedDviRows.filter((row) => row.id !== id);
  }

  removeSavedFunctionRow(functionKey: string, id: string): void {
    this.savedFunctionRows = {
      ...this.savedFunctionRows,
      [functionKey]: this.functionRows(functionKey).filter((row) => row.id !== id)
    };
  }

  refresh(): void {
    if (!this.projectId) {
      this.notificationService.openSnackMessage('No project context.');
      return;
    }
    this.closeMatrixEditor();
    this.reload();
  }

  async save(): Promise<void> {
    const projectId = this.projectId;
    if (!projectId) {
      this.notificationService.openSnackMessage('No project context.');
      return;
    }
    this.saving = true;
    try {
      this.matrixNodeId = await this.alfrescoService.saveDistributionMatrix(
        projectId,
        this.matrixNodeId,
        this.matrixPropertyKey,
        this.savedDviRows,
        this.savedFunctionRows
      );
      this.notificationService.openSnackMessage('Distribution matrix saved successfully');
      this.dialogRef.close(true);
    } catch (err) {
      console.error('Failed to save distribution matrix', err);
      this.notificationService.openSnackMessage(
        err instanceof Error && err.message === 'Created but could not read node id from response.'
          ? err.message
          : 'Failed to save distribution matrix.'
      );
    } finally {
      this.saving = false;
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  private reload(): void {
    void this.loadGroups();
    void this.loadMatrix();
  }

  private async loadMatrix(): Promise<void> {
    if (!this.projectId) {
      this.notificationService.openSnackMessage('No project context.');
      return;
    }
    this.loading = true;
    this.matrixNodeId = null;
    try {
      const result = await this.alfrescoService.loadDistributionMatrix(this.projectId);
      this.matrixNodeId = result.nodeId;
      this.matrixPropertyKey = result.propertyKey;
      this.savedDviRows = result.dviRows;
      this.savedFunctionRows = result.functionRows;
      this.refreshGroupNames();
    } catch (err) {
      console.error('Failed to load distribution matrix.', err);
      this.notificationService.openSnackMessage('Failed to load distribution matrix.');
      this.savedDviRows = [];
      this.savedFunctionRows = {};
    } finally {
      this.loading = false;
    }
  }

  private async loadGroups(): Promise<void> {
    this.groupsLoading = true;
    try {
      const siteId = (environment.edmsCentralSiteId || 'safran-hal').trim();
      const all: ManagedGroup[] = [];
      let skipCount = 0;
      let totalItems = Number.POSITIVE_INFINITY;
      while (skipCount < totalItems) {
        const result = await this.userManagementService.getSiteGroupMembers(siteId, skipCount, 100);
        all.push(...result.items);
        totalItems = result.totalItems;
        skipCount += result.items.length;
        if (!result.items.length) {
          break;
        }
      }
      this.availableGroups = all.sort((a, b) => a.displayName.localeCompare(b.displayName));
      this.refreshGroupNames();
    } catch {
      this.availableGroups = [];
      this.notificationService.openSnackMessage('Failed to load groups.');
    } finally {
      this.groupsLoading = false;
    }
  }

  private refreshGroupNames(): void {
    for (const row of this.savedDviRows) {
      row.groupName = this.groupLabel(row.groupId);
    }
    for (const rows of Object.values(this.savedFunctionRows)) {
      for (const row of rows) {
        row.reviewerGroupName = this.groupLabel(row.reviewerGroupId);
        row.approverGroupName = this.groupLabel(row.approverGroupId);
      }
    }
  }

  private copyOrEmpty<T>(rows: T[], empty: () => T): T[] {
    return rows.length ? rows.map((row) => ({ ...row })) : [empty()];
  }

  private keepOrEmpty<T>(rows: T[], empty: () => T): T[] {
    return rows.length ? rows : [empty()];
  }

  private emptyDviRow(): DviMatrixRow {
    return { id: this.newId('dvi'), dviValue: '', groupId: '', groupName: '' };
  }

  private emptyEngineeringRow(): EngineeringMatrixRow {
    return {
      id: this.newId('em'),
      discipline: '',
      reviewerGroupId: '',
      reviewerGroupName: '',
      approverGroupId: '',
      approverGroupName: ''
    };
  }

  private newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
