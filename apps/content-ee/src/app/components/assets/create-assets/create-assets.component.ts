import { Component, DestroyRef, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AuthenticationService, NotificationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';
import { AlfrescoService } from '../../../alfresco.service';
import { AssetHierarchyOption, AssetsService } from '../../../services/assets.service';
import { environment } from '../../../../environments/environment';
import { Step, TemplateFolder, ValidationItem, SummaryItem, MasterDataStatus, MasterDataItem } from '../../../interface/assets';

@Component({
  selector: 'acs-create-assets',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './create-assets.component.html',
  styleUrl: './create-assets.component.scss'
})
export class CreateAssetsComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly assetsService = inject(AssetsService);
  private readonly alfrescoService = inject(AlfrescoService);
  private readonly authService = inject(AuthenticationService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly fallbackTemplateFolders: TemplateFolder[] = [
    { id: 'engineering', name: 'Engineering' },
    { id: 'native-files', name: 'Native Files' },
    { id: 'transmittals', name: 'Transmittals' },
    { id: 'vendors', name: 'Vendors' },
    { id: 'correspondence', name: 'Correspondence' }
  ];

  readonly steps: Step[] = [
    { id: 1, title: 'Asset Identity', subtitle: 'Define basic asset details' },
    { id: 2, title: 'Hierarchy Mapping', subtitle: 'Map asset hierarchy' },
    { id: 3, title: 'Folder Template', subtitle: 'Choose folder template' },
    { id: 4, title: 'Permissions', subtitle: 'Define access model' },
    { id: 5, title: 'Metadata & Retention', subtitle: 'Configure metadata rules' },
    { id: 6, title: 'Review & Save', subtitle: 'Validate and save workspace' }
  ];

  readonly validationItems: ValidationItem[] = [
    { label: 'Hierarchy complete', sub: '3 of 3 levels selected', done: true },
    { label: 'Folder template assigned', sub: 'Default Asset Folders', done: true },
    { label: 'Permissions defined', sub: 'Access model selected', done: true },
    { label: 'Metadata rules ready', sub: 'Retention period selected', done: true }
  ];

  readonly bestPracticeTips = [
    'Use the standard 4-level asset hierarchy: Region > Asset > Facility > Standard Folder Set.',
    'Use the Default Asset Folders template unless a project-specific template is required.',
    'Define permissions based on the Access Model to ensure proper access control.',
    'Set retention based on corporate information governance policy.'
  ];

  readonly facilityTypeOptions = ['Offshore Production Platform', 'Onshore Receiving Facility', 'Accommodation Platform'];
  readonly statusOptions = ['Active', 'Inactive', 'Archived'];
  readonly accessModelOptions = ['Project Team & Restricted', 'Project Team Only', 'Public', 'Restricted'];
  readonly retentionOptions = ['10 Years After Project Close', '7 Years After Project Close', '5 Years After Project Close', 'Permanent'];

  templateFolders: TemplateFolder[] = [];
  folderTemplates: TemplateFolder[] = [];
  selectedTemplateId: string | null = null;
  loadingFolderTemplates = false;
  loadingTemplatePreview = false;
  templateLoadError: string | null = null;

  @ViewChild('hierarchyPreview') hierarchyPreviewRef?: ElementRef<HTMLElement>;

  regions: AssetHierarchyOption[] = [];
  blocks: AssetHierarchyOption[] = [];
  assets: AssetHierarchyOption[] = [];

  selectedRegionId: number | null = null;
  selectedBlockId: number | null = null;
  selectedAssetId: number | null = null;

  loadingRegions = false;
  loadingBlocks = false;
  loadingAssets = false;
  saving = false;
  hierarchySubmitted = false;
  hierarchyLoadError: string | null = null;

  currentStep = 2;
  assetCode = '';
  facilityType = 'Offshore Production Platform';
  status = 'Active';
  accessModel = 'Project Team & Restricted';
  retentionPeriod = '10 Years After Project Close';

  showMasterDataModal = false;
  mdRegions: MasterDataItem[] = [];
  mdBlocks: MasterDataItem[] = [];
  mdAssets: MasterDataItem[] = [];
  selectedMdRegion: MasterDataItem | null = null;
  selectedMdBlock: MasterDataItem | null = null;
  mdRegionSearch = '';
  mdBlockSearch = '';
  mdAssetSearch = '';
  loadingMdRegions = false;
  loadingMdBlocks = false;
  loadingMdAssets = false;
  showAddRegion = false;
  showAddBlock = false;
  showAddAsset = false;
  savingMdRegion = false;
  savingMdBlock = false;
  savingMdAsset = false;
  newRegionName = '';
  newRegionCode = '';
  newRegionStatus: MasterDataStatus = 'Active';
  newRegionCreatedBy = 'admin';
  newBlockName = '';
  newBlockCode = '';
  newBlockStatus: MasterDataStatus = 'Active';
  newBlockCreatedBy = 'admin';
  newAssetName = '';
  newAssetCode = '';
  newAssetStatus: MasterDataStatus = 'Active';
  newAssetCreatedBy = 'admin';

  ngOnInit(): void {
    const loadWhenReady = () => {
      if (!this.regions.length && !this.loadingRegions) {
        void this.loadRegions();
      }
      if (!this.templateFolders.length && !this.loadingFolderTemplates && !this.folderTemplates.length) {
        void this.loadFolderTemplates();
      }
    };

    this.authService.onLogin.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => loadWhenReady());
    this.authService.onTokenReceived.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => loadWhenReady());

    if (this.authService.isLoggedIn()) {
      loadWhenReady();
    }
  }

  get selectedFolderTemplate(): TemplateFolder | undefined {
    return this.folderTemplates.find((template) => template.id === this.selectedTemplateId);
  }

  get folderTemplateLabel(): string {
    return this.selectedFolderTemplate?.name || '—';
  }

  get currentStepData(): Step {
    return this.steps[this.currentStep - 1];
  }

  get selectedRegion(): AssetHierarchyOption | undefined {
    return this.findOption(this.regions, this.selectedRegionId);
  }

  get selectedBlock(): AssetHierarchyOption | undefined {
    return this.findOption(this.blocks, this.selectedBlockId);
  }

  get selectedAsset(): AssetHierarchyOption | undefined {
    return this.findOption(this.assets, this.selectedAssetId);
  }

  get rootPath(): string {
    const parts = [this.selectedRegion?.label, this.selectedBlock?.label, this.selectedAsset?.code || this.selectedAsset?.label].filter(Boolean);
    return parts.join(' > ');
  }

  get summaryItems(): SummaryItem[] {
    return [
      { label: 'Region', value: this.selectedRegion?.label || '—' },
      { label: 'Asset', value: this.selectedBlock?.label || '—' },
      { label: 'Facility', value: this.selectedAsset?.label || '—' },
      { label: 'Root Path', value: this.rootPath || '—' },
      { label: 'Total Default Folders', value: String(this.templateFolders.length || 0) },
      { label: 'Access Model', value: this.accessModel },
      { label: 'Retention Period', value: this.retentionPeriod }
    ];
  }

  get stepDescription(): string {
    if (this.currentStep === 2) {
      return 'Select the asset hierarchy path and key attributes for this workspace.';
    }
    return this.currentStepData.subtitle;
  }

  get filteredMdRegions(): MasterDataItem[] {
    return this.filterMasterData(this.mdRegions, this.mdRegionSearch);
  }

  get filteredMdBlocks(): MasterDataItem[] {
    return this.filterMasterData(this.mdBlocks, this.mdBlockSearch);
  }

  get filteredMdAssets(): MasterDataItem[] {
    return this.filterMasterData(this.mdAssets, this.mdAssetSearch);
  }

  goToMasterData(): void {
    void this.router.navigate(['/master-data']);
  }

  async openMasterDataModal(): Promise<void> {
    this.showMasterDataModal = true;
    this.mdRegionSearch = '';
    this.mdBlockSearch = '';
    this.mdAssetSearch = '';
    this.showAddRegion = false;
    this.showAddBlock = false;
    this.showAddAsset = false;

    await this.loadMasterDataRegions();

    if (this.selectedRegionId != null) {
      const region = this.mdRegions.find((item) => item.id === this.selectedRegionId);
      if (region) {
        await this.selectMdRegion(region);
        if (this.selectedBlockId != null) {
          const block = this.mdBlocks.find((item) => item.id === this.selectedBlockId);
          if (block) {
            await this.selectMdBlock(block);
          }
        }
        return;
      }
    }

    if (this.mdRegions.length) {
      await this.selectMdRegion(this.mdRegions[0]);
    }
  }

  closeMasterDataModal(): void {
    this.showMasterDataModal = false;
  }

  async selectMdRegion(region: MasterDataItem): Promise<void> {
    this.selectedMdRegion = region;
    this.selectedMdBlock = null;
    this.mdAssets = [];
    this.mdBlockSearch = '';
    this.mdAssetSearch = '';
    this.showAddBlock = false;
    this.showAddAsset = false;
    await this.loadMasterDataBlocks(region.id);
  }

  async selectMdBlock(block: MasterDataItem): Promise<void> {
    this.selectedMdBlock = block;
    this.mdAssetSearch = '';
    this.showAddAsset = false;
    await this.loadMasterDataAssets(block.id);
  }

  cancelAddRegion(): void {
    this.showAddRegion = false;
    this.newRegionName = '';
    this.newRegionCode = '';
    this.newRegionStatus = 'Active';
    this.newRegionCreatedBy = this.resolveCreatedBy();
  }

  cancelAddBlock(): void {
    this.showAddBlock = false;
    this.newBlockName = '';
    this.newBlockCode = '';
    this.newBlockStatus = 'Active';
    this.newBlockCreatedBy = this.resolveCreatedBy();
  }

  cancelAddAsset(): void {
    this.showAddAsset = false;
    this.newAssetName = '';
    this.newAssetCode = '';
    this.newAssetStatus = 'Active';
    this.newAssetCreatedBy = this.resolveCreatedBy();
  }

  toggleAddRegion(): void {
    this.showAddRegion = !this.showAddRegion;
    if (this.showAddRegion) {
      this.newRegionCreatedBy = this.resolveCreatedBy();
    }
  }

  toggleAddBlock(): void {
    if (!this.showAddBlock && !this.selectedMdRegion) {
      this.notificationService.openSnackMessage('Select a region before adding an asset.');
      return;
    }

    this.showAddBlock = !this.showAddBlock;
    if (this.showAddBlock) {
      this.newBlockCreatedBy = this.resolveCreatedBy();
    }
  }

  toggleAddAsset(): void {
    if (!this.showAddAsset && !this.selectedMdBlock) {
      this.notificationService.openSnackMessage('Select an asset before adding a facility.');
      return;
    }

    this.showAddAsset = !this.showAddAsset;
    if (this.showAddAsset) {
      this.newAssetCreatedBy = this.resolveCreatedBy();
    }
  }

  async saveMdRegion(): Promise<void> {
    const regionName = this.newRegionName.trim();
    const regionCode = this.newRegionCode.trim();

    if (!regionName || !regionCode) {
      this.notificationService.openSnackMessage('Region name and code are required.');
      return;
    }

    this.savingMdRegion = true;
    try {
      await this.assetsService.createPttepRegion({
        regionName,
        regionCode,
        status: this.newRegionStatus.toLowerCase(),
        createdBy: this.newRegionCreatedBy.trim() || this.resolveCreatedBy()
      });
      this.notificationService.openSnackMessage('Region created successfully.');
      this.cancelAddRegion();
      await this.loadMasterDataRegions();
      const created = this.mdRegions.find((item) => item.code === regionCode) ?? this.mdRegions.at(-1);
      if (created) {
        await this.selectMdRegion(created);
      }
      void this.loadRegions();
    } catch (error) {
      console.error('Failed to create region', error);
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'region'));
    } finally {
      this.savingMdRegion = false;
    }
  }

  async saveMdBlock(): Promise<void> {
    const regionId = this.selectedMdRegion?.id;
    if (regionId == null) {
      this.notificationService.openSnackMessage('Select a region before adding an asset.');
      return;
    }

    const blockName = this.newBlockName.trim();
    const blockCode = this.newBlockCode.trim();

    if (!blockName || !blockCode) {
      this.notificationService.openSnackMessage('Asset name and code are required.');
      return;
    }

    this.savingMdBlock = true;
    try {
      await this.assetsService.createPttepAsset({
        regionId,
        assetName: blockName,
        assetCode: blockCode,
        status: this.newBlockStatus.toLowerCase(),
        createdBy: this.newBlockCreatedBy.trim() || this.resolveCreatedBy()
      });
      this.notificationService.openSnackMessage('Asset created successfully.');
      this.cancelAddBlock();
      await this.loadMasterDataBlocks(regionId);
      const created = this.mdBlocks.find((item) => item.code === blockCode) ?? this.mdBlocks.at(-1);
      if (created) {
        await this.selectMdBlock(created);
      }
    } catch (error) {
      console.error('Failed to create block', error);
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'asset'));
    } finally {
      this.savingMdBlock = false;
    }
  }

  async saveMdAsset(): Promise<void> {
    const assetId = this.selectedMdBlock?.id;
    if (assetId == null) {
      this.notificationService.openSnackMessage('Select an asset before adding a facility.');
      return;
    }

    const facilityName = this.newAssetName.trim();
    const facilityCode = this.newAssetCode.trim();

    if (!facilityName || !facilityCode) {
      this.notificationService.openSnackMessage('Facility name and code are required.');
      return;
    }

    this.savingMdAsset = true;
    try {
      await this.assetsService.createPttepFacility({
        assetId,
        facilityName,
        facilityCode,
        status: this.newAssetStatus.toLowerCase(),
        createdBy: this.newAssetCreatedBy.trim() || this.resolveCreatedBy()
      });
      this.notificationService.openSnackMessage('Facility created successfully.');
      this.cancelAddAsset();
      await this.loadMasterDataAssets(assetId);
    } catch (error) {
      console.error('Failed to create asset', error);
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'facility'));
    } finally {
      this.savingMdAsset = false;
    }
  }

  trackByMdId(_index: number, item: MasterDataItem): number {
    return item.id;
  }

  async onRegionChange(regionId: number | null): Promise<void> {
    this.selectedRegionId = regionId;
    this.selectedBlockId = null;
    this.selectedAssetId = null;
    this.blocks = [];
    this.assets = [];
    this.assetCode = '';
    this.hierarchySubmitted = false;

    if (regionId == null) {
      return;
    }

    await this.loadBlocks(regionId);
  }

  async onBlockChange(blockId: number | null): Promise<void> {
    this.selectedBlockId = blockId;
    this.selectedAssetId = null;
    this.assets = [];
    this.assetCode = '';
    this.hierarchySubmitted = false;

    if (blockId == null) {
      return;
    }

    await this.loadAssets(blockId);
  }

  onAssetChange(assetId: number | null): void {
    this.selectedAssetId = assetId;
    const facility = this.findOption(this.assets, assetId);
    this.assetCode = facility?.code || '';
    this.hierarchySubmitted = false;
  }

  async onFolderTemplateChange(templateId: string | null): Promise<void> {
    this.selectedTemplateId = templateId;
    this.templateFolders = [];

    if (templateId == null) {
      return;
    }

    await this.loadTemplatePreview(templateId);
  }

  async saveAssetWorkspace(): Promise<void> {
    const submitted = await this.submitAssetHierarchy();
    if (submitted) {
      this.notificationService.openSnackMessage('Asset workspace creation started successfully.');
      void this.router.navigate(['/assets-dashboard']);
    }
  }

  cancelCreate(): void {
    void this.router.navigate(['/assets-dashboard']);
  }

  previewHierarchy(): void {
    this.hierarchyPreviewRef?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  isCompleted(stepId: number): boolean {
    return stepId < this.currentStep;
  }

  isActive(stepId: number): boolean {
    return stepId === this.currentStep;
  }

  setStep(stepId: number): void {
    this.currentStep = stepId;
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    } else {
      void this.router.navigate(['/assets-dashboard']);
    }
  }

  async nextStep(): Promise<void> {
    if (this.currentStep >= 6) {
      return;
    }

    if (this.currentStep === 2 && !this.hierarchySubmitted) {
      const submitted = await this.submitAssetHierarchy();
      if (!submitted) {
        return;
      }
      this.hierarchySubmitted = true;
      this.notificationService.openSnackMessage('Asset hierarchy creation started successfully.');
    }

    this.currentStep++;
  }

  accessBadgeClass(color: string): string {
    return `access-badge access-badge--${color}`;
  }

  trackById(_index: number, item: { id: number }): number {
    return item.id;
  }

  trackByName(_index: number, item: { name: string }): string {
    return item.name;
  }

  trackByTemplateFolderId(_index: number, item: TemplateFolder): string {
    return item.id;
  }

  trackByLabel(_index: number, item: { label: string }): string {
    return item.label;
  }

  trackByIndex(index: number): number {
    return index;
  }

  private async submitAssetHierarchy(): Promise<boolean> {
    const region = this.selectedRegion?.label?.trim();
    const regionCode = (this.selectedRegion?.regionCode || this.selectedRegion?.code || '').trim();
    const block = this.selectedBlock?.label?.trim();
    const blockcode = (this.selectedBlock?.code || '').trim();
    const facility = this.selectedAsset?.label?.trim();
    const facilitycode = (this.selectedAsset?.code || '').trim();
    const assettemplateid = (this.selectedTemplateId ?? '').trim();

    if (!region || !regionCode || !block || !blockcode || !facility || !facilitycode) {
      this.notificationService.openSnackMessage('Select region, asset, and facility before continuing.');
      return false;
    }

    if (!assettemplateid) {
      this.notificationService.openSnackMessage('Select a folder template before continuing.');
      return false;
    }

    this.saving = true;
    this.hierarchyLoadError = null;

    try {
      await this.assetsService.createAssetHierarchy({
        region,
        regionCode,
        block,
        blockcode,
        facility,
        assetcode: facilitycode,
        assettype: this.facilityType,
        status: this.status,
        accessmodel: this.accessModel,
        retentionperiod: this.retentionPeriod,
        assettemplateid
      });
      return true;
    } catch (error) {
      console.error('Failed to create asset hierarchy', error);
      this.hierarchyLoadError = this.formatHierarchyError(error, 'asset hierarchy');
      this.notificationService.openSnackMessage(this.hierarchyLoadError);
      return false;
    } finally {
      this.saving = false;
    }
  }

  private async loadFolderTemplates(): Promise<void> {
    this.loadingFolderTemplates = true;
    this.templateLoadError = null;

    try {
      const response = await firstValueFrom(
        this.alfrescoService.getNodes(environment.assetsTemplateNodeId)
      );
      this.folderTemplates = this.parseFolderEntries(response);

      if (!this.folderTemplates.length) {
        this.templateLoadError = 'No folder templates found.';
        return;
      }

      const selectedId = this.selectedTemplateId ?? this.folderTemplates[0].id;
      this.selectedTemplateId = selectedId;
      await this.loadTemplatePreview(selectedId);
    } catch (error) {
      console.error('Failed to load folder templates', error);
      this.templateLoadError = 'Failed to load folder templates from Alfresco.';
      this.templateFolders = [...this.fallbackTemplateFolders];
    } finally {
      this.loadingFolderTemplates = false;
    }
  }

  private async loadTemplatePreview(templateId: string): Promise<void> {
    this.loadingTemplatePreview = true;
    this.templateLoadError = null;

    try {
      const response = await firstValueFrom(this.alfrescoService.getNodes(templateId));
      this.templateFolders = this.parseFolderEntries(response);

      if (!this.templateFolders.length) {
        this.templateFolders = [...this.fallbackTemplateFolders];
        this.templateLoadError = 'No folders returned for the selected template.';
      }
    } catch (error) {
      console.error('Failed to load template folders', error);
      this.templateLoadError = 'Failed to load folders for the selected template.';
      this.templateFolders = [...this.fallbackTemplateFolders];
    } finally {
      this.loadingTemplatePreview = false;
    }
  }

  private parseFolderEntries(response: {
    list?: { entries?: Array<{ entry?: { id?: string; name?: string; isFolder?: boolean } }> };
  }): TemplateFolder[] {
    const entries = response?.list?.entries ?? [];
    return entries
      .map((item) => item.entry)
      .filter(
        (entry): entry is { id: string; name: string; isFolder?: boolean } =>
          !!entry?.id && !!entry?.name && entry.isFolder !== false
      )
      .map((entry) => ({ id: entry.id, name: entry.name }));
  }

  private async loadRegions(): Promise<void> {
    this.loadingRegions = true;
    this.hierarchyLoadError = null;

    try {
      this.regions = await this.assetsService.loadPttepRegions(true);
      if (!this.regions.length) {
        this.hierarchyLoadError = 'No regions returned from the server.';
      }
    } catch (error) {
      console.error('Failed to load regions', error);
      this.hierarchyLoadError = this.formatHierarchyError(error, 'regions');
      this.regions = [];
    } finally {
      this.loadingRegions = false;
    }
  }

  private async loadBlocks(regionId: number): Promise<void> {
    this.loadingBlocks = true;
    this.hierarchyLoadError = null;

    try {
      this.blocks = await this.assetsService.loadPttepAssetsByRegion(regionId);
      if (!this.blocks.length) {
        this.hierarchyLoadError = 'No assets returned for the selected region.';
      }
    } catch (error) {
      console.error('Failed to load assets', error);
      this.hierarchyLoadError = this.formatHierarchyError(error, 'assets');
      this.blocks = [];
    } finally {
      this.loadingBlocks = false;
    }
  }

  private async loadAssets(assetId: number): Promise<void> {
    this.loadingAssets = true;
    this.hierarchyLoadError = null;

    try {
      this.assets = await this.assetsService.loadPttepFacilitiesByAsset(assetId);
      if (!this.assets.length) {
        this.hierarchyLoadError = 'No facilities returned for the selected asset.';
      }
    } catch (error) {
      console.error('Failed to load facilities', error);
      this.hierarchyLoadError = this.formatHierarchyError(error, 'facilities');
      this.assets = [];
    } finally {
      this.loadingAssets = false;
    }
  }

  private formatHierarchyError(error: unknown, entity: string): string {
    const err = error as {
      status?: number;
      message?: string;
      error?: string | { message?: string };
    };

    if (err?.status === 401) {
      return 'Session expired. Please sign in again.';
    }

    if (typeof err?.error === 'string' && err.error.trim()) {
      return err.error;
    }

    if (typeof err?.error === 'object' && err.error?.message?.trim()) {
      return err.error.message;
    }

    if (err?.message?.trim()) {
      return err.message;
    }

    return `Failed to load ${entity}.`;
  }

  private findOption(options: AssetHierarchyOption[], id: number | null): AssetHierarchyOption | undefined {
    if (id == null) {
      return undefined;
    }

    return options.find((option) => option.id === id);
  }

  private async loadMasterDataRegions(): Promise<void> {
    this.loadingMdRegions = true;
    try {
      const options = await this.assetsService.loadPttepRegions(true);
      this.mdRegions = options.map((option) => this.mapMasterDataItem(option));
    } catch (error) {
      console.error('Failed to load master data regions', error);
      this.mdRegions = [];
    } finally {
      this.loadingMdRegions = false;
    }
  }

  private async loadMasterDataBlocks(regionId: number): Promise<void> {
    this.loadingMdBlocks = true;
    try {
      const options = await this.assetsService.loadPttepAssetsByRegion(regionId);
      this.mdBlocks = options.map((option) => this.mapMasterDataItem(option));
    } catch (error) {
      console.error('Failed to load master data assets', error);
      this.mdBlocks = [];
    } finally {
      this.loadingMdBlocks = false;
    }
  }

  private async loadMasterDataAssets(assetId: number): Promise<void> {
    this.loadingMdAssets = true;
    try {
      const options = await this.assetsService.loadPttepFacilitiesByAsset(assetId);
      this.mdAssets = options.map((option) => this.mapMasterDataItem(option));
    } catch (error) {
      console.error('Failed to load master data facilities', error);
      this.mdAssets = [];
    } finally {
      this.loadingMdAssets = false;
    }
  }

  private mapMasterDataItem(option: AssetHierarchyOption): MasterDataItem {
    return {
      id: option.id,
      name: option.label,
      code: option.code || option.label,
      status: 'Active'
    };
  }

  private filterMasterData(items: MasterDataItem[], search: string): MasterDataItem[] {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter(
      (item) => item.name.toLowerCase().includes(term) || item.code.toLowerCase().includes(term)
    );
  }

  private resolveCreatedBy(): string {
    return this.authService.getUsername()?.trim() || 'admin';
  }
}
