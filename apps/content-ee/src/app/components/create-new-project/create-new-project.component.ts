import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AppService } from '@alfresco/aca-shared';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, Subscription } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import {
  AuthenticationService,
  UserPreferencesService,
  UserPreferenceValues
} from '@alfresco/adf-core';
import { environment } from '../../../environments/environment';
import { ManagedGroup, UserManagementService } from '../../services/user-management.service';
import { CreateProgramWizardStepMeta, GroupPermissionRow, FlagField, DviMatrixRow, EngineeringMatrixRow, ReviewField, ReviewSection, ProcessOutcome, CreateProgramPayload } from '../../interface/programPortfolio';

@Component({
  selector: 'adw-create-new-project',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatSnackBarModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './create-new-project.component.html',
  styleUrls: ['./create-new-project.component.scss']
})
export class CreateNewProjectComponent implements OnInit, OnDestroy {
  programForm!: FormGroup;
  loading = false;
  isSidenavExpanded = true;
  /**
   * 1 Program identity
   * 2 Organization
   * 3 Customer & references
   * 4 Timeline
   * 5 Function requirements
   * 6 DVI & approvals
   * 7 Group permission
   * 8 Governance
   * 9 Review & submit
   */
  currentStep = 1;
  /** Furthest step the user has opened (keeps prior steps marked when jumping back). */
  maxReachedStep = 1;
  private readonly dviApprovalsStep = 6;
  private readonly lastWizardStep = 9;
  /** Local ISO date (yyyy-MM-dd) — used as min for native date inputs. */
  readonly todayIso = this.formatLocalIsoDate((() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })())!;

  readonly wizardSteps: CreateProgramWizardStepMeta[] = [
    { step: 1, title: 'Program identity', desc: 'Name, code, type, and status', icon: 'apartment' },
    { step: 2, title: 'Organization', desc: 'Owner, manager, and units', icon: 'business_center' },
    { step: 3, title: 'Customer & references', desc: 'Customer and SAE/SHAE/HAL refs', icon: 'badge' },
    { step: 4, title: 'Timeline', desc: 'Planned and actual dates', icon: 'schedule' },
    { step: 5, title: 'Function requirements', desc: 'SCM, DVI, engineering, and more', icon: 'tune' },
    { step: 6, title: 'DVI & approvals', desc: 'I1/I2/I3 and quality approvals', icon: 'verified_user' },
    { step: 7, title: 'Group permission', desc: 'Users, groups, and access', icon: 'group' },
    { step: 8, title: 'Governence', desc: 'DVI and engineering routing', icon: 'account_tree' },
    { step: 9, title: 'Review & Submit', desc: 'Final confirmation', icon: 'task_alt' }
  ];

  readonly permissionOptions: ReadonlyArray<{ value: string; description: string }> = [
    { value: 'Viewer', description: 'Can only view and download files.' },
    { value: 'Contributor', description: 'Can upload files. Can only edit or delete their own uploads.' },
    { value: 'Editor', description: "Can edit any file in the project, but can't delete others' files." },
    { value: 'Document Controller', description: 'Full access. Can edit, delete, and manage who has access.' }
  ];

  showGroupPermissionEditor = false;
  groupPermissionsTouched = false;
  draftGroupPermissions: GroupPermissionRow[] = [];
  savedGroupPermissions: GroupPermissionRow[] = [];
  availableGroups: ManagedGroup[] = [];
  groupsLoading = false;
  groupsError: string | null = null;
  groupSelectSearch = '';

  private readonly processDefinitionKey = (environment.createProgramProcessDefinitionKey || '').trim();
  private readonly businessKey =
    (environment.createProgramBusinessKey || '').trim() || this.processDefinitionKey;
  private readonly processInstancesUrl = environment.processInstancesUrl;

  programCategories = ['New Program', 'Existing Program', 'Amendment', 'Upgrade'];
  programTypes = [
    'Civil',
    'Electrical',
    'Mechanical',
    'Pipeline',
    'Instrumentation & Control',
    'Piping'
  ];
  programStatuses = ['Active', 'Draft', 'On Hold', 'Completed', 'Closed'];
  requestingUnits = [
    'Engineering',
    'Industrialization',
    'Manufacturing',
    'Quality',
    'SCM',
    'Operations'
  ];
  departments = [
    'Engineering',
    'Quality',
    'Production',
    'Industrialization',
    'Supply Chain Management (SCM)',
    'Program Management'
  ];
  dviCategories = ['New', 'Existing', 'Revised', 'Change'];
  engineeringDisciplines = [
    'Electrical',
    'Mechanical',
    'Civil',
    'Pipeline',
    'Instrumentation & Control',
    'Piping'
  ];

  readonly functionRequirementFields: FlagField[] = [
    { key: 'scmrequired', label: 'SCM required' },
    { key: 'dvirequired', label: 'DVI required' },
    { key: 'engineeringrequired', label: 'Engineering required' },
    { key: 'manufacturingrequired', label: 'Manufacturing required' },
    { key: 'qualityrequired', label: 'Quality required' }
  ];

  readonly dviApprovalFields: FlagField[] = [
    { key: 'i1required', label: 'I1 required' },
    { key: 'i2required', label: 'I2 required' },
    { key: 'i3required', label: 'I3 required' },
    { key: 'quaapprovalrequired', label: 'QUA approval required' },
    { key: 'saequalityapprovalrequired', label: 'SAE quality approval required' },
    { key: 'industrializationrequired', label: 'Industrialization required' }
  ];

  readonly reviewSections: ReviewSection[] = [
    {
      title: 'Program identity',
      fields: [
        { key: 'programName', label: 'Program Name' },
        { key: 'programCode', label: 'Program Code' },
        { key: 'programCategory', label: 'Program Category' },
        { key: 'programType', label: 'Program Type' },
        { key: 'programStatus', label: 'Program Status' },
        { key: 'programDescription', label: 'Program Description', block: true }
      ]
    },
    {
      title: 'Organization',
      fields: [
        { key: 'requestingUnit', label: 'Requesting Unit' },
        { key: 'businessUnit', label: 'Business Unit' },
        { key: 'programOwner', label: 'Program Owner' },
        { key: 'programManager', label: 'Program Manager' },
        { key: 'owningOrganization', label: 'Owning Organization' },
        { key: 'department', label: 'Department' }
      ]
    },
    {
      title: 'Customer & references',
      fields: [
        { key: 'programCustomer', label: 'Program Customer' },
        { key: 'saeReference', label: 'SAE Reference' },
        { key: 'shaeReference', label: 'SHAE Reference' },
        { key: 'halReference', label: 'HAL Reference' }
      ]
    },
    {
      title: 'Timeline',
      fields: [
        { key: 'plannedStartDate', label: 'Planned Start Date', date: true },
        { key: 'plannedEndDate', label: 'Planned End Date', date: true },
        { key: 'actualStartDate', label: 'Actual Start Date', date: true },
        { key: 'actualEndDate', label: 'Actual End Date', date: true }
      ]
    }
  ];

  readonly dviApprovalValueByKey: Record<string, string> = {
    i1required: 'I1',
    i2required: 'I2',
    i3required: 'I3',
    quaapprovalrequired: 'QUA',
    saequalityapprovalrequired: 'SAE Quality'
  };

  readonly dviPayloadKeyByValue: Record<string, string> = {
    I1: 'I1 Approval Group',
    I2: 'I2 Approval Group',
    I3: 'I3 Approval Group',
    QUA: 'QUA Approval Group',
    'SAE Quality': 'SAE Quality Group'
  };

  selectedRoutingFunction = 'dvirequired';
  showMatrixEditor = false;
  matrixTouched = false;
  draftDviRows: DviMatrixRow[] = [];
  savedDviRows: DviMatrixRow[] = [];
  draftEngineeringRows: EngineeringMatrixRow[] = [];
  savedFunctionRows: Record<string, EngineeringMatrixRow[]> = {};
  private cachedEnabledFunctionOptions: FlagField[] = [];
  private cachedEnabledDviApprovalOptions: Array<{ key: string; value: string; label: string }> = [];
  private readonly stepFieldKeys: Record<number, string[]> = {
    1: ['programName', 'programCode', 'programDescription', 'programCategory', 'programType', 'programStatus'],
    2: ['requestingUnit', 'programOwner', 'programManager', 'owningOrganization', 'department', 'businessUnit'],
    3: ['programCustomer'],
    4: ['plannedStartDate', 'plannedEndDate'],
    5: this.functionRequirementFields.map((field) => field.key),
    6: [...this.dviApprovalFields.map((field) => field.key), 'dviCategory', 'dviNumberPrefix']
  };

  private appService = inject(AppService);
  private sidenavSubscription?: Subscription;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthenticationService,
    private userPreferences: UserPreferencesService,
    private userManagementService: UserManagementService
  ) {}

  ngOnInit(): void {
    this.programForm = this.fb.group({
      programName: ['', Validators.required],
      programCode: ['', Validators.required],
      programDescription: ['', Validators.required],
      programCategory: ['', Validators.required],
      programType: ['', Validators.required],
      programStatus: ['', Validators.required],
      requestingUnit: ['', Validators.required],
      programOwner: ['', Validators.required],
      programManager: ['', Validators.required],
      owningOrganization: ['', Validators.required],
      department: ['', Validators.required],
      businessUnit: ['SafranHAL', Validators.required],
      programCustomer: ['', Validators.required],
      saeReference: [''],
      shaeReference: [''],
      halReference: [''],
      plannedStartDate: ['', Validators.required],
      plannedEndDate: ['', Validators.required],
      actualStartDate: [''],
      actualEndDate: [''],
      scmrequired: [true, Validators.required],
      dvirequired: [true, Validators.required],
      engineeringrequired: [true, Validators.required],
      manufacturingrequired: [true, Validators.required],
      qualityrequired: [true, Validators.required],
      industrializationrequired: [true, Validators.required],
      i1required: [true, Validators.required],
      i2required: [true, Validators.required],
      i3required: [true, Validators.required],
      quaapprovalrequired: [true, Validators.required],
      saequalityapprovalrequired: [false, Validators.required],
      dviCategory: ['', Validators.required],
      dviNumberPrefix: ['DVI-', Validators.required]
    });

    this.refreshEnabledOptions();
    void this.loadAvailableGroups();

    this.sidenavSubscription = this.userPreferences
      .select<boolean>(UserPreferenceValues.ExpandedSideNavStatus)
      .subscribe((expanded) => {
        this.isSidenavExpanded = expanded ?? true;
      });
  }

  ngOnDestroy(): void {
    this.sidenavSubscription?.unsubscribe();
  }

  get isDviRequired(): boolean {
    return this.programForm?.get('dvirequired')?.value === true;
  }

  get isDviRoutingSelected(): boolean {
    return this.selectedRoutingFunction === 'dvirequired';
  }

  get enabledFunctionOptions(): FlagField[] {
    return this.cachedEnabledFunctionOptions;
  }

  get enabledDviApprovalOptions(): Array<{ key: string; value: string; label: string }> {
    return this.cachedEnabledDviApprovalOptions;
  }

  get hasNonDviFunction(): boolean {
    return this.enabledFunctionOptions.some((field) => field.key !== 'dvirequired');
  }

  selectedFunctionLabel(): string {
    const field = this.enabledFunctionOptions.find((item) => item.key === this.selectedRoutingFunction);
    return field ? this.flagShortLabel(field.label) : 'routing';
  }

  functionRows(functionKey: string): EngineeringMatrixRow[] {
    return this.savedFunctionRows[functionKey] || [];
  }

  hasSavedRowsForFunction(functionKey: string): boolean {
    if (functionKey === 'dvirequired') {
      return this.savedDviRows.length > 0;
    }
    return this.functionRows(functionKey).length > 0;
  }

  hasAnySavedMatrixRows(): boolean {
    return this.enabledFunctionOptions.some((field) => this.hasSavedRowsForFunction(field.key));
  }

  flagShortLabel(label: string): string {
    return String(label || '').replace(/\s+required$/i, '').trim();
  }

  get visibleWizardSteps(): CreateProgramWizardStepMeta[] {
    if (this.isDviRequired) {
      return this.wizardSteps;
    }
    return this.wizardSteps.filter((step) => step.step !== this.dviApprovalsStep);
  }

  get totalSteps(): number {
    return this.visibleWizardSteps.length;
  }

  get currentVisibleStepNumber(): number {
    const index = this.visibleWizardSteps.findIndex((step) => step.step === this.currentStep);
    return index >= 0 ? index + 1 : 1;
  }

  get progressPercent(): number {
    return (this.currentVisibleStepNumber / this.totalSteps) * 100;
  }

  get managePermissionsTitle(): string {
    const name = String(this.programForm?.value?.programName ?? '').trim();
    return name ? `Manage Permissions for ${name}` : 'Manage Permissions';
  }

  isFieldInvalid(controlName: string): boolean {
    const c = this.programForm?.get(controlName);
    return !!(c && c.touched && c.invalid);
  }

  isFlag(controlName: string): boolean | null {
    const value = this.programForm?.get(controlName)?.value;
    return value === true ? true : value === false ? false : null;
  }

  setFlag(controlName: string, value: boolean): void {
    const control = this.programForm?.get(controlName);
    if (!control) {
      return;
    }
    control.setValue(value);
    control.markAsDirty();
    control.markAsTouched();
    control.updateValueAndValidity();
    if (controlName === 'dvirequired') {
      this.onDviRequiredChange();
    }
    this.refreshEnabledOptions();
    this.syncSelectedRoutingFunction();
  }

  toggleFlag(controlName: string): void {
    this.setFlag(controlName, this.programForm?.get(controlName)?.value !== true);
  }

  flagLabel(value: unknown): string {
    return value === true ? 'Yes' : value === false ? 'No' : '—';
  }

  displayOrDash(value: unknown): string {
    const text = String(value ?? '').trim();
    return text || '—';
  }

  reviewValue(field: ReviewField): string {
    const value = this.programForm?.value?.[field.key];
    return field.date ? this.formatDateDisplay(value) : this.displayOrDash(value);
  }

  groupLabel(groupId: string): string {
    const id = (groupId || '').trim();
    if (!id) {
      return '—';
    }
    const match = this.availableGroups.find((group) => group.id === id);
    return match?.displayName || id;
  }

  isStepDone(step: number): boolean {
    return step !== this.currentStep && step <= this.maxReachedStep;
  }

  isStepPending(step: number): boolean {
    return step > this.maxReachedStep;
  }

  private setCurrentStep(step: number): void {
    this.currentStep = step;
    if (step > this.maxReachedStep) {
      this.maxReachedStep = step;
    }
  }

  goNext(): void {
    if (!this.validateStep(this.currentStep)) {
      return;
    }

    const next = this.nextVisibleStep(this.currentStep) ?? this.currentStep + 1;
    if (next > this.lastWizardStep || next === this.currentStep) {
      return;
    }

    this.advanceToStep(next);
  }

  continueFromGroupPermission(): void {
    this.groupPermissionsTouched = true;
    if (this.showGroupPermissionEditor && this.savedGroupPermissions.length > 0) {
      this.closeGroupPermissionEditor();
    }
    if (this.savedGroupPermissions.length === 0 || this.showGroupPermissionEditor) {
      return;
    }
    this.advanceToStep(8);
  }

  goBack(): void {
    const previous = this.previousVisibleStep(this.currentStep);
    if (previous != null) {
      this.setCurrentStep(previous);
    }
  }

  goToStep(step: number): void {
    if (
      !Number.isFinite(step) ||
      step < 1 ||
      step > this.lastWizardStep ||
      step === this.currentStep ||
      !this.isStepVisible(step)
    ) {
      return;
    }

    if (step <= this.maxReachedStep) {
      this.advanceToStep(step);
      return;
    }

    const nextFromFurthest = this.nextVisibleStep(this.maxReachedStep);
    if (step !== nextFromFurthest || this.currentStep !== this.maxReachedStep) {
      return;
    }

    if (!this.validateStep(this.currentStep)) {
      return;
    }

    this.advanceToStep(step);
  }

  private advanceToStep(step: number): void {
    try {
      this.prepareStepIfNeeded(step);
    } catch (err) {
      console.error('Failed to prepare wizard step', step, err);
    }
    this.setCurrentStep(step);
  }

  private isStepVisible(step: number): boolean {
    return this.visibleWizardSteps.some((item) => item.step === step);
  }

  private nextVisibleStep(from: number): number | null {
    const visible = this.visibleWizardSteps;
    const index = visible.findIndex((item) => item.step === from);
    if (index < 0 || index >= visible.length - 1) {
      return null;
    }
    return visible[index + 1].step;
  }

  private previousVisibleStep(from: number): number | null {
    const visible = this.visibleWizardSteps;
    const index = visible.findIndex((item) => item.step === from);
    if (index <= 0) {
      return null;
    }
    return visible[index - 1].step;
  }

  private onDviRequiredChange(): void {
    if (!this.isDviRequired && this.currentStep === this.dviApprovalsStep) {
      this.setCurrentStep(5);
    }
    this.syncSelectedRoutingFunction();
  }

  private prepareStepIfNeeded(step: number): void {
    if (step !== 8) {
      return;
    }
    this.refreshEnabledOptions();
    this.syncSelectedRoutingFunction();
  }

  private refreshEnabledOptions(): void {
    this.cachedEnabledFunctionOptions = this.functionRequirementFields.filter(
      (field) => this.programForm?.get(field.key)?.value === true
    );
    this.cachedEnabledDviApprovalOptions = this.dviApprovalFields
      .filter((field) => this.programForm?.get(field.key)?.value === true)
      .map((field) => ({
        key: field.key,
        value: this.dviApprovalValueByKey[field.key] || this.flagShortLabel(field.label),
        label: this.flagShortLabel(field.label)
      }));
  }

  openSidenav(): void {
    this.appService.setAppNavbarMode('expanded');
    this.appService.appNavNarMode$.next('expanded');
    this.appService.toggleAppNavBar$.next();
    this.userPreferences.set(UserPreferenceValues.ExpandedSideNavStatus, true);
  }

  openMatrixEditor(): void {
    this.showMatrixEditor = true;
    if (this.isDviRoutingSelected) {
      this.draftDviRows = [this.createEmptyDviRow()];
    } else {
      this.draftEngineeringRows = [this.createEmptyEngineeringRow()];
    }
    void this.loadAvailableGroups();
  }

  closeMatrixEditor(): void {
    this.showMatrixEditor = false;
    this.draftDviRows = [];
    this.draftEngineeringRows = [];
  }

  addDraftMatrixRow(): void {
    if (this.isDviRoutingSelected) {
      this.draftDviRows = [...this.draftDviRows, this.createEmptyDviRow()];
      return;
    }
    this.draftEngineeringRows = [...this.draftEngineeringRows, this.createEmptyEngineeringRow()];
  }

  removeDraftDviRow(id: string): void {
    this.draftDviRows = this.draftDviRows.filter((row) => row.id !== id);
    if (this.draftDviRows.length === 0) {
      this.draftDviRows = [this.createEmptyDviRow()];
    }
  }

  removeDraftEngineeringRow(id: string): void {
    this.draftEngineeringRows = this.draftEngineeringRows.filter((row) => row.id !== id);
    if (this.draftEngineeringRows.length === 0) {
      this.draftEngineeringRows = [this.createEmptyEngineeringRow()];
    }
  }

  onDraftDviSelected(row: DviMatrixRow, value: string): void {
    const option = this.enabledDviApprovalOptions.find((item) => item.value === value);
    row.dviValue = option?.value || '';
  }

  onDraftDviGroupSelected(row: DviMatrixRow, groupId: string): void {
    const group = this.availableGroups.find((item) => item.id === groupId);
    row.groupId = groupId || '';
    row.groupName = group?.displayName || '';
  }

  onDraftDisciplineSelected(row: EngineeringMatrixRow, discipline: string): void {
    row.discipline = discipline || '';
  }

  onDraftEngineeringGroupSelected(
    row: EngineeringMatrixRow,
    field: 'reviewer' | 'approver',
    groupId: string
  ): void {
    const group = this.availableGroups.find((item) => item.id === groupId);
    if (field === 'reviewer') {
      row.reviewerGroupId = groupId || '';
      row.reviewerGroupName = group?.displayName || '';
      return;
    }
    row.approverGroupId = groupId || '';
    row.approverGroupName = group?.displayName || '';
  }

  isDviDraftValueTaken(value: string, rowId: string): boolean {
    const current = String(value || '').trim();
    if (!current) {
      return false;
    }
    if (this.savedDviRows.some((row) => row.dviValue === current)) {
      return true;
    }
    return this.draftDviRows.some((row) => row.id !== rowId && row.dviValue === current);
  }

  isDisciplineTaken(discipline: string, rowId: string): boolean {
    const current = String(discipline || '').trim();
    if (!current) {
      return false;
    }
    if (this.functionRows(this.selectedRoutingFunction).some((row) => row.discipline === current)) {
      return true;
    }
    return this.draftEngineeringRows.some((row) => row.id !== rowId && row.discipline === current);
  }

  createMatrixRows(): void {
    if (this.isDviRoutingSelected) {
      const cleaned = this.draftDviRows
        .map((row) => ({
          id: row.id,
          dviValue: String(row.dviValue || '').trim(),
          groupId: String(row.groupId || '').trim(),
          groupName: String(row.groupName || '').trim()
        }))
        .filter((row) => row.dviValue && row.groupId);

      if (cleaned.length === 0) {
        this.snackBar.open('Select a DVI value and group before creating.', 'Close', { duration: 5000 });
        return;
      }

      const merged = new Map(this.savedDviRows.map((row) => [row.dviValue, row]));
      for (const row of cleaned) {
        merged.set(row.dviValue, row);
      }
      this.savedDviRows = Array.from(merged.values());
      this.matrixTouched = false;
      this.closeMatrixEditor();
      return;
    }

    const cleaned = this.draftEngineeringRows
      .map((row) => ({
        id: row.id,
        discipline: String(row.discipline || '').trim(),
        reviewerGroupId: String(row.reviewerGroupId || '').trim(),
        reviewerGroupName: String(row.reviewerGroupName || '').trim(),
        approverGroupId: String(row.approverGroupId || '').trim(),
        approverGroupName: String(row.approverGroupName || '').trim()
      }))
      .filter((row) => row.discipline && row.reviewerGroupId && row.approverGroupId);

    if (cleaned.length === 0) {
      this.snackBar.open('Select discipline, reviewer group, and approver group before creating.', 'Close', {
        duration: 5000
      });
      return;
    }

    const functionKey = this.selectedRoutingFunction;
    const merged = new Map(this.functionRows(functionKey).map((row) => [row.discipline, row]));
    for (const row of cleaned) {
      merged.set(row.discipline, row);
    }
    this.savedFunctionRows = {
      ...this.savedFunctionRows,
      [functionKey]: Array.from(merged.values())
    };
    this.matrixTouched = false;
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

  onRoutingFunctionChange(functionKey: string): void {
    if (!functionKey || functionKey === this.selectedRoutingFunction) {
      return;
    }
    this.selectedRoutingFunction = functionKey;
    this.closeMatrixEditor();
  }

  dviPayloadKey(value: string): string {
    return this.dviPayloadKeyByValue[value] || `${value} Approval Group`;
  }

  private createEmptyDviRow(): DviMatrixRow {
    return {
      id: `dvi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      dviValue: '',
      groupId: '',
      groupName: ''
    };
  }

  private createEmptyEngineeringRow(): EngineeringMatrixRow {
    return {
      id: `em-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      discipline: '',
      reviewerGroupId: '',
      reviewerGroupName: '',
      approverGroupId: '',
      approverGroupName: ''
    };
  }

  currentSavedMatrixCount(): number {
    if (this.isDviRoutingSelected) {
      return this.savedDviRows.length;
    }
    return this.functionRows(this.selectedRoutingFunction).length;
  }

  private syncSelectedRoutingFunction(): void {
    const enabled = this.enabledFunctionOptions;
    if (!enabled.length) {
      this.selectedRoutingFunction = '';
      return;
    }
    if (enabled.some((field) => field.key === this.selectedRoutingFunction)) {
      return;
    }
    const preferred =
      enabled.find((field) => field.key === 'dvirequired') ||
      enabled.find((field) => field.key === 'engineeringrequired') ||
      enabled[0];
    this.selectedRoutingFunction = preferred.key;
  }

  private validateMatrixStep(): boolean {
    this.syncSelectedRoutingFunction();
    this.matrixTouched = true;

    if (this.showMatrixEditor && this.currentSavedMatrixCount() > 0) {
      this.closeMatrixEditor();
    }

    return !this.showMatrixEditor;
  }

  private validateStep(step: number): boolean {
    if (step === this.dviApprovalsStep && !this.isDviRequired) {
      return true;
    }

    if (step === 7) {
      this.groupPermissionsTouched = true;
      if (this.showGroupPermissionEditor && this.savedGroupPermissions.length > 0) {
        this.closeGroupPermissionEditor();
      }
      return this.savedGroupPermissions.length > 0 && !this.showGroupPermissionEditor;
    }

    if (step === 8) {
      return this.validateMatrixStep();
    }

    const keys = this.stepFieldKeys[step];
    if (!keys?.length) {
      return true;
    }

    let ok = true;
    keys.forEach((k) => {
      const c = this.programForm.get(k);
      if (!c) {
        return;
      }
      c.markAsTouched();
      c.updateValueAndValidity({ emitEvent: false });
      if (c.invalid) {
        ok = false;
      }
    });

    if (step === 4) {
      ok = this.validateTimelineDates() && ok;
    }

    return ok;
  }

  private validateTimelineDates(): boolean {
    const startCtrl = this.programForm.get('plannedStartDate');
    const endCtrl = this.programForm.get('plannedEndDate');
    const start = this.formatLocalIsoDate(startCtrl?.value);
    const end = this.formatLocalIsoDate(endCtrl?.value);
    let ok = true;

    if (start && end && end < start) {
      endCtrl?.setErrors({ ...(endCtrl.errors || {}), minDate: true });
      endCtrl?.markAsTouched();
      ok = false;
    } else if (endCtrl?.hasError('minDate')) {
      const { minDate: _minDate, ...rest } = endCtrl.errors || {};
      endCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }

    const actualStart = this.formatLocalIsoDate(this.programForm.get('actualStartDate')?.value);
    const actualEndCtrl = this.programForm.get('actualEndDate');
    const actualEnd = this.formatLocalIsoDate(actualEndCtrl?.value);
    if (actualStart && actualEnd && actualEnd < actualStart) {
      actualEndCtrl?.setErrors({ ...(actualEndCtrl.errors || {}), minDate: true });
      actualEndCtrl?.markAsTouched();
      ok = false;
    } else if (actualEndCtrl?.hasError('minDate')) {
      const { minDate: _minDate, ...rest } = actualEndCtrl.errors || {};
      actualEndCtrl.setErrors(Object.keys(rest).length ? rest : null);
    }

    return ok;
  }

  formatDateDisplay(value: unknown): string {
    const iso = this.formatLocalIsoDate(value);
    if (!iso) {
      return '—';
    }
    const [y, m, d] = iso.split('-');
    return `${d}-${m}-${y}`;
  }

  private formatLocalIsoDate(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const d = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  openGroupPermissionEditor(): void {
    this.showGroupPermissionEditor = true;
    this.draftGroupPermissions =
      this.savedGroupPermissions.length > 0
        ? this.savedGroupPermissions.map((row) => ({
            id: row.id,
            groupId: row.groupId,
            name: row.name,
            permission: row.permission
          }))
        : [this.createEmptyPermissionRow()];
    void this.loadAvailableGroups();
  }

  closeGroupPermissionEditor(): void {
    this.showGroupPermissionEditor = false;
    this.draftGroupPermissions = [];
  }

  async loadAvailableGroups(): Promise<void> {
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

  groupsForRow(row: GroupPermissionRow): ManagedGroup[] {
    const selectedElsewhere = new Set(
      this.draftGroupPermissions
        .filter((r) => r.id !== row.id && r.groupId)
        .map((r) => r.groupId)
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

  hasMatchingGroups(row: GroupPermissionRow): boolean {
    return this.groupsForRow(row).some((group) => this.matchesGroupSearch(group));
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
    row.name = group?.displayName ?? '';
    this.groupSelectSearch = '';
  }

  addDraftPermissionRow(): void {
    this.draftGroupPermissions = [...this.draftGroupPermissions, this.createEmptyPermissionRow()];
  }

  removeDraftPermissionRow(id: string): void {
    this.draftGroupPermissions = this.draftGroupPermissions.filter((row) => row.id !== id);
    if (this.draftGroupPermissions.length === 0) {
      this.draftGroupPermissions = [this.createEmptyPermissionRow()];
    }
  }

  selectPermission(row: GroupPermissionRow, permission: string): void {
    row.permission = permission || '';
  }

  formatPermissionLabel(permission: string): string {
    return permission || 'Select permission';
  }

  createGroupPermissions(): void {
    const cleaned = this.draftGroupPermissions
      .map((row) => ({
        id: row.id,
        groupId: row.groupId,
        name: row.name.trim(),
        permission: row.permission
      }))
      .filter((row) => row.groupId.length > 0 && row.name.length > 0 && row.permission.length > 0);

    if (cleaned.length === 0) {
      this.snackBar.open('Select at least one group with a permission before creating.', 'Close', {
        duration: 5000
      });
      return;
    }

    this.savedGroupPermissions = cleaned;
    this.groupPermissionsTouched = false;
    this.closeGroupPermissionEditor();
  }

  removeSavedGroupPermission(id: string): void {
    this.savedGroupPermissions = this.savedGroupPermissions.filter((row) => row.id !== id);
  }

  private createEmptyPermissionRow(): GroupPermissionRow {
    return {
      id: `gp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      groupId: '',
      name: '',
      permission: ''
    };
  }

  private buildPayload(): CreateProgramPayload {
    const f = this.programForm.getRawValue();
    const formatDate = (v: unknown): string => this.formatLocalIsoDate(v) || '';
    const programName = String(f.programName ?? '').trim();

    const programGroups = JSON.stringify(
      this.savedGroupPermissions.map((row) => ({
        name: row.groupId,
        role: row.permission
      }))
    );

    const dviRequired = f.dvirequired === true;

    const dviMatrix: Record<string, string> = {};
    if (dviRequired) {
      for (const row of this.savedDviRows) {
        const key = this.dviPayloadKey(row.dviValue);
        if (key && row.groupId) {
          dviMatrix[key] = row.groupId;
        }
      }
    }

    const toPayloadRows = (rows: EngineeringMatrixRow[]) =>
      rows.map((row) => ({
        discipline: row.discipline,
        reviewerGroup: row.reviewerGroupId,
        approverGroup: row.approverGroupId
      }));

    const matrixdata = JSON.stringify({
      dviMatrix,
      scmMatrix: toPayloadRows(this.functionRows('scmrequired')),
      engineeringMatrix: toPayloadRows(this.functionRows('engineeringrequired')),
      manufacturingMatrix: toPayloadRows(this.functionRows('manufacturingrequired')),
      qualityMatrix: toPayloadRows(this.functionRows('qualityrequired'))
    });

    return {
      processDefinitionKey: this.processDefinitionKey,
      name: programName,
      businessKey: this.businessKey,
      variables: [
        { name: 'programname', value: programName },
        { name: 'programcode', value: String(f.programCode ?? '').trim() },
        { name: 'programdescription', value: String(f.programDescription ?? '').trim() },
        { name: 'programcatagory', value: String(f.programCategory ?? '').trim() },
        { name: 'programtype', value: String(f.programType ?? '').trim() },
        { name: 'programstatus', value: String(f.programStatus ?? '').trim() },

        { name: 'requestingunit', value: String(f.requestingUnit ?? '').trim() },
        { name: 'programowner', value: String(f.programOwner ?? '').trim() },
        { name: 'programmanager', value: String(f.programManager ?? '').trim() },
        { name: 'owningorganization', value: String(f.owningOrganization ?? '').trim() },
        { name: 'department', value: String(f.department ?? '').trim() },
        { name: 'businessunit', value: String(f.businessUnit ?? '').trim() },

        { name: 'programcustomer', value: String(f.programCustomer ?? '').trim() },
        { name: 'saereference', value: String(f.saeReference ?? '').trim() },
        { name: 'shaereference', value: String(f.shaeReference ?? '').trim() },
        { name: 'halreference', value: String(f.halReference ?? '').trim() },

        { name: 'plannedstartdate', value: formatDate(f.plannedStartDate) },
        { name: 'plannedenddate', value: formatDate(f.plannedEndDate) },
        { name: 'actualstartdate', value: formatDate(f.actualStartDate) },
        { name: 'actualenddate', value: formatDate(f.actualEndDate) },

        { name: 'scmrequired', value: f.scmrequired === true },
        { name: 'dvirequired', value: f.dvirequired === true },
        { name: 'engineeringrequired', value: f.engineeringrequired === true },
        { name: 'manufacturingrequired', value: f.manufacturingrequired === true },
        { name: 'qualityrequired', value: f.qualityrequired === true },

        { name: 'i1required', value: dviRequired && f.i1required === true },
        { name: 'i2required', value: dviRequired && f.i2required === true },
        { name: 'i3required', value: dviRequired && f.i3required === true },
        { name: 'quaapprovalrequired', value: dviRequired && f.quaapprovalrequired === true },
        { name: 'saequalityapprovalrequired', value: dviRequired && f.saequalityapprovalrequired === true },
        { name: 'industrializationrequired', value: dviRequired && f.industrializationrequired === true },
        { name: 'dvicategory', value: dviRequired ? String(f.dviCategory ?? '').trim() : '' },
        { name: 'dvinumberprefix', value: dviRequired ? String(f.dviNumberPrefix ?? '').trim() : '' },

        { name: 'programgroups', value: programGroups },
        { name: 'matrixdata', value: matrixdata }
      ]
    };
  }

  async submitProgram(): Promise<void> {
    for (let step = 1; step <= 8; step++) {
      if (step === this.dviApprovalsStep && !this.isDviRequired) {
        continue;
      }
      if (!this.validateStep(step)) {
        this.setCurrentStep(step);
        this.prepareStepIfNeeded(step);
        return;
      }
    }

    if (!this.processDefinitionKey) {
      this.snackBar.open('Create Program process definition key is not configured.', 'Close', {
        duration: 8000,
        panelClass: ['mat-mdc-snack-bar-error']
      });
      return;
    }

    this.loading = true;

    try {
      const payload = this.buildPayload();
      const headers = await firstValueFrom(
        this.authService.addTokenToHeader(
          this.processInstancesUrl,
          new HttpHeaders({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
        )
      );
      const response = await firstValueFrom(this.http.post(this.processInstancesUrl, payload, { headers }));
      const outcome = await this.resolveProcessOutcome(response, headers);
      const succeeded = this.isProcessSuccess(outcome.responseKey);

      this.showProcessOutcomeNotification(outcome, succeeded);

      if (!succeeded) {
        return;
      }

      const expectedProjectReference = this.programForm.value.programCode;
      await this.router.navigate(['/listOf-Projects'], {
        state: {
          fromCreateProject: true,
          expectedProjectReference
        }
      });
    } catch (error: unknown) {
      console.error('Program creation failed:', error);
      const errorBody = error instanceof HttpErrorResponse ? error.error : null;
      const fromBody = this.readOutcomeVariables(errorBody);
      const message =
        fromBody.responseDesc ||
        CreateNewProjectComponent.getApiErrorMessage(error) ||
        'Failed to create program.';
      this.snackBar.open(message, 'Close', {
        duration: 8000,
        panelClass: ['mat-mdc-snack-bar-error']
      });
    } finally {
      this.loading = false;
    }
  }

  /**
   * Reads `responseKey` / `responseDesc` from the start response, then GET process
   * instance and `/variables` with a short retry because Activiti may set them after start.
   */
  private async resolveProcessOutcome(
    startResponse: unknown,
    headers: HttpHeaders
  ): Promise<ProcessOutcome> {
    const fromStart = this.readOutcomeVariables(startResponse);
    if (fromStart.responseKey) {
      return fromStart;
    }

    const processInstanceId = this.readProcessInstanceId(startResponse);
    if (!processInstanceId) {
      return fromStart;
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }

      try {
        const detailUrl = `${this.processInstancesUrl}/${encodeURIComponent(processInstanceId)}`;
        const detail = await firstValueFrom(this.http.get<unknown>(detailUrl, { headers }));
        const fromDetail = this.readOutcomeVariables(detail);
        if (fromDetail.responseKey) {
          return fromDetail;
        }
      } catch {
        // ignore — try variables endpoint
      }

      try {
        const varsUrl = `${this.processInstancesUrl}/${encodeURIComponent(processInstanceId)}/variables`;
        const vars = await firstValueFrom(this.http.get<unknown>(varsUrl, { headers }));
        const fromVars = this.readOutcomeVariables({ variables: vars });
        if (fromVars.responseKey) {
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

  private readOutcomeVariables(source: unknown): ProcessOutcome {
    const variables = this.extractActivitiVariables(source);
    let responseKey = '';
    let responseDesc = '';

    for (const variable of variables) {
      const name = String(variable['name'] ?? '').trim();
      if (name === 'responseKey') {
        responseKey = variable['value'] != null ? String(variable['value']).trim() : '';
      } else if (name === 'responseDesc') {
        responseDesc = variable['value'] != null ? String(variable['value']).trim() : '';
      }
    }

    return { responseKey, responseDesc };
  }

  private extractActivitiVariables(source: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(source)) {
      return source.filter((item): item is Record<string, unknown> => !!CreateNewProjectComponent.asRecord(item));
    }
    const record = CreateNewProjectComponent.asRecord(source);
    if (!record) {
      return [];
    }
    for (const candidate of [record['variables'], record['data'], record['entries']]) {
      if (!Array.isArray(candidate)) {
        continue;
      }
      return candidate
        .map((item) => {
          const itemRecord = CreateNewProjectComponent.asRecord(item);
          if (!itemRecord) {
            return null;
          }
          return CreateNewProjectComponent.asRecord(itemRecord['entry']) ?? itemRecord;
        })
        .filter((item): item is Record<string, unknown> => !!item);
    }
    return [];
  }

  private isProcessSuccess(responseKey: string): boolean {
    if (!responseKey) {
      return true;
    }
    return responseKey.trim().toLowerCase() === 'success';
  }

  private showProcessOutcomeNotification(outcome: ProcessOutcome, succeeded: boolean): void {
    const message =
      outcome.responseDesc ||
      (succeeded ? 'Program created successfully!' : 'Failed to create program.');
    this.snackBar.open(message, 'Close', {
      duration: succeeded ? 5000 : 8000,
      panelClass: succeeded ? [] : ['mat-mdc-snack-bar-error']
    });
  }

  private static getApiErrorMessage(err: unknown): string {
    const hiddenStackTraceMessage =
      'For security reasons the stack trace is no longer displayed, but the property is kept for previous versions.';
    const body =
      err instanceof HttpErrorResponse
        ? err.error
        : CreateNewProjectComponent.asRecord(err)?.['error'];
    const record = CreateNewProjectComponent.asRecord(body);
    if (record) {
      const apiError = CreateNewProjectComponent.asRecord(record['error']);
      if (apiError) {
        for (const key of ['errorKey', 'briefSummary', 'message'] as const) {
          const value = apiError[key];
          if (typeof value === 'string' && value.trim() && value.trim() !== hiddenStackTraceMessage) {
            return value.trim();
          }
        }
      }
      if (typeof record['message'] === 'string' && record['message'].trim()) {
        const msg = record['message'].trim();
        if (msg !== hiddenStackTraceMessage) {
          return msg;
        }
      }
    }
    if (err instanceof Error && err.message.trim()) {
      return err.message.trim();
    }
    return 'Failed to create program.';
  }

  private static asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  }
}
