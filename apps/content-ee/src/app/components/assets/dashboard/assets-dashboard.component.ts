import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import {
  AssetFolderRow,
  AssetTreeNode,
  AssetsHierarchySelection,
  AssetsService,
  ASSET_ACCESS_MODEL_DEFAULT,
  ASSET_RETENTION_PERIOD_DEFAULT,
  readAssetsHierarchySelection,
  writeAssetsHierarchySelection
} from '../../../services/assets.service';
import { FilterConfig, KpiCard, DetailField, DetailTab } from '../../../interface/assets';
@Component({
  selector: 'acs-assets-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './assets-dashboard.component.html',
  styleUrl: './assets-dashboard.component.scss'
})
export class AssetsDashboardComponent implements OnInit {
  treeData: AssetTreeNode[] = [];
  folderRows: AssetFolderRow[] = [];
  breadcrumbs = ['Home', 'Asset Repository'];
  loadingTree = false;
  loadingFolders = false;
  loadError: string | null = null;

  readonly actionButtons = [
    //{ label: '+ Add Facility', icon: 'add' },
    //{ label: 'Save Hierarchy', icon: 'cloud_upload' },
    //{ label: 'Export Structure', icon: 'upload' }
  ];

  filters: FilterConfig[] = [
    { label: 'Region', key: 'region', options: [] },
    { label: 'Asset/Field', key: 'Asset_Field', options: [] },
    { label: 'Facility', key: 'facility', options: [] }
    // { label: 'Status', key: 'status', options: ['Active', 'Inactive', 'Archived'] }
  ];

  readonly kpiCards: KpiCard[] = [
    { value: '0', label: 'Total Assets', sub: 'Across all regions', icon: 'business', iconBg: 'color-mix(in srgb, var(--adw-color-brand-primary, #1b1464) 10%, white)', iconColor: 'var(--adw-color-brand-primary, #1b1464)' },
    { value: '0', label: 'Active Folders', sub: 'This facility', icon: 'folder_open', iconBg: '#F0FDF4', iconColor: '#15803D' },
    { value: '0', label: 'Native Restricted', sub: 'Access controlled', icon: 'lock', iconBg: '#FFF7ED', iconColor: '#C2410C' },
    { value: '0', label: 'Recently Updated', sub: 'Last 30 days', icon: 'schedule', iconBg: '#F5F3FF', iconColor: '#7C3AED' }
  ];

  detailFields: DetailField[] = [];
  permissionFields: DetailField[] = [];
  retentionFields: DetailField[] = [];
  auditFields: DetailField[] = [];
  selectedFacilityLabel = '';

  // readonly quickActions: QuickAction[] = [
  //   { label: 'Open Folder', sub: 'Open this facility root folder', icon: 'folder_open' },
  //   { label: 'Copy Path', sub: 'Copy full path to clipboard', icon: 'content_copy' },
  //   { label: 'Add Sub-Facility', sub: 'Create a new facility under this block', icon: 'add_circle' }
  // ];

  // readonly quickAccessItems = [
  //   { label: 'My Recent', icon: 'schedule' },
  //   { label: 'Pinned Assets', icon: 'bookmark' },
  //   { label: 'Saved Searches', icon: 'search' }
  // ];

  readonly hierarchyIconLegend = [
    { type: 'region', label: 'Region', icon: 'place' },
    { type: 'block', label: 'Asset/Field', icon: 'business' },
    { type: 'facility', label: 'Facility', icon: 'directions_boat' }
  ];

  readonly tabs: DetailTab[] = ['Details', 'Permissions', 'Retention & Compliance', 'Audit Trail'];

  expandedIds = new Set<string>();
  activeId = '';
  activeTab: DetailTab = 'Details';
  selectedRows = new Set<string>();
  search = '';
  regionFilter = '';
  blockFilter = '';
  facilityFilter = '';
  statusFilter = 'Active';
  expandCollapseBusy = false;

  /** Selection to restore when returning from Project Explorer (router state or session). */
  private pendingRestore: AssetsHierarchySelection | null = null;

  constructor(
    private readonly router: Router,
    private readonly assetsService: AssetsService
  ) {
    const navState =
      this.router.getCurrentNavigation()?.extras?.state ??
      (typeof history !== 'undefined' ? history.state : null);
    const fromState = navState?.['assetsHierarchySelection'] as AssetsHierarchySelection | undefined;
    this.pendingRestore = fromState ?? readAssetsHierarchySelection();
  }

  ngOnInit(): void {
    void this.loadHierarchy();
  }

  get filterValues(): Record<FilterConfig['key'], string> {
    return {
      region: this.regionFilter,
      Asset_Field: this.blockFilter,
      facility: this.facilityFilter,
      status: this.statusFilter
    };
  }

  get filteredTreeData(): AssetTreeNode[] {
    const term = this.search.trim().toLowerCase();
    if (!term) {
      return this.treeData;
    }
    return this.filterTreeNodes(this.treeData, term);
  }

  get totalAssetsCount(): number {
    let count = 0;
    const walk = (nodes: AssetTreeNode[]) => {
      for (const node of nodes) {
        if (node.type === 'facility') {
          count++;
        }
        if (node.children?.length) {
          walk(node.children);
        }
      }
    };
    walk(this.treeData);
    return count;
  }

  isExpanded(id: string): boolean {
    return this.expandedIds.has(id);
  }

  isActive(id: string): boolean {
    return this.activeId === id;
  }

  isRowSelected(id: string): boolean {
    return this.selectedRows.has(id);
  }
  openFolder(id: string): void {
    this.persistCurrentSelection();
    void this.router.navigate([`/projects/${id}`], {
      state: { explorerContext: 'assets' }
    });
  }

  hasChildren(node: AssetTreeNode): boolean {
    if (node.type === 'facility') {
      return false;
    }
    if (node.childrenLoaded) {
      return (node.children?.length ?? 0) > 0;
    }
    return true;
  }

  nodeIcon(node: AssetTreeNode): string {
    switch (node.type) {
      case 'region':
        return 'place';
      case 'block':
        return 'business';
      case 'facility':
        return 'directions_boat';
      default:
        return 'folder';
    }
  }

  toggleExpand(id: string): void {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
    } else {
      this.expandedIds.add(id);
    }
    this.expandedIds = new Set(this.expandedIds);
  }

  setActiveId(id: string): void {
    this.activeId = id;
  }

  async onNodeClick(node: AssetTreeNode): Promise<void> {
    this.setActiveId(node.id);
    await this.updateSelectionContext(node);

    if (node.type === 'facility') {
      return;
    }

    if (!node.childrenLoaded) {
      await this.loadNodeChildren(node);
    }

    if (this.hasChildren(node)) {
      this.toggleExpand(node.id);
    }
  }

  /** True when every loaded expandable node is expanded and no lazy children remain. */
  get isAllExpanded(): boolean {
    if (!this.treeData.length) {
      return false;
    }
    if (this.hasUnloadedExpandableNodes(this.treeData)) {
      return false;
    }
    const expandableIds = this.collectExpandableNodeIds(this.treeData);
    return expandableIds.length > 0 && expandableIds.every((id) => this.expandedIds.has(id));
  }

  async toggleExpandCollapseAll(): Promise<void> {
    if (this.expandCollapseBusy || !this.treeData.length) {
      return;
    }
    if (this.isAllExpanded) {
      this.collapseAll();
      return;
    }
    await this.expandAll();
  }

  collapseAll(): void {
    this.expandedIds = new Set();
  }

  async expandAll(): Promise<void> {
    if (this.expandCollapseBusy) {
      return;
    }
    this.expandCollapseBusy = true;
    try {
      const expandableIds = new Set<string>();
      const loadAndCollect = async (nodes: AssetTreeNode[]) => {
        for (const node of nodes) {
          if (node.type === 'facility') {
            continue;
          }
          if (!node.childrenLoaded) {
            await this.loadNodeChildren(node);
          }
          const children = node.children ?? [];
          if (children.length > 0) {
            expandableIds.add(node.id);
            await loadAndCollect(children);
          }
        }
      };
      await loadAndCollect(this.treeData);
      this.expandedIds = expandableIds;
    } finally {
      this.expandCollapseBusy = false;
    }
  }

  private hasUnloadedExpandableNodes(nodes: AssetTreeNode[]): boolean {
    for (const node of nodes) {
      if (node.type === 'facility') {
        continue;
      }
      if (!node.childrenLoaded) {
        return true;
      }
      if (node.children?.length && this.hasUnloadedExpandableNodes(node.children)) {
        return true;
      }
    }
    return false;
  }

  private collectExpandableNodeIds(nodes: AssetTreeNode[]): string[] {
    const ids: string[] = [];
    for (const node of nodes) {
      if (node.type === 'facility') {
        continue;
      }
      const children = node.children ?? [];
      if (node.childrenLoaded && children.length > 0) {
        ids.push(node.id);
        ids.push(...this.collectExpandableNodeIds(children));
      }
    }
    return ids;
  }

  toggleRow(id: string): void {
    if (this.selectedRows.has(id)) {
      this.selectedRows.delete(id);
    } else {
      this.selectedRows.add(id);
    }
    this.selectedRows = new Set(this.selectedRows);
  }

  setFilter(key: FilterConfig['key'], value: string): void {
    void this.applyFilter(key, value);
  }

  filterPlaceholder(key: FilterConfig['key']): string {
    switch (key) {
      case 'region':
        return 'All regions';
      case 'Asset_Field':
        return 'All assets';
      case 'facility':
        return 'All facilities';
      default:
        return 'All';
    }
  }

  clearFilters(): void {
    const path = this.findNodePath(this.treeData, this.activeId);
    const region = path.find((node) => node.type === 'region');
    const block = path.find((node) => node.type === 'block');
    const facility = path.find((node) => node.type === 'facility');
    this.regionFilter = region?.label ?? '';
    this.blockFilter = block?.label ?? '';
    this.facilityFilter = facility?.label ?? '';
    this.statusFilter = 'Active';
    this.updateFilterOptions();
  }

  accessBadgeClass(color: string): string {
    return `access-badge access-badge--${color}`;
  }

  createAssetWorkspace(): void {
    void this.router.navigate(['/create-asset']);
  }

  trackById(_index: number, item: { id: string }): string {
    return item.id;
  }

  trackByLabel(_index: number, item: { label: string }): string {
    return item.label;
  }

  private async loadHierarchy(): Promise<void> {
    this.loadingTree = true;
    this.loadError = null;
    try {
      this.treeData = await this.assetsService.loadRegions();
      this.updateFilterOptions();
      this.kpiCards[0].value = String(this.treeData.length);

      if (this.treeData.length === 0) {
        return;
      }

      const restored = await this.restoreHierarchySelection(this.pendingRestore);
      this.pendingRestore = null;
      if (restored) {
        return;
      }

      const firstRegion = this.treeData[0];
      this.expandedIds = new Set([firstRegion.id]);
      await this.loadNodeChildren(firstRegion);
      const firstBlock = firstRegion.children?.[0];
      if (firstBlock) {
        this.expandedIds.add(firstBlock.id);
        await this.loadNodeChildren(firstBlock);
        const firstFacility = firstBlock.children?.[0];
        if (firstFacility) {
          this.activeId = firstFacility.id;
          await this.updateSelectionContext(firstFacility);
        } else {
          this.activeId = firstBlock.id;
          await this.updateSelectionContext(firstBlock);
        }
      } else {
        this.activeId = firstRegion.id;
        await this.updateSelectionContext(firstRegion);
      }
    } catch (error) {
      this.loadError = this.readErrorMessage(error);
      this.treeData = [];
    } finally {
      this.loadingTree = false;
    }
  }

  /** Expand and select the previously opened region / field / facility path. */
  private async restoreHierarchySelection(selection: AssetsHierarchySelection | null): Promise<boolean> {
    if (!selection?.regionId && !selection?.nodeId) {
      return false;
    }

    const regionId = selection.regionId ?? selection.nodeId;
    const region = this.treeData.find((node) => node.id === regionId);
    if (!region) {
      return false;
    }

    this.expandedIds = new Set([region.id]);
    await this.loadNodeChildren(region);

    if (!selection.blockId) {
      this.activeId = region.id;
      await this.updateSelectionContext(region);
      return true;
    }

    const block = (region.children ?? []).find((node) => node.id === selection.blockId);
    if (!block) {
      this.activeId = region.id;
      await this.updateSelectionContext(region);
      return true;
    }

    this.expandedIds.add(block.id);
    this.expandedIds = new Set(this.expandedIds);
    await this.loadNodeChildren(block);

    if (!selection.facilityId) {
      this.activeId = block.id;
      await this.updateSelectionContext(block);
      return true;
    }

    const facility = (block.children ?? []).find((node) => node.id === selection.facilityId);
    if (facility) {
      this.activeId = facility.id;
      await this.updateSelectionContext(facility);
      return true;
    }

    this.activeId = block.id;
    await this.updateSelectionContext(block);
    return true;
  }

  private persistCurrentSelection(): void {
    if (!this.activeId) {
      return;
    }
    const path = this.findNodePath(this.treeData, this.activeId);
    if (!path.length) {
      return;
    }
    writeAssetsHierarchySelection({
      regionId: path.find((item) => item.type === 'region')?.id,
      blockId: path.find((item) => item.type === 'block')?.id,
      facilityId: path.find((item) => item.type === 'facility')?.id,
      nodeId: this.activeId
    });
  }

  private async loadNodeChildren(node: AssetTreeNode): Promise<void> {
    if (node.childrenLoaded || node.type === 'facility') {
      return;
    }

    try {
      if (node.type === 'region') {
        node.children = await this.assetsService.loadBlocks(node.id);
      } else if (node.type === 'block') {
        node.children = await this.assetsService.loadFacilities(node.id);
      }
      node.childrenLoaded = true;
      this.updateFilterOptions();
      this.kpiCards[0].value = String(this.totalAssetsCount);
    } catch (error) {
      this.loadError = this.readErrorMessage(error);
      node.children = [];
      node.childrenLoaded = true;
    }
  }

  private async updateSelectionContext(node: AssetTreeNode): Promise<void> {
    const path = this.findNodePath(this.treeData, node.id);
    const region = path.find((item) => item.type === 'region');
    const block = path.find((item) => item.type === 'block');
    const facility = path.find((item) => item.type === 'facility');

    this.regionFilter = region?.label ?? '';
    this.blockFilter = block?.label ?? '';
    this.facilityFilter = facility?.label ?? '';
    this.breadcrumbs = ['Home', 'Asset Repository', ...path.map((item) => item.label)];
    this.updateFilterOptions();
    writeAssetsHierarchySelection({
      regionId: region?.id,
      blockId: block?.id,
      facilityId: facility?.id,
      nodeId: node.id
    });

    const detailsNode = facility ?? node;
    const enriched = await this.assetsService.loadNodeDetails(detailsNode.id);
    if (enriched) {
      for (const [key, value] of Object.entries(enriched)) {
        if (value != null && value !== '') {
          (detailsNode as unknown as Record<string, unknown>)[key] = value;
        }
      }
    }

    if (facility) {
      this.selectedFacilityLabel = facility.label;
      await this.loadFacilityFolders(facility.id);
      this.detailFields = [
        { icon: 'business', label: 'Asset Code', value: facility.code || this.extractAssetCode(facility.label) },
        { icon: 'business', label: 'Facility Type', value: facility.facilityType || 'Offshore Production Platform' },
        { icon: 'place', label: 'Region', value: region?.label ?? '—' },
        { icon: 'category', label: 'Asset / Field', value: block?.label ?? '—' },
        { icon: 'business', label: 'Facility', value: facility.label },
        { icon: 'check_circle', label: 'Status', value: facility.status || 'Active', isStatus: true }
      ];
      this.permissionFields = [
        {
          icon: 'shield',
          label: 'Access Model',
          value: facility.accessModel || ASSET_ACCESS_MODEL_DEFAULT
        }
      ];
      this.retentionFields = [
        {
          icon: 'calendar_today',
          label: 'Retention Period',
          value: facility.retentionPeriod || ASSET_RETENTION_PERIOD_DEFAULT
        }
      ];
      this.auditFields = this.buildAuditFields(facility);
      return;
    }

    this.selectedFacilityLabel = node.type === 'block' ? `${block?.label ?? node.label} facilities` : '';
    this.folderRows = [];
    this.kpiCards[1].value = '0';
    this.detailFields = [
      { icon: 'folder', label: 'Name', value: node.label },
      { icon: 'category', label: 'Type', value: node.type === 'region' ? 'Region' : 'Block / Field' },
      { icon: 'place', label: 'Region', value: region?.label ?? node.label },
      { icon: 'check_circle', label: 'Status', value: node.status || 'Active', isStatus: true }
    ];
    this.permissionFields = [
      {
        icon: 'shield',
        label: 'Access Model',
        value: node.accessModel || ASSET_ACCESS_MODEL_DEFAULT
      }
    ];
    this.retentionFields = [
      {
        icon: 'calendar_today',
        label: 'Retention Period',
        value: node.retentionPeriod || ASSET_RETENTION_PERIOD_DEFAULT
      }
    ];
    this.auditFields = this.buildAuditFields(node);
  }

  private buildAuditFields(node: AssetTreeNode): DetailField[] {
    return [
      { icon: 'event', label: 'Created at', value: this.formatAuditDate(node.createdAt) },
      { icon: 'person', label: 'Created by', value: node.createdBy || '—' },
      { icon: 'update', label: 'Modified at', value: this.formatAuditDate(node.modifiedAt) },
      { icon: 'person_outline', label: 'Modified by', value: node.modifiedBy || '—' }
    ];
  }

  private formatAuditDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const normalized = value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private async loadFacilityFolders(facilityId: string): Promise<void> {
    this.loadingFolders = true;
    try {
      this.folderRows = await this.assetsService.loadFacilityFolders(facilityId);
      this.kpiCards[1].value = String(this.folderRows.length);
    } catch (error) {
      this.loadError = this.readErrorMessage(error);
      this.folderRows = [];
      this.kpiCards[1].value = '0';
    } finally {
      this.loadingFolders = false;
    }
  }

  private async applyFilter(key: FilterConfig['key'], value: string): Promise<void> {
    switch (key) {
      case 'region': {
        this.regionFilter = value;
        this.blockFilter = '';
        this.facilityFilter = '';
        const region = this.findRegionByLabel(value);
        if (region) {
          await this.selectTreeNode(region);
        } else {
          this.updateFilterOptions();
        }
        break;
      }
      case 'Asset_Field': {
        this.blockFilter = value;
        this.facilityFilter = '';
        const block = this.findBlockByLabel(value, this.regionFilter);
        if (block) {
          await this.selectTreeNode(block);
        } else {
          this.updateFilterOptions();
          this.normalizeDependentFilters();
          this.updateFilterOptions();
        }
        break;
      }
      case 'facility': {
        this.facilityFilter = value;
        const facility = this.findFacilityByLabel(value);
        if (facility) {
          await this.selectTreeNode(facility);
        } else {
          this.updateFilterOptions();
        }
        break;
      }
      case 'status':
        this.statusFilter = value;
        break;
    }
  }

  /** Expand ancestors, highlight node in the tree, and refresh detail context. */
  private async selectTreeNode(node: AssetTreeNode): Promise<void> {
    // Ensure parents exist in memory before path lookup for newly loaded branches.
    if (node.type === 'region') {
      await this.loadNodeChildren(node);
    } else if (node.type === 'block') {
      const region = this.findRegionByLabel(this.regionFilter);
      if (region) {
        await this.loadNodeChildren(region);
      }
      await this.loadNodeChildren(node);
    } else if (node.type === 'facility') {
      const block = this.findBlockByLabel(this.blockFilter, this.regionFilter);
      if (block) {
        const region = this.findRegionByLabel(this.regionFilter);
        if (region) {
          await this.loadNodeChildren(region);
        }
        await this.loadNodeChildren(block);
      }
    }

    const path = this.findNodePath(this.treeData, node.id);
    for (const item of path) {
      if (item.type === 'facility') {
        continue;
      }
      if (!item.childrenLoaded) {
        await this.loadNodeChildren(item);
      }
      this.expandedIds.add(item.id);
    }
    this.expandedIds = new Set(this.expandedIds);
    this.setActiveId(node.id);
    await this.updateSelectionContext(node);
  }

  private updateFilterOptions(): void {
    const regions = this.treeData.map((node) => node.label);
    const selectedRegion = this.findRegionByLabel(this.regionFilter);
    const blocks = selectedRegion
      ? (selectedRegion.children ?? []).filter((node) => node.type === 'block').map((node) => node.label)
      : [];

    const selectedBlock = this.findBlockByLabel(this.blockFilter, this.regionFilter);
    let facilities: string[] = [];
    if (selectedBlock) {
      facilities = (selectedBlock.children ?? [])
        .filter((node) => node.type === 'facility')
        .map((node) => node.label);
    } else if (selectedRegion) {
      // Region selected but no asset yet — show facilities under that region's loaded assets only.
      facilities = (selectedRegion.children ?? [])
        .filter((node) => node.type === 'block')
        .flatMap((block) => (block.children ?? []).filter((node) => node.type === 'facility'))
        .map((node) => node.label);
    }

    this.filters = [
      { label: 'Region', key: 'region', options: regions },
      { label: 'Asset/Field', key: 'Asset_Field', options: this.uniqueLabels(blocks) },
      { label: 'Facility', key: 'facility', options: this.uniqueLabels(facilities) }
      // { label: 'Status', key: 'status', options: ['Active', 'Inactive', 'Archived'] }
    ];
  }

  /** Drop Asset/Facility selections that are outside the current region/asset scope. */
  private normalizeDependentFilters(): void {
    const blockOptions = this.filters.find((f) => f.key === 'Asset_Field')?.options ?? [];
    if (this.blockFilter && !blockOptions.includes(this.blockFilter)) {
      this.blockFilter = '';
      this.facilityFilter = '';
    }

    const facilityOptions = this.filters.find((f) => f.key === 'facility')?.options ?? [];
    if (this.facilityFilter && !facilityOptions.includes(this.facilityFilter)) {
      this.facilityFilter = '';
    }
  }

  private findRegionByLabel(label: string): AssetTreeNode | undefined {
    const value = (label || '').trim();
    if (!value) {
      return undefined;
    }
    return this.treeData.find((node) => node.type === 'region' && node.label === value);
  }

  private findBlockByLabel(label: string, regionLabel?: string): AssetTreeNode | undefined {
    const value = (label || '').trim();
    if (!value) {
      return undefined;
    }
    const region = this.findRegionByLabel(regionLabel || this.regionFilter);
    const blocks = region
      ? (region.children ?? []).filter((node) => node.type === 'block')
      : this.collectNodesByType('block');
    return blocks.find((node) => node.label === value);
  }

  private findFacilityByLabel(label: string): AssetTreeNode | undefined {
    const value = (label || '').trim();
    if (!value) {
      return undefined;
    }
    const block = this.findBlockByLabel(this.blockFilter, this.regionFilter);
    if (block) {
      return (block.children ?? []).find((node) => node.type === 'facility' && node.label === value);
    }
    const region = this.findRegionByLabel(this.regionFilter);
    if (!region) {
      return undefined;
    }
    for (const asset of region.children ?? []) {
      if (asset.type !== 'block') {
        continue;
      }
      const match = (asset.children ?? []).find((node) => node.type === 'facility' && node.label === value);
      if (match) {
        return match;
      }
    }
    return undefined;
  }

  private uniqueLabels(labels: string[]): string[] {
    return [...new Set(labels.filter(Boolean))];
  }

  private collectNodesByType(type: AssetTreeNode['type']): AssetTreeNode[] {
    const nodes: AssetTreeNode[] = [];
    const walk = (items: AssetTreeNode[]) => {
      for (const item of items) {
        if (item.type === type) {
          nodes.push(item);
        }
        if (item.children?.length) {
          walk(item.children);
        }
      }
    };
    walk(this.treeData);
    return nodes;
  }

  private findNodePath(nodes: AssetTreeNode[], targetId: string, trail: AssetTreeNode[] = []): AssetTreeNode[] {
    for (const node of nodes) {
      const nextTrail = [...trail, node];
      if (node.id === targetId) {
        return nextTrail;
      }
      if (node.children?.length) {
        const childPath = this.findNodePath(node.children, targetId, nextTrail);
        if (childPath.length) {
          return childPath;
        }
      }
    }
    return [];
  }

  private filterTreeNodes(nodes: AssetTreeNode[], term: string): AssetTreeNode[] {
    const result: AssetTreeNode[] = [];

    for (const node of nodes) {
      const childMatches = node.children ? this.filterTreeNodes(node.children, term) : [];
      const selfMatches = node.label.toLowerCase().includes(term);
      if (!selfMatches && childMatches.length === 0) {
        continue;
      }
      result.push({
        ...node,
        children: childMatches.length ? childMatches : node.children
      });
    }

    return result;
  }

  private extractAssetCode(label: string): string {
    const match = label.match(/^(\S+)/);
    return match?.[1] ?? label;
  }

  private readErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Failed to load asset hierarchy.';
  }
}
