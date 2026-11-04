import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthenticationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ManagedGroup, UserManagementService } from '../../../services/user-management.service';
import { GroupPermissionRow, BusinessUnitCreationResult } from '../../../interface/common';

@Component({
  standalone: true,
  selector: 'adw-create-business-unit-dialog',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './create-business-unit-dialog.component.html',
  styleUrls: ['./create-business-unit-dialog.component.scss']
})
export class CreateBusinessUnitDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthenticationService);
  private readonly userManagementService = inject(UserManagementService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<CreateBusinessUnitDialogComponent, boolean>);

  saving = false;
  error: string | null = null;
  groupsTouched = false;

  availableGroups: ManagedGroup[] = [];
  groupsLoading = false;
  groupsError: string | null = null;
  groupSelectSearch = '';
  groupRows: GroupPermissionRow[] = [];

  readonly statusOptions = ['Active', 'Inactive'];

  readonly industryOptions = [
    'Oil & Gas (Upstream - Onshore)',
    'Oil & Gas (Upstream - Offshore)',
    'Oil & Gas (Midstream)',
    'Oil & Gas (Downstream)',
    'Petrochemical',
    'Renewable Energy',
    'Other'
  ];

  readonly contractOptions = [
    'Production Sharing Contract (PSC)',
    'Joint Operating Agreement (JOA)',
    'Concession / License',
    'Service Contract',
    'Farm-in / Farm-out Agreement',
    'Other'
  ];

  readonly permissionOptions = [
    { value: 'Viewer', description: 'Can only view and download files.' },
    { value: 'Contributor', description: 'Can upload files. Can only edit or delete their own uploads.' },
    { value: 'Editor', description: "Can edit any file, but can't delete others' files." },
    { value: 'Document Controller', description: 'Full access. Can edit, delete, and manage who has access.' }
  ];

  readonly form = this.fb.nonNullable.group({
    businessunitname: ['', [Validators.required, Validators.maxLength(200)]],
    businessunitcode: ['', [Validators.required, Validators.maxLength(50)]],
    businessunitdesc: ['', [Validators.required, Validators.maxLength(2000)]],
    budgetamount: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
    businessunitstatus: ['Active', Validators.required],
    industrytype: ['', Validators.required],
    contracttype: ['', Validators.required]
  });

  ngOnInit(): void {
    this.groupRows = [this.createEmptyRow()];
    void this.loadAvailableGroups();
  }

  addGroupRow(): void {
    this.groupRows = [...this.groupRows, this.createEmptyRow()];
  }

  removeGroupRow(row: GroupPermissionRow): void {
    if (this.groupRows.length <= 1) {
      this.groupRows = [this.createEmptyRow()];
      return;
    }
    this.groupRows = this.groupRows.filter((r) => r.id !== row.id);
  }

  groupsForRow(row: GroupPermissionRow): ManagedGroup[] {
    const selectedElsewhere = new Set(
      this.groupRows.filter((r) => r.id !== row.id && r.groupId).map((r) => r.groupId)
    );
    return this.availableGroups.filter((g) => !selectedElsewhere.has(g.id) || g.id === row.groupId);
  }

  matchesGroupSearch(group: ManagedGroup): boolean {
    const q = this.groupSelectSearch.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return group.displayName.toLowerCase().includes(q) || group.id.toLowerCase().includes(q);
  }

  onGroupSelectOpened(opened: boolean): void {
    if (!opened) {
      this.groupSelectSearch = '';
    }
  }

  onGroupSelected(row: GroupPermissionRow, groupId: string): void {
    if (groupId === '__gp_search__') {
      return;
    }
    const group = this.availableGroups.find((g) => g.id === groupId);
    row.groupId = groupId || '';
    row.name = group?.displayName || groupId || '';
  }

  trackGroupRow(_index: number, row: GroupPermissionRow): string {
    return row.id;
  }

  trackManagedGroup(_index: number, group: ManagedGroup): string {
    return group.id;
  }

  get hasValidGroups(): boolean {
    return this.groupRows.some((r) => !!r.groupId && !!r.role);
  }

  isInvalid(controlName: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[controlName];
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  async submit(): Promise<void> {
    this.groupsTouched = true;
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    const validGroups = this.groupRows.filter((r) => r.groupId && r.role);
    if (validGroups.length === 0) {
      this.error = 'Add at least one group with a role.';
      return;
    }

    const f = this.form.getRawValue();
    const processDefinitionKey = (environment.createBusinessUnitProcessDefinitionKey || '').trim();
    const processName = (environment.createBusinessUnitProcessName || '').trim() || 'Create Business Unit';
    const businessKey = (environment.createBusinessUnitBusinessKey || '').trim() || processDefinitionKey;

    if (!processDefinitionKey) {
      this.error = 'Create Business Unit process definition key is not configured.';
      return;
    }

    const budget = Number(f.budgetamount);
    const businessunitgroups = JSON.stringify(
      validGroups.map((r) => ({
        name: r.groupId,
        role: r.role
      }))
    );

    const payload = {
      processDefinitionKey,
      name: processName,
      businessKey,
      variables: [
        { name: 'businessunitname', value: f.businessunitname.trim() },
        { name: 'businessunitcode', value: f.businessunitcode.trim() },
        { name: 'businessunitdesc', value: f.businessunitdesc.trim() },
        { name: 'budgetamount', value: budget },
        { name: 'businessunitstatus', value: f.businessunitstatus },
        { name: 'industrytype', value: f.industrytype },
        { name: 'contracttype', value: f.contracttype },
        { name: 'businessunitgroups', value: businessunitgroups }
      ]
    };

    this.saving = true;
    this.error = null;
    try {
      const headers = await firstValueFrom(
        this.authService.addTokenToHeader(
          environment.processInstancesUrl,
          new HttpHeaders({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
        )
      );
      const response = await firstValueFrom(
        this.http.post<unknown>(environment.processInstancesUrl, payload, { headers })
      );
      const result = await this.resolveCreationResult(response, headers);

      if (this.isFailureStatus(result.status)) {
        this.error =
          result.message || 'Business Unit is already exist, please provide other name';
        return;
      }

      this.snackBar.open('Business unit created successfully.', 'Close', { duration: 5000 });
      this.dialogRef.close(true);
    } catch (err: unknown) {
      this.error = CreateBusinessUnitDialogComponent.apiErrorMessage(err) || 'Unable to create business unit.';
    } finally {
      this.saving = false;
    }
  }

  /**
   * Reads `businessUnitCreationStatus` / `businessUnitCreationMessage` from the start
   * response, falling back to GET process-instance detail and `/variables`.
   */
  private async resolveCreationResult(
    startResponse: unknown,
    headers: HttpHeaders
  ): Promise<BusinessUnitCreationResult> {
    const fromStart = this.readCreationVariables(startResponse);
    if (fromStart.status) {
      return fromStart;
    }

    const processInstanceId = this.readProcessInstanceId(startResponse);
    if (!processInstanceId) {
      return fromStart;
    }

    // Process may set outcome variables slightly after start; retry briefly.
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }

      try {
        const detailUrl = `${environment.processInstancesUrl}/${encodeURIComponent(processInstanceId)}`;
        const detail = await firstValueFrom(this.http.get<unknown>(detailUrl, { headers }));
        const fromDetail = this.readCreationVariables(detail);
        if (fromDetail.status) {
          return fromDetail;
        }
      } catch {
        // ignore — try variables endpoint
      }

      try {
        const varsUrl = `${environment.processInstancesUrl}/${encodeURIComponent(processInstanceId)}/variables`;
        const vars = await firstValueFrom(this.http.get<unknown>(varsUrl, { headers }));
        const fromVars = this.readCreationVariables({ variables: vars });
        if (fromVars.status) {
          return fromVars;
        }
      } catch {
        // ignore — retry
      }
    }

    return fromStart;
  }

  private readProcessInstanceId(source: unknown): string {
    if (!source || typeof source !== 'object') {
      return '';
    }
    const record = source as Record<string, unknown>;
    const id = record['id'] ?? record['processInstanceId'];
    return id != null ? String(id).trim() : '';
  }

  private readCreationVariables(source: unknown): BusinessUnitCreationResult {
    const variables = this.extractActivitiVariables(source);
    let status: string | null = null;
    let message = '';

    for (const variable of variables) {
      const name = String(variable['name'] ?? '').trim();
      if (name === 'businessUnitCreationStatus') {
        status = variable['value'] != null ? String(variable['value']).trim() : null;
      } else if (name === 'businessUnitCreationMessage') {
        message = variable['value'] != null ? String(variable['value']).trim() : '';
      }
    }

    return { status, message };
  }

  private extractActivitiVariables(source: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(source)) {
      return source.filter((item): item is Record<string, unknown> => !!item && typeof item === 'object');
    }
    if (!source || typeof source !== 'object') {
      return [];
    }
    const record = source as Record<string, unknown>;
    const candidates = [record['variables'], record['data'], record['entries']];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate
          .map((item) => {
            if (item && typeof item === 'object' && 'entry' in (item as object)) {
              const entry = (item as { entry?: unknown }).entry;
              return entry && typeof entry === 'object' ? (entry as Record<string, unknown>) : null;
            }
            return item && typeof item === 'object' ? (item as Record<string, unknown>) : null;
          })
          .filter((item): item is Record<string, unknown> => !!item);
      }
    }
    return [];
  }

  private isFailureStatus(status: string | null): boolean {
    return (status || '').trim().toLowerCase() === 'failure';
  }

  private createEmptyRow(): GroupPermissionRow {
    return {
      id: `gp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      groupId: '',
      name: '',
      role: 'Contributor'
    };
  }

  private async loadAvailableGroups(): Promise<void> {
    this.groupsLoading = true;
    this.groupsError = null;
    try {
      const siteId = (environment.edmsCentralSiteId || 'safran-hal').trim();
      if (!siteId) {
        this.groupsError = 'EDMS central site id is not configured.';
        this.availableGroups = [];
        return;
      }

      const pageSize = 100;
      let skipCount = 0;
      let totalItems = Number.POSITIVE_INFINITY;
      const all: ManagedGroup[] = [];

      while (skipCount < totalItems) {
        const result = await this.userManagementService.getSiteGroupMembers(siteId, skipCount, pageSize);
        all.push(...result.items);
        totalItems = result.totalItems;
        skipCount += result.items.length;
        if (result.items.length === 0) {
          break;
        }
      }

      this.availableGroups = all.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } catch {
      this.groupsError = 'Failed to load groups. Please try again.';
      this.availableGroups = [];
    } finally {
      this.groupsLoading = false;
    }
  }

  private static apiErrorMessage(err: unknown): string {
    const anyErr = err as any;
    const body = anyErr?.error;
    if (body && typeof body === 'object') {
      const apiError = body.error;
      if (apiError && typeof apiError === 'object') {
        return (
          apiError.briefSummary ||
          apiError.descriptionURL ||
          apiError.message ||
          apiError.errorKey ||
          ''
        );
      }
      if (typeof body.message === 'string') {
        return body.message;
      }
      if (typeof body.exception === 'string') {
        return body.exception;
      }
    }
    if (typeof anyErr?.message === 'string') {
      return anyErr.message;
    }
    return '';
  }
}
