import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

const ACS_NODES_API_BASE = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';
const PTTEP_SERVICE_BASE = '/alfresco/service/pttep';

/** Same options as Create Asset Hierarchy form. */
export const ASSET_ACCESS_MODEL_OPTIONS = [
  'Project Team & Restricted',
  'Project Team Only',
  'Public',
  'Restricted'
] as const;

export const ASSET_RETENTION_PERIOD_OPTIONS = [
  '10 Years After Project Close',
  '7 Years After Project Close',
  '5 Years After Project Close',
  'Permanent'
] as const;

export const ASSET_ACCESS_MODEL_DEFAULT = ASSET_ACCESS_MODEL_OPTIONS[0];
export const ASSET_RETENTION_PERIOD_DEFAULT = ASSET_RETENTION_PERIOD_OPTIONS[0];

export type AssetNodeType = 'region' | 'block' | 'facility';

/** Persisted when browsing Asset Hierarchy / Project Explorer so return navigation can restore selection. */
export const ASSETS_HIERARCHY_SELECTION_KEY = 'adw.assets.hierarchySelection';

export interface AssetsHierarchySelection {
  regionId?: string;
  blockId?: string;
  facilityId?: string;
  /** Deepest selected hierarchy node (region, block, or facility). */
  nodeId?: string;
}

export function readAssetsHierarchySelection(): AssetsHierarchySelection | null {
  try {
    const raw = sessionStorage.getItem(ASSETS_HIERARCHY_SELECTION_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AssetsHierarchySelection;
    if (!parsed?.regionId && !parsed?.blockId && !parsed?.facilityId && !parsed?.nodeId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeAssetsHierarchySelection(selection: AssetsHierarchySelection | null): void {
  try {
    if (!selection || (!selection.regionId && !selection.blockId && !selection.facilityId && !selection.nodeId)) {
      sessionStorage.removeItem(ASSETS_HIERARCHY_SELECTION_KEY);
      return;
    }
    sessionStorage.setItem(ASSETS_HIERARCHY_SELECTION_KEY, JSON.stringify(selection));
  } catch {
    // ignore quota / private mode
  }
}

export interface AssetHierarchyOption {
  id: number;
  label: string;
  code?: string;
  regionCode?: string;
}

/** Options from project-scoped hierarchy APIs (id may be a name string). */
export interface ProjectHierarchyOption {
  id: number | string;
  label: string;
  code?: string;
  name?: string;
  regionCode?: string;
}

export interface CreateAssetHierarchyInput {
  region: string;
  regionCode: string;
  block: string;
  blockcode: string;
  facility: string;
  assetcode: string;
  assettype: string;
  status: string;
  accessmodel: string;
  retentionperiod: string;
  assettemplateid: string;
}

export interface CreatePttepRegionInput {
  regionName: string;
  regionCode: string;
  status: string;
  createdBy: string;
}

export interface CreatePttepBlockInput {
  regionId: number;
  blockName: string;
  blockCode: string;
  status: string;
  createdBy: string;
}

export interface CreatePttepAssetInput {
  regionId?: number;
  blockId?: number;
  assetName: string;
  assetCode: string;
  status: string;
  createdBy: string;
}

export interface CreatePttepFacilityInput {
  assetId: number;
  facilityName: string;
  facilityCode: string;
  status: string;
  createdBy: string;
}
export interface AssetTreeNode {
  id: string;
  label: string;
  type: AssetNodeType;
  parentId?: string;
  code?: string;
  children?: AssetTreeNode[];
  childrenLoaded?: boolean;
  createdAt?: string;
  createdBy?: string;
  modifiedAt?: string;
  modifiedBy?: string;
  accessModel?: string;
  retentionPeriod?: string;
  facilityType?: string;
  status?: string;
}

export interface AssetFolderRow {
  id: string;
  name: string;
  modified: string;
  owner: string;
  access: string;
  accessColor: string;
  docCount: number;
}

interface AlfrescoChildEntry {
  id: string;
  name: string;
  isFolder?: boolean;
  parentId?: string;
  createdAt?: string;
  modifiedAt?: string;
  createdByUser?: { displayName?: string };
  modifiedByUser?: { displayName?: string };
  properties?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class AssetsService {
  private readonly rootNodeId = environment.assetsParentNodeId;

  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthenticationService
  ) {}

  async loadRegions(): Promise<AssetTreeNode[]> {
    const entries = await this.fetchFolderChildren(this.rootNodeId);
    return entries.map((entry) => this.mapTreeNode(entry, 'region'));
  }

  async loadBlocks(regionId: string): Promise<AssetTreeNode[]> {
    const entries = await this.fetchFolderChildren(regionId);
    return entries.map((entry) => this.mapTreeNode(entry, 'block'));
  }

  async loadFacilities(blockId: string): Promise<AssetTreeNode[]> {
    const entries = await this.fetchFolderChildren(blockId);
    return entries.map((entry) => this.mapTreeNode(entry, 'facility'));
  }

  async loadFacilityFolders(facilityId: string): Promise<AssetFolderRow[]> {
    const entries = await this.fetchFolderChildren(facilityId);
    return entries.map((entry) => this.mapFolderRow(entry));
  }

  /** Loads a single Alfresco node with properties for detail tabs. */
  async loadNodeDetails(nodeId: string): Promise<Partial<AssetTreeNode> | null> {
    const url = this.withIncludeProperties(`${ACS_NODES_API_BASE}/${nodeId}`);
    const headers = await firstValueFrom(this.authService.addTokenToHeader(url));
    try {
      const response = await firstValueFrom(this.http.get<{ entry?: AlfrescoChildEntry }>(url, { headers }));
      const entry = response?.entry;
      if (!entry?.id) {
        return null;
      }
      return this.mapNodeAuditFields(entry);
    } catch {
      return null;
    }
  }

  /** PTTEP custom API — regions for create-asset dropdowns. */
  loadPttepRegions(includeInactive = true): Promise<AssetHierarchyOption[]> {
    const query = includeInactive ? '?includeInactive=true' : '';
    return this.fetchPttepOptions(`${PTTEP_SERVICE_BASE}/regions/all${query}`);
  }

  /** PTTEP custom API — blocks for a selected region id (legacy hierarchy form). */
  loadPttepBlocks(regionId: number): Promise<AssetHierarchyOption[]> {
    return this.fetchPttepOptions(`${PTTEP_SERVICE_BASE}/facilities?assetId=${regionId}`);
  }

  /** PTTEP custom API — assets for a selected region id. */
  loadPttepAssetsByRegion(regionId: number): Promise<AssetHierarchyOption[]> {
    return this.fetchPttepOptions(`${PTTEP_SERVICE_BASE}/assets?regionId=${regionId}`);
  }

  /** PTTEP custom API — assets for a selected block id (legacy hierarchy form). */
  loadPttepAssets(blockId: number): Promise<AssetHierarchyOption[]> {
    return this.fetchPttepOptions(`${PTTEP_SERVICE_BASE}/assets?blockId=${blockId}`);
  }

  /** PTTEP custom API — facilities for a selected asset id. */
  loadPttepFacilitiesByAsset(assetId: number): Promise<AssetHierarchyOption[]> {
    return this.fetchPttepOptions(`${PTTEP_SERVICE_BASE}/facilities?assetId=${assetId}`);
  }

  /** Project-scoped regions: `/pttep/projects/{projectId}/regions`. */
  loadProjectRegions(projectId: string): Promise<ProjectHierarchyOption[]> {
    const id = projectId?.trim();
    if (!id) {
      return Promise.resolve([]);
    }
    return this.fetchProjectHierarchyOptions(`${PTTEP_SERVICE_BASE}/projects/${encodeURIComponent(id)}/regions`);
  }

  /** Project-scoped assets: `/pttep/projects/{projectId}/assets?region={regionName}`. */
  loadProjectAssets(projectId: string, regionName: string): Promise<ProjectHierarchyOption[]> {
    const id = projectId?.trim();
    const region = regionName?.trim();
    if (!id || !region) {
      return Promise.resolve([]);
    }
    const url =
      `${PTTEP_SERVICE_BASE}/projects/${encodeURIComponent(id)}/assets` +
      `?region=${encodeURIComponent(region)}`;
    return this.fetchProjectHierarchyOptions(url);
  }

  /** Project-scoped facilities: `/pttep/projects/{projectId}/facilities?region=&asset=`. */
  loadProjectFacilities(
    projectId: string,
    regionName: string,
    assetName: string
  ): Promise<ProjectHierarchyOption[]> {
    const id = projectId?.trim();
    const region = regionName?.trim();
    const asset = assetName?.trim();
    if (!id || !region || !asset) {
      return Promise.resolve([]);
    }
    const url =
      `${PTTEP_SERVICE_BASE}/projects/${encodeURIComponent(id)}/facilities` +
      `?region=${encodeURIComponent(region)}&asset=${encodeURIComponent(asset)}`;
    return this.fetchProjectHierarchyOptions(url);
  }

  /** PTTEP custom API — create a region. */
  createPttepRegion(input: CreatePttepRegionInput): Promise<void> {
    return this.postPttep(`${PTTEP_SERVICE_BASE}/regions`, input);
  }

  /** PTTEP custom API — create a block under a region (legacy). */
  createPttepBlock(input: CreatePttepBlockInput): Promise<void> {
    return this.postPttep(`${PTTEP_SERVICE_BASE}/facilities`, input);
  }

  /** PTTEP custom API — create a facility under an asset. */
  createPttepFacility(input: CreatePttepFacilityInput): Promise<void> {
    return this.postPttep(`${PTTEP_SERVICE_BASE}/facilities`, input);
  }

  /** PTTEP custom API — create an asset under a region or block. */
  createPttepAsset(input: CreatePttepAssetInput): Promise<void> {
    return this.postPttep(`${PTTEP_SERVICE_BASE}/assets`, input);
  }

  /** Start Activiti process to create asset hierarchy folders. */
  async createAssetHierarchy(input: CreateAssetHierarchyInput): Promise<void> {
    const payload = {
      processDefinitionKey: environment.createAssetProcessDefinitionKey,
      name: 'Create Asset Hierarchy',
      businessKey: environment.createAssetProcessDefinitionKey,
      variables: [
        { name: 'region', value: input.region },
        { name: 'block', value: input.block },
        { name: 'facility', value: input.facility },
        { name: 'regioncode', value: input.regionCode },
        { name: 'blockcode', value: input.blockcode },
        { name: 'assetcode', value: input.assetcode },
        { name: 'assettype', value: input.assettype },
        { name: 'status', value: input.status },
        { name: 'accessmodel', value: input.accessmodel },
        { name: 'retentionperiod', value: input.retentionperiod },
        { name: 'assettemplateid', value: input.assettemplateid }
      ]
    };

    const headers = await firstValueFrom(
      this.authService.addTokenToHeader(
        environment.processInstancesUrl,
        new HttpHeaders({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
    );

    await firstValueFrom(this.http.post(environment.processInstancesUrl, payload, { headers }));
  }

  private async postPttep(url: string, body: unknown): Promise<void> {
    const headers = await firstValueFrom(
      this.authService.addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
    );

    await firstValueFrom(this.http.post(url, body, { headers }));
  }

  private async fetchPttepOptions(url: string): Promise<AssetHierarchyOption[]> {
    const requestUrl = this.withIncludeProperties(url);
    const headers = await firstValueFrom(
      this.authService.addTokenToHeader(
        requestUrl,
        new HttpHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
    );
    const response = await firstValueFrom(this.http.get<unknown>(requestUrl, { headers }));
    return this.parsePttepOptions(this.normalizePttepResponse(response));
  }

  private async fetchProjectHierarchyOptions(url: string): Promise<ProjectHierarchyOption[]> {
    const headers = await firstValueFrom(
      this.authService.addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
    );
    const response = await firstValueFrom(this.http.get<unknown>(url, { headers }));
    return this.parseProjectHierarchyOptions(this.normalizePttepResponse(response));
  }

  private parseProjectHierarchyOptions(data: unknown): ProjectHierarchyOption[] {
    const list = this.extractProjectHierarchyList(data);
    const options = list
      .map((item, index) => this.mapProjectHierarchyOption(item, index))
      .filter((option): option is ProjectHierarchyOption => option !== null);

    if (!options.length && data != null) {
      console.warn('[AssetsService] Unrecognized project hierarchy API response shape', data);
    }

    return options;
  }

  private extractProjectHierarchyList(data: unknown, depth = 0): unknown[] {
    if (depth > 5) {
      return [];
    }

    if (Array.isArray(data)) {
      return data.filter((item) => item != null && (typeof item === 'object' || typeof item === 'string'));
    }

    if (!data || typeof data !== 'object') {
      return [];
    }

    const record = data as Record<string, unknown>;
    const preferredKeys = [
      'regions',
      'assets',
      'facilities',
      'blocks',
      'data',
      'items',
      'entries',
      'list',
      'result',
      'results',
      'payload',
      'content',
      'values'
    ];

    for (const key of preferredKeys) {
      const found = this.extractProjectHierarchyList(record[key], depth + 1);
      if (found.length) {
        return found;
      }
    }

    for (const value of Object.values(record)) {
      const found = this.extractProjectHierarchyList(value, depth + 1);
      if (found.length) {
        return found;
      }
    }

    return [];
  }

  private mapProjectHierarchyOption(item: unknown, index: number): ProjectHierarchyOption | null {
    if (typeof item === 'string') {
      const label = item.trim();
      if (!label) {
        return null;
      }
      return { id: label, label, name: label, code: label };
    }

    if (!item || typeof item !== 'object') {
      return null;
    }

    const record = item as Record<string, unknown>;
    const label = this.toPttepLabel(
      record.name ??
        record.regionName ??
        record.blockName ??
        record.assetName ??
        record.facilityName ??
        record.displayName ??
        record.label ??
        record.title ??
        record.description ??
        record.value ??
        record.region ??
        record.asset ??
        record.facility
    );
    const code = this.toPttepLabel(
      record.code ??
        record.assetCode ??
        record.blockCode ??
        record.regionCode ??
        record.shortName ??
        record.facilityCode
    );
    const numericId = this.toPttepNumber(
      record.id ??
        record.regionId ??
        record.blockId ??
        record.assetId ??
        record.facilityId ??
        record.region_id ??
        record.block_id ??
        record.asset_id ??
        record.facility_id
    );

    const resolvedLabel = label || code;
    if (!resolvedLabel && numericId === null) {
      return null;
    }

    return {
      id: numericId ?? (resolvedLabel || `option-${index}`),
      label: resolvedLabel || String(numericId),
      name: resolvedLabel || String(numericId),
      code: code || resolvedLabel || undefined,
      regionCode: this.toPttepLabel(record.regionCode) || undefined
    };
  }

  private normalizePttepResponse(response: unknown): unknown {
    if (typeof response === 'string') {
      const trimmed = response.trim();
      if (!trimmed) {
        return response;
      }

      try {
        return JSON.parse(trimmed);
      } catch {
        return response;
      }
    }

    return response;
  }

  private parsePttepOptions(data: unknown): AssetHierarchyOption[] {
    const list = this.extractPttepList(data);
    const options = list
      .map((item) => this.mapPttepOption(item))
      .filter((option): option is AssetHierarchyOption => option !== null);

    if (!options.length && data != null) {
      console.warn('[AssetsService] Unrecognized PTTEP API response shape', data);
    }

    return options;
  }

  private extractPttepList(data: unknown, depth = 0): unknown[] {
    if (depth > 5) {
      return [];
    }

    if (Array.isArray(data)) {
      return data.filter((item) => item != null && typeof item === 'object');
    }

    if (!data || typeof data !== 'object') {
      return [];
    }

    const record = data as Record<string, unknown>;
    const preferredKeys = [
      'regions',
      'blocks',
      'facilities',
      'assets',
      'data',
      'items',
      'entries',
      'list',
      'result',
      'results',
      'payload',
      'content',
      'values'
    ];

    for (const key of preferredKeys) {
      const found = this.extractPttepList(record[key], depth + 1);
      if (found.length) {
        return found;
      }
    }

    for (const value of Object.values(record)) {
      const found = this.extractPttepList(value, depth + 1);
      if (found.length) {
        return found;
      }
    }

    return [];
  }

  private mapPttepOption(item: unknown): AssetHierarchyOption | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const record = item as Record<string, unknown>;
    const id = this.toPttepNumber(
      record.id ??
        record.regionId ??
        record.blockId ??
        record.assetId ??
        record.region_id ??
        record.block_id ??
        record.asset_id
    );
    if (id === null) {
      return null;
    }

    const label = this.toPttepLabel(
      record.name ??
        record.regionName ??
        record.blockName ??
        record.assetName ??
        record.facilityName ??
        record.displayName ??
        record.label ??
        record.title ??
        record.description ??
        record.value
    );

    const regionCode = this.toPttepLabel(record.regionCode);
    const code = this.toPttepLabel(
      record.code ??
        record.assetCode ??
        record.blockCode ??
        record.regionCode ??
        record.shortName ??
        record.facilityCode
    );

    return {
      id,
      label: label || code,
      code: code || undefined,
      regionCode: regionCode || undefined
    };
  }

  private toPttepNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toPttepLabel(value: unknown): string {
    return typeof value === 'string' ? value.trim() : value != null ? String(value).trim() : '';
  }

  private async fetchFolderChildren(nodeId: string): Promise<AlfrescoChildEntry[]> {
    const url = this.withIncludeProperties(`${ACS_NODES_API_BASE}/${nodeId}/children`);
    const headers = await firstValueFrom(this.authService.addTokenToHeader(url));
    const response = await firstValueFrom(this.http.get<any>(url, { headers }));
    return (response?.list?.entries ?? [])
      .map((item: any) => item?.entry as AlfrescoChildEntry)
      .filter((entry: AlfrescoChildEntry | undefined): entry is AlfrescoChildEntry => !!entry?.id && !!entry.isFolder);
  }

  private withIncludeProperties(url: string): string {
    if (url.includes('include=properties')) {
      return url;
    }
    return `${url}${url.includes('?') ? '&' : '?'}include=properties`;
  }

  private mapTreeNode(entry: AlfrescoChildEntry, type: AssetNodeType): AssetTreeNode {
    return {
      id: entry.id,
      label: entry.name,
      type,
      parentId: entry.parentId,
      code: this.readNodeCode(entry.properties, type) || undefined,
      children: type === 'facility' ? undefined : [],
      childrenLoaded: type === 'facility',
      ...this.mapNodeAuditFields(entry, type)
    };
  }

  private mapNodeAuditFields(entry: AlfrescoChildEntry, type?: AssetNodeType): Partial<AssetTreeNode> {
    const props = entry.properties ?? {};
    const fields: Partial<AssetTreeNode> = {
      createdAt: entry.createdAt,
      createdBy: entry.createdByUser?.displayName?.trim() || undefined,
      modifiedAt: entry.modifiedAt,
      modifiedBy: entry.modifiedByUser?.displayName?.trim() || undefined,
      accessModel: this.resolveAccessModel(props),
      retentionPeriod: this.resolveRetentionPeriod(props),
      facilityType:
        this.readProp(props, [
          'edms:facilityType',
          'edms:facility_type',
          'edms:assettype',
          'tt:facilityType',
          'facilityType',
          'assettype'
        ]) ||
        this.findPropByNormalizedKey(props, 'assettype') ||
        this.findPropByNormalizedKey(props, 'facilitytype') ||
        undefined,
      status:
        this.readProp(props, ['edms:status', 'tt:status', 'status']) ||
        this.findPropByNormalizedKey(props, 'status') ||
        undefined
    };
    if (type) {
      const code = this.readNodeCode(props, type);
      if (code) {
        fields.code = code;
      }
    }
    return fields;
  }

  private readProp(properties: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = properties[key];
      if (value != null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return '';
  }

  /**
   * Resolve Access Model the same way Create Asset Hierarchy saves/selects it
   * (`accessmodel` process variable → node properties).
   */
  private resolveAccessModel(properties: Record<string, unknown>): string {
    const fromKey =
      this.readProp(properties, [
        'edms:accessmodel',
        'edms:access_model',
        'edms:accessModel',
        'tt:accessmodel',
        'tt:access_model',
        'tt:accessModel',
        'accessModel',
        'accessmodel',
        'access_model'
      ]) ||
      this.findPropByNormalizedKey(properties, 'accessmodel') ||
      this.findPropByLooseKey(properties, ['accessmodel', 'access_model']) ||
      this.findKnownOptionValue(properties, ASSET_ACCESS_MODEL_OPTIONS);

    return fromKey || ASSET_ACCESS_MODEL_DEFAULT;
  }

  /**
   * Resolve Retention Period the same way Create Asset Hierarchy saves/selects it
   * (`retentionperiod` process variable → node properties).
   */
  private resolveRetentionPeriod(properties: Record<string, unknown>): string {
    const fromKey =
      this.readProp(properties, [
        'edms:retentionperiod',
        'edms:retention_period',
        'edms:retentionPeriod',
        'tt:retentionperiod',
        'tt:retention_period',
        'tt:retentionPeriod',
        'retentionPeriod',
        'retentionperiod',
        'retention_period'
      ]) ||
      this.findPropByNormalizedKey(properties, 'retentionperiod') ||
      this.findPropByLooseKey(properties, ['retentionperiod', 'retention']) ||
      this.findKnownOptionValue(properties, ASSET_RETENTION_PERIOD_OPTIONS);

    return fromKey || ASSET_RETENTION_PERIOD_DEFAULT;
  }

  /** Matches content-model keys like `edms:accessmodel` / `tt:retention_period` regardless of casing. */
  private findPropByNormalizedKey(properties: Record<string, unknown>, normalizedTarget: string): string {
    const target = normalizedTarget.replace(/[_-]+/g, '').toLowerCase();
    for (const [key, value] of Object.entries(properties)) {
      const normalized = key.replace(/^[a-zA-Z0-9]+:/, '').replace(/[_-]+/g, '').toLowerCase();
      if (normalized === target && value != null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return '';
  }

  private findPropByLooseKey(properties: Record<string, unknown>, needles: string[]): string {
    for (const [key, value] of Object.entries(properties)) {
      if (value == null || !String(value).trim()) {
        continue;
      }
      const normalized = key.replace(/^[a-zA-Z0-9]+:/, '').replace(/[_-]+/g, '').toLowerCase();
      if (needles.some((needle) => normalized.includes(needle.replace(/[_-]+/g, '').toLowerCase()))) {
        return String(value).trim();
      }
    }
    return '';
  }

  private findKnownOptionValue(properties: Record<string, unknown>, options: readonly string[]): string {
    const optionSet = new Set(options.map((option) => option.trim().toLowerCase()));
    for (const value of Object.values(properties)) {
      const text = value != null ? String(value).trim() : '';
      if (text && optionSet.has(text.toLowerCase())) {
        return options.find((option) => option.toLowerCase() === text.toLowerCase()) ?? text;
      }
    }
    return '';
  }

  private readNodeCode(properties: Record<string, unknown> | undefined, type: AssetNodeType): string {
    if (!properties) {
      return '';
    }

    const keysByType: Record<AssetNodeType, string[]> = {
      region: ['edms:region_code', 'edms:regionCode', 'tt:regionCode', 'regionCode', 'regioncode'],
      block: ['edms:blocks_code', 'edms:blockCode', 'edms:block_code', 'tt:blockCode', 'blockCode', 'blockcode'],
      facility: ['edms:assett_code', 'edms:asset_code', 'edms:assetCode', 'edms:facilityCode', 'facilityCode', 'assetcode']
    };

    return this.readProp(properties, keysByType[type]);
  }

  private mapFolderRow(entry: AlfrescoChildEntry): AssetFolderRow {
    return {
      id: entry.id,
      name: entry.name,
      modified: this.formatModifiedDate(entry.modifiedAt),
      owner: entry.modifiedByUser?.displayName ?? '—',
      access: 'Project Team',
      accessColor: 'blue',
      docCount: 0
    };
  }

  private formatModifiedDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}
