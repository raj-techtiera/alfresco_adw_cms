import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { AppService } from '@alfresco/aca-shared';
import {
  AuthenticationService,
  NotificationService,
  UserPreferencesService,
  UserPreferenceValues
} from '@alfresco/adf-core';
import { AssetHierarchyOption, AssetsService } from '../../services/assets.service';
import {
  DocnumCategory,
  DocnumCountry,
  DocnumDiscipline,
  DocnumDocumentType,
  DocumentNumberingService
} from '../../services/documentNumbering.service';

type MasterDataStatus = 'Active' | 'Inactive';
type FieldsMenuKey = 'categories' | 'countries' | 'disciplines' | 'documentTypes';

interface MasterDataItem {
  id: number;
  name: string;
  code: string;
  status: MasterDataStatus;
}

interface FieldsMenuItem {
  key: FieldsMenuKey;
  label: string;
  icon: string;
}

@Component({
  selector: 'acs-master-data',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTabsModule
  ],
  templateUrl: './master-data.component.html',
  styleUrl: './master-data.component.scss'
})
export class MasterDataComponent implements OnInit {
  private readonly assetsService = inject(AssetsService);
  private readonly documentNumberingService = inject(DocumentNumberingService);
  private readonly authService = inject(AuthenticationService);
  private readonly notificationService = inject(NotificationService);
  private readonly appService = inject(AppService);
  private readonly userPreferences = inject(UserPreferencesService);
  private readonly destroyRef = inject(DestroyRef);

  isSidenavExpanded = true;
  activeTab = 0;

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

  readonly fieldsMenu: FieldsMenuItem[] = [
    { key: 'categories', label: 'Categories', icon: 'folder_special' },
    { key: 'countries', label: 'Countries', icon: 'public' },
    { key: 'disciplines', label: 'Disciplines', icon: 'architecture' },
    { key: 'documentTypes', label: 'Document Type', icon: 'description' }
  ];
  activeFieldsMenu: FieldsMenuKey = 'categories';
  categories: DocnumCategory[] = [];
  countries: DocnumCountry[] = [];
  disciplines: DocnumDiscipline[] = [];
  documentTypes: DocnumDocumentType[] = [];
  categorySearch = '';
  countrySearch = '';
  disciplineSearch = '';
  documentTypeSearch = '';
  loadingCategories = false;
  loadingCountries = false;
  loadingDisciplines = false;
  loadingDocumentTypes = false;
  showAddCategory = false;
  showAddCountry = false;
  showAddDiscipline = false;
  showAddDocumentType = false;
  editingCategoryId: number | string | null = null;
  editingCountryId: number | string | null = null;
  editingDisciplineId: number | string | null = null;
  editingDocumentTypeId: number | string | null = null;
  savingCategory = false;
  savingCountry = false;
  savingDiscipline = false;
  savingDocumentType = false;
  newCategoryCode = '';
  newCategoryName = '';
  newCategoryDescription = '';
  newCategoryStatus = 'active';
  newCategoryCreatedBy = 'admin';
  newCountryCode = '';
  newCountryName = '';
  newCountryNumberingType = 'CURRENT';
  newCountryStatus = 'active';
  newCountryCreatedBy = 'admin';
  newDisciplineCode = '';
  newDisciplineName = '';
  newDisciplineStatus = 'active';
  newDisciplineCreatedBy = 'admin';
  newDocumentTypeCode = '';
  newDocumentTypeName = '';
  newDocumentTypeCategoryCode = '';
  newDocumentTypeStatus = 'active';
  newDocumentTypeCreatedBy = 'admin';
  readonly numberingTypeOptions = ['CURRENT', 'LEGACY_MOM'];
  readonly fieldsStatusOptions = ['active', 'inactive'];
  private fieldsDataLoaded = false;

  ngOnInit(): void {
    this.userPreferences
      .select<boolean>(UserPreferenceValues.ExpandedSideNavStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((expanded) => {
        this.isSidenavExpanded = expanded ?? true;
      });

    const loadWhenReady = () => {
      if (!this.mdRegions.length && !this.loadingMdRegions) {
        void this.bootstrapHierarchy();
      }
      if (this.activeTab === 1 && !this.fieldsDataLoaded) {
        void this.ensureFieldsDataLoaded();
      }
    };

    this.authService.onLogin.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => loadWhenReady());
    this.authService.onTokenReceived.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => loadWhenReady());

    if (this.authService.isLoggedIn()) {
      loadWhenReady();
    }
  }

  openSidenav(): void {
    this.appService.setAppNavbarMode('expanded');
    this.appService.appNavNarMode$.next('expanded');
    this.appService.toggleAppNavBar$.next();
    this.userPreferences.set(UserPreferenceValues.ExpandedSideNavStatus, true);
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

  get filteredCategories(): DocnumCategory[] {
    const term = this.categorySearch.trim().toLowerCase();
    if (!term) {
      return this.categories;
    }
    return this.categories.filter(
      (item) =>
        item.categoryName.toLowerCase().includes(term) ||
        item.categoryCode.toLowerCase().includes(term) ||
        (item.description || '').toLowerCase().includes(term)
    );
  }

  get filteredCountries(): DocnumCountry[] {
    const term = this.countrySearch.trim().toLowerCase();
    if (!term) {
      return this.countries;
    }
    return this.countries.filter(
      (item) =>
        item.countryName.toLowerCase().includes(term) ||
        item.countryCode.toLowerCase().includes(term) ||
        (item.numberingType || '').toLowerCase().includes(term)
    );
  }

  get filteredDisciplines(): DocnumDiscipline[] {
    const term = this.disciplineSearch.trim().toLowerCase();
    if (!term) {
      return this.disciplines;
    }
    return this.disciplines.filter(
      (item) =>
        item.disciplineName.toLowerCase().includes(term) ||
        item.disciplineCode.toLowerCase().includes(term)
    );
  }

  get filteredDocumentTypes(): DocnumDocumentType[] {
    const term = this.documentTypeSearch.trim().toLowerCase();
    if (!term) {
      return this.documentTypes;
    }
    return this.documentTypes.filter(
      (item) =>
        item.documentTypeName.toLowerCase().includes(term) ||
        item.documentTypeCode.toLowerCase().includes(term) ||
        item.categoryCode.toLowerCase().includes(term)
    );
  }

  onTabChange(index: number): void {
    this.activeTab = index;
    if (index === 1) {
      void this.ensureFieldsDataLoaded();
    }
  }

  selectFieldsMenu(key: FieldsMenuKey): void {
    this.activeFieldsMenu = key;
    if (key === 'categories' && !this.categories.length && !this.loadingCategories) {
      void this.loadCategories();
    }
    if (key === 'countries' && !this.countries.length && !this.loadingCountries) {
      void this.loadCountries();
    }
    if (key === 'disciplines' && !this.disciplines.length && !this.loadingDisciplines) {
      void this.loadDisciplines();
    }
    if (key === 'documentTypes' && !this.documentTypes.length && !this.loadingDocumentTypes) {
      void this.loadDocumentTypes();
    }
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

  toggleAddCategory(): void {
    if (this.showAddCategory && this.editingCategoryId == null) {
      this.cancelAddCategory();
      return;
    }
    this.editingCategoryId = null;
    this.showAddCategory = true;
    this.newCategoryCode = '';
    this.newCategoryName = '';
    this.newCategoryDescription = '';
    this.newCategoryStatus = 'active';
    this.newCategoryCreatedBy = this.resolveCreatedBy();
  }

  toggleAddCountry(): void {
    if (this.showAddCountry && this.editingCountryId == null) {
      this.cancelAddCountry();
      return;
    }
    this.editingCountryId = null;
    this.showAddCountry = true;
    this.newCountryCode = '';
    this.newCountryName = '';
    this.newCountryNumberingType = 'CURRENT';
    this.newCountryStatus = 'active';
    this.newCountryCreatedBy = this.resolveCreatedBy();
  }

  startEditCategory(category: DocnumCategory): void {
    if (category.id == null || category.id === '') {
      this.notificationService.openSnackMessage('Cannot edit this category because it has no id.');
      return;
    }
    this.editingCategoryId = category.id;
    this.showAddCategory = true;
    this.newCategoryCode = category.categoryCode;
    this.newCategoryName = category.categoryName;
    this.newCategoryDescription = category.description || '';
    this.newCategoryStatus = (category.status || 'active').toLowerCase();
    this.newCategoryCreatedBy = category.createdBy || this.resolveCreatedBy();
  }

  startEditCountry(country: DocnumCountry): void {
    if (country.id == null || country.id === '') {
      this.notificationService.openSnackMessage('Cannot edit this country because it has no id.');
      return;
    }
    this.editingCountryId = country.id;
    this.showAddCountry = true;
    this.newCountryCode = country.countryCode;
    this.newCountryName = country.countryName;
    this.newCountryNumberingType = country.numberingType || 'CURRENT';
    this.newCountryStatus = (country.status || 'active').toLowerCase();
    this.newCountryCreatedBy = country.createdBy || this.resolveCreatedBy();
  }

  toggleAddDiscipline(): void {
    if (this.showAddDiscipline && this.editingDisciplineId == null) {
      this.cancelAddDiscipline();
      return;
    }
    this.editingDisciplineId = null;
    this.showAddDiscipline = true;
    this.newDisciplineCode = '';
    this.newDisciplineName = '';
    this.newDisciplineStatus = 'active';
    this.newDisciplineCreatedBy = this.resolveCreatedBy();
  }

  startEditDiscipline(discipline: DocnumDiscipline): void {
    if (discipline.id == null || discipline.id === '') {
      this.notificationService.openSnackMessage('Cannot edit this discipline because it has no id.');
      return;
    }
    this.editingDisciplineId = discipline.id;
    this.showAddDiscipline = true;
    this.newDisciplineCode = discipline.disciplineCode;
    this.newDisciplineName = discipline.disciplineName;
    this.newDisciplineStatus = (discipline.status || 'active').toLowerCase();
    this.newDisciplineCreatedBy = discipline.createdBy || this.resolveCreatedBy();
  }

  cancelAddCategory(): void {
    this.showAddCategory = false;
    this.editingCategoryId = null;
    this.newCategoryCode = '';
    this.newCategoryName = '';
    this.newCategoryDescription = '';
    this.newCategoryStatus = 'active';
    this.newCategoryCreatedBy = this.resolveCreatedBy();
  }

  cancelAddCountry(): void {
    this.showAddCountry = false;
    this.editingCountryId = null;
    this.newCountryCode = '';
    this.newCountryName = '';
    this.newCountryNumberingType = 'CURRENT';
    this.newCountryStatus = 'active';
    this.newCountryCreatedBy = this.resolveCreatedBy();
  }

  cancelAddDiscipline(): void {
    this.showAddDiscipline = false;
    this.editingDisciplineId = null;
    this.newDisciplineCode = '';
    this.newDisciplineName = '';
    this.newDisciplineStatus = 'active';
    this.newDisciplineCreatedBy = this.resolveCreatedBy();
  }

  toggleAddDocumentType(): void {
    if (this.showAddDocumentType && this.editingDocumentTypeId == null) {
      this.cancelAddDocumentType();
      return;
    }
    this.editingDocumentTypeId = null;
    this.showAddDocumentType = true;
    this.newDocumentTypeCode = '';
    this.newDocumentTypeName = '';
    this.newDocumentTypeCategoryCode = this.categories[0]?.categoryCode || '';
    this.newDocumentTypeStatus = 'active';
    this.newDocumentTypeCreatedBy = this.resolveCreatedBy();
    if (!this.categories.length && !this.loadingCategories) {
      void this.loadCategories();
    }
  }

  startEditDocumentType(documentType: DocnumDocumentType): void {
    if (documentType.id == null || documentType.id === '') {
      this.notificationService.openSnackMessage('Cannot edit this discipline type because it has no id.');
      return;
    }
    this.editingDocumentTypeId = documentType.id;
    this.showAddDocumentType = true;
    this.newDocumentTypeCode = documentType.documentTypeCode;
    this.newDocumentTypeName = documentType.documentTypeName;
    this.newDocumentTypeCategoryCode = documentType.categoryCode;
    this.newDocumentTypeStatus = (documentType.status || 'active').toLowerCase();
    this.newDocumentTypeCreatedBy = documentType.createdBy || this.resolveCreatedBy();
    if (!this.categories.length && !this.loadingCategories) {
      void this.loadCategories();
    }
  }

  cancelAddDocumentType(): void {
    this.showAddDocumentType = false;
    this.editingDocumentTypeId = null;
    this.newDocumentTypeCode = '';
    this.newDocumentTypeName = '';
    this.newDocumentTypeCategoryCode = '';
    this.newDocumentTypeStatus = 'active';
    this.newDocumentTypeCreatedBy = this.resolveCreatedBy();
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
      console.error('Failed to create asset', error);
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
      console.error('Failed to create facility', error);
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'facility'));
    } finally {
      this.savingMdAsset = false;
    }
  }

  async saveCategory(): Promise<void> {
    const categoryCode = this.newCategoryCode.trim();
    const categoryName = this.newCategoryName.trim();

    if (!categoryCode || !categoryName) {
      this.notificationService.openSnackMessage('Category code and name are required.');
      return;
    }

    const payload = {
      categoryCode,
      categoryName,
      description: this.newCategoryDescription.trim(),
      status: this.newCategoryStatus,
      createdBy: this.newCategoryCreatedBy.trim() || this.resolveCreatedBy()
    };

    this.savingCategory = true;
    try {
      if (this.editingCategoryId != null) {
        await this.documentNumberingService.updateCategory(this.editingCategoryId, payload);
        this.notificationService.openSnackMessage('Category updated successfully.');
      } else {
        await this.documentNumberingService.createCategory(payload);
        this.notificationService.openSnackMessage('Category created successfully.');
      }
      this.cancelAddCategory();
      await this.loadCategories();
    } catch (error) {
      console.error('Failed to save category', error);
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'category'));
    } finally {
      this.savingCategory = false;
    }
  }

  async saveCountry(): Promise<void> {
    const countryCode = this.newCountryCode.trim();
    const countryName = this.newCountryName.trim();

    if (!countryCode || !countryName) {
      this.notificationService.openSnackMessage('Country code and name are required.');
      return;
    }

    const payload = {
      countryCode,
      countryName,
      numberingType: this.newCountryNumberingType,
      status: this.newCountryStatus,
      createdBy: this.newCountryCreatedBy.trim() || this.resolveCreatedBy()
    };

    this.savingCountry = true;
    try {
      if (this.editingCountryId != null) {
        await this.documentNumberingService.updateCountry(this.editingCountryId, payload);
        this.notificationService.openSnackMessage('Country updated successfully.');
      } else {
        await this.documentNumberingService.createCountry(payload);
        this.notificationService.openSnackMessage('Country created successfully.');
      }
      this.cancelAddCountry();
      await this.loadCountries();
    } catch (error) {
      console.error('Failed to save country', error);
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'country'));
    } finally {
      this.savingCountry = false;
    }
  }

  async saveDiscipline(): Promise<void> {
    const disciplineCode = this.newDisciplineCode.trim();
    const disciplineName = this.newDisciplineName.trim();

    if (!disciplineCode || !disciplineName) {
      this.notificationService.openSnackMessage('Discipline code and name are required.');
      return;
    }

    const payload = {
      disciplineCode,
      disciplineName,
      status: this.newDisciplineStatus,
      createdBy: this.newDisciplineCreatedBy.trim() || this.resolveCreatedBy()
    };

    this.savingDiscipline = true;
    try {
      if (this.editingDisciplineId != null) {
        await this.documentNumberingService.updateDiscipline(this.editingDisciplineId, payload);
        this.notificationService.openSnackMessage('Discipline updated successfully.');
      } else {
        await this.documentNumberingService.createDiscipline(payload);
        this.notificationService.openSnackMessage('Discipline created successfully.');
      }
      this.cancelAddDiscipline();
      await this.loadDisciplines();
    } catch (error) {
      console.error('Failed to save discipline', error);
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'discipline'));
    } finally {
      this.savingDiscipline = false;
    }
  }

  async saveDocumentType(): Promise<void> {
    const documentTypeCode = this.newDocumentTypeCode.trim();
    const documentTypeName = this.newDocumentTypeName.trim();
    const categoryCode = this.newDocumentTypeCategoryCode.trim();

    if (!documentTypeCode || !documentTypeName || !categoryCode) {
      this.notificationService.openSnackMessage('Discipline type code, name, and category are required.');
      return;
    }

    const payload = {
      documentTypeCode,
      documentTypeName,
      categoryCode,
      status: this.newDocumentTypeStatus,
      createdBy: this.newDocumentTypeCreatedBy.trim() || this.resolveCreatedBy()
    };

    this.savingDocumentType = true;
    try {
      if (this.editingDocumentTypeId != null) {
        await this.documentNumberingService.updateDocumentType(this.editingDocumentTypeId, payload);
        this.notificationService.openSnackMessage('Discipline type updated successfully.');
      } else {
        await this.documentNumberingService.createDocumentType(payload);
        this.notificationService.openSnackMessage('Discipline type created successfully.');
      }
      this.cancelAddDocumentType();
      await this.loadDocumentTypes();
    } catch (error) {
      console.error('Failed to save document type', error);
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'discipline type'));
    } finally {
      this.savingDocumentType = false;
    }
  }

  trackByMdId(_index: number, item: MasterDataItem): number {
    return item.id;
  }

  trackByCategoryCode(_index: number, item: DocnumCategory): string {
    return item.categoryCode || String(item.id ?? _index);
  }

  trackByCountryCode(_index: number, item: DocnumCountry): string {
    return item.countryCode || String(item.id ?? _index);
  }

  trackByDisciplineCode(_index: number, item: DocnumDiscipline): string {
    return item.disciplineCode || String(item.id ?? _index);
  }

  trackByDocumentTypeCode(_index: number, item: DocnumDocumentType): string {
    return `${item.categoryCode}:${item.documentTypeCode}` || String(item.id ?? _index);
  }

  private async ensureFieldsDataLoaded(): Promise<void> {
    if (this.fieldsDataLoaded) {
      return;
    }
    this.fieldsDataLoaded = true;
    await Promise.all([
      this.loadCategories(),
      this.loadCountries(),
      this.loadDisciplines(),
      this.loadDocumentTypes()
    ]);
  }

  private async loadCategories(): Promise<void> {
    this.loadingCategories = true;
    try {
      this.categories = await this.documentNumberingService.getCategories();
    } catch (error) {
      console.error('Failed to load categories', error);
      this.categories = [];
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'categories'));
    } finally {
      this.loadingCategories = false;
    }
  }

  private async loadCountries(): Promise<void> {
    this.loadingCountries = true;
    try {
      this.countries = await this.documentNumberingService.getCountries();
    } catch (error) {
      console.error('Failed to load countries', error);
      this.countries = [];
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'countries'));
    } finally {
      this.loadingCountries = false;
    }
  }

  private async loadDisciplines(): Promise<void> {
    this.loadingDisciplines = true;
    try {
      this.disciplines = await this.documentNumberingService.getDisciplines();
    } catch (error) {
      console.error('Failed to load disciplines', error);
      this.disciplines = [];
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'disciplines'));
    } finally {
      this.loadingDisciplines = false;
    }
  }

  private async loadDocumentTypes(): Promise<void> {
    this.loadingDocumentTypes = true;
    try {
      // Load all document types (no categoryCode filter) — matches GET /document-types
      this.documentTypes = await this.documentNumberingService.getDocumentTypes();
    } catch (error) {
      console.error('Failed to load document types', error);
      this.documentTypes = [];
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'discipline types'));
    } finally {
      this.loadingDocumentTypes = false;
    }
  }

  private async bootstrapHierarchy(): Promise<void> {
    await this.loadMasterDataRegions();
    if (this.mdRegions.length) {
      await this.selectMdRegion(this.mdRegions[0]);
    }
  }

  private async loadMasterDataRegions(): Promise<void> {
    this.loadingMdRegions = true;
    try {
      const options = await this.assetsService.loadPttepRegions(true);
      this.mdRegions = options.map((option) => this.mapMasterDataItem(option));
    } catch (error) {
      console.error('Failed to load master data regions', error);
      this.mdRegions = [];
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'regions'));
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
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'assets'));
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
      this.notificationService.openSnackMessage(this.formatHierarchyError(error, 'facilities'));
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
}
