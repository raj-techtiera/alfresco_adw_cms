import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';
import { AlfrescoSearchRequest, DviFlowStep, DviFlowTone, DviStepPropertyRow } from '../interface/programPortfolio';
import { encodeAlfrescoRelativePathParam } from '../utils/encode-alfresco-relative-path-param';

const ACS_NODES_API_BASE = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';
const ACS_SEARCH_API = '/alfresco/api/-default-/public/search/versions/1/search';
export const MDR_REGISTER_RELATIVE_PATH =
  '02.Engineering/01.Components/01.Component Register';
const REQUEST_DVI_REGISTER = '/activiti-app/api/enterprise/process-instances';
const DVI_REGISTRATION_PROCESS_KEY = 'SHAE-DVI-Registration';
const COMPONENT_NODE_TYPE = 'shaedms:component';
const COMPONENT_NUMBER_PROPERTY = 'shaedms:componentNumber';

const DVI_NODE_TYPE = 'shaedms:dvi';
const DVI_PROPERTIES = {
  number: 'shaedms:dviNumber',
  title: 'shaedms:dviTitle',
  status: 'shaedms:dviStatus',
  component: 'shaedms:component',
  level: 'shaedms:dviLevel',
  engineer: 'shaedms:responsibleEngineer',
  program: 'shaedms:program'
} as const;
const DVI_FLOW_PROPERTIES = {
  sequenceNo: 'shaedms:dvi_sequence_no',
  sequenceStatus: 'shaedms:dvi_sequence_status',
  number: 'shaedms:dvi_number',
  title: 'shaedms:dvi_title',
  program: 'shaedms:dvi_program',
  component: 'shaedms:dvi_component',
  level: 'shaedms:dvi_level'
} as const;

const DVI_STEP_PROPERTY_FIELDS: Array<{ label: string; key: string }> = [
  { label: 'DVI Number', key: DVI_FLOW_PROPERTIES.number },
  { label: 'Title', key: DVI_FLOW_PROPERTIES.title },
  { label: 'Program', key: DVI_FLOW_PROPERTIES.program },
  { label: 'Component', key: DVI_FLOW_PROPERTIES.component },
  { label: 'DVI Level', key: DVI_FLOW_PROPERTIES.level },
  { label: 'Sequence', key: DVI_FLOW_PROPERTIES.sequenceNo },
  { label: 'Status', key: DVI_FLOW_PROPERTIES.sequenceStatus },
  { label: 'Risk assessment summary', key: 'shaedms:risk_assessment_summary' },
  { label: 'Risk level', key: 'shaedms:risk_level' },
  { label: 'Submitted at', key: 'shaedms:risk_assessment_submitted_at' },
  { label: 'Submitted by', key: 'shaedms:risk_assessment_submitted_by' }
];

export const DVI_STATUS_ORDER = [
  'Draft',
  'In Progress',
  'Approved',
  'Rejected',
  'Closed'
] as const;

export type DviStatus = (typeof DVI_STATUS_ORDER)[number];
export type DviLevel = 'N3' | 'N4';

export interface DviComponentOption {
  id: string;
  componentNumber: string;
}

export interface DviEngineerOption {
  authorityId: string;
  name: string;
}

export interface DviListFilters {
  name?: string;
  component?: string;
  dviLevel?: string;
  status?: string;
}

export interface CreateDviRequestInput {
  dviTitle: string;
  componentId: string;
  componentNumber: string;
  dviLevel: DviLevel;
  responsibleEngineer: string;
}

export interface MdrItemRecord {
  id: string;
  mdrNumber: string;
  title: string;
  program: string;
  component: string;
  dviLevel: string;
  documentClass: string;
  discipline: string;
  deliverableType: string;
  status: string;
  plannedSubmissionDate: string;
  actualSubmissionDate: string;
  revision: string;
  /** Linked document number (`edms:linkedDocumentNumber`). */
  documentNumber: string;
  /** Disposition / return code (`edms:returnCode`). */
  disposition: string;
  /** Days late vs planned submission; null when on time or early. */
  overdueDays: number | null;
  handoverRequired: boolean;
}

export interface CreateMdrItemPayload {
  name: string;
  nodeType: string;
  relativePath: string;
  properties: {
    'edms:mdrNumber': string;
    'edms:mdrProjectCode': string;
    'edms:mdrProjectNodeRef': string;
    'edms:mdrDiscipline': string;
    'edms:documentClass': string;
    'edms:deliverableType': string;
    'edms:documentTypeCode': string;
    'edms:plannedRevision': string;
    'edms:plannedSubmissionDate': string;
    'edms:mdrStatus': string;
    'edms:handoverRequired': boolean;
    'edms:createdFrom': string;
  };
}

interface AlfrescoUserRef {
  id?: string;
  displayName?: string;
}

interface AlfrescoMdrEntry {
  entry?: {
    id?: string;
    name?: string;
    nodeType?: string;
    isFile?: boolean;
    isFolder?: boolean;
    createdAt?: string;
    modifiedAt?: string;
    createdByUser?: AlfrescoUserRef;
    modifiedByUser?: AlfrescoUserRef;
    properties?: Record<string, unknown>;
  };
}

interface AlfrescoChildrenResponse {
  list?: {
    pagination?: {
      count?: number;
      hasMoreItems?: boolean;
      totalItems?: number;
      skipCount?: number;
      maxItems?: number;
    };
    entries?: AlfrescoMdrEntry[];
  };
}

interface AlfrescoLocalPermission {
  authorityId?: string;
}

interface AlfrescoNodePermissionsResponse {
  entry?: {
    permissions?: {
      locallySet?: AlfrescoLocalPermission[];
    };
  };
}

interface ActivitiProcessVariable {
  name: string;
  value: string;
}

interface ActivitiStartProcessRequest {
  processDefinitionKey: string;
  name: string;
  businessKey: string;
  variables: ActivitiProcessVariable[];
}



@Injectable({ providedIn: 'root' })
export class MdrService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthenticationService
  ) {}

  async loadMdrItemsForProject(
    projectNodeId: string,
    filters?: DviListFilters
  ): Promise<{ items: MdrItemRecord[]; totalItems: number }> {
    const projectId = projectNodeId?.trim();
    if (!projectId) {
      throw new Error('Project id is required.');
    }

    return this.loadDviItemsFromProjectRegister(projectId, filters);
  }

  /** Resolve project code/number from the project folder node properties. */
  async getProjectCode(projectNodeId: string): Promise<string> {
    const projectId = projectNodeId?.trim();
    if (!projectId) {
      return '';
    }

    const url = `${ACS_NODES_API_BASE}/${projectId}?include=properties`;
    const headers = await this.authHeaders(url);
    const response = await firstValueFrom(
      this.http.get<{ entry?: { name?: string; properties?: Record<string, unknown> } }>(url, { headers })
    );

    // Folder name is the project code shown in breadcrumbs / MDR dashboard.
    const folderName = response?.entry?.name != null ? String(response.entry.name).trim() : '';
    if (folderName) {
      return folderName;
    }

    const props = response?.entry?.properties ?? {};
    const candidates = [
      props['edms:mdrProjectCode'],
      props['edms:projectCode'],
      props['tt:projectNumber'],
      props['tt:projectCode'],
      props['tt:project_reference']
    ];

    for (const value of candidates) {
      const text = value != null ? String(value).trim() : '';
      if (text) {
        return text;
      }
    }
    return '';
  }
  async getFolderCount(nodeId: string): Promise<number> {
    const id = nodeId?.trim();
    if (!id) {
      return 0;
    }
    const url = `${ACS_NODES_API_BASE}/${id}/children`;
    const headers = await this.authHeaders(url);
    const response = await firstValueFrom(this.http.get<AlfrescoChildrenResponse>(url, { headers }));
    return response?.list?.pagination?.count ?? 0;
  }
  async createMdrItem(projectNodeId: string, payload: CreateMdrItemPayload): Promise<{ id: string }> {
    const projectId = projectNodeId?.trim();
    if (!projectId) {
      throw new Error('Project id is required.');
    }

    const url = `${ACS_NODES_API_BASE}/${projectId}/children`;
    const headers = await this.authHeaders(url, true);
    const response = await firstValueFrom(
      this.http.post<{ entry?: { id?: string } }>(url, payload, { headers })
    );

    const id = response?.entry?.id?.trim();
    if (!id) {
      throw new Error('MDR was created but no node id was returned.');
    }
    return { id };
  }

  async loadDviComponents(projectNodeId: string): Promise<DviComponentOption[]> {
    const projectId = projectNodeId?.trim();
    if (!projectId) {
      return [];
    }

    const encodedPath = encodeAlfrescoRelativePathParam(`/${MDR_REGISTER_RELATIVE_PATH}`);
    const url = `${ACS_NODES_API_BASE}/${projectId}/children?include=properties&relativePath=${encodedPath}`;
    const headers = await this.authHeaders(url);
    const response = await firstValueFrom(this.http.get<AlfrescoChildrenResponse>(url, { headers }));

    return (response?.list?.entries ?? [])
      .map((item) => this.mapDviComponent(item.entry))
      .filter((item): item is DviComponentOption => item !== null);
  }

  async loadDviResponsibleEngineers(projectNodeId: string): Promise<DviEngineerOption[]> {
    const projectId = projectNodeId?.trim();
    if (!projectId) {
      return [];
    }

    const url = `${ACS_NODES_API_BASE}/${projectId}?include=permissions`;
    const headers = await this.authHeaders(url);
    const response = await firstValueFrom(
      this.http.get<AlfrescoNodePermissionsResponse>(url, { headers })
    );

    const seen = new Set<string>();
    const engineers: DviEngineerOption[] = [];
    for (const permission of response?.entry?.permissions?.locallySet ?? []) {
      const authorityId = permission.authorityId?.trim() ?? '';
      if (!authorityId || seen.has(authorityId)) {
        continue;
      }
      seen.add(authorityId);
      engineers.push({
        authorityId,
        name: this.toAuthorityDisplayName(authorityId)
      });
    }
    return engineers;
  }

  async requestDviRegistration(projectNodeId: string, input: CreateDviRequestInput): Promise<void> {
    const projectId = projectNodeId?.trim();
    const dviTitle = input.dviTitle.trim();
    if (!projectId || !dviTitle) {
      throw new Error('Project id and DVI title are required.');
    }

    const body: ActivitiStartProcessRequest = {
      processDefinitionKey: DVI_REGISTRATION_PROCESS_KEY,
      name: dviTitle,
      businessKey: DVI_REGISTRATION_PROCESS_KEY,
      variables: [
        { name: 'programref', value: projectId },
        { name: 'dvititle', value: dviTitle },
        { name: 'componentref', value: input.componentId.trim() },
        { name: 'dvilevel', value: input.dviLevel },
        { name: 'component', value: input.componentNumber.trim() },
        { name: 'responsibleengineer', value: input.responsibleEngineer.trim() }
      ]
    };

    const headers = await this.authHeaders(REQUEST_DVI_REGISTER, true);
    await firstValueFrom(this.http.post(REQUEST_DVI_REGISTER, body, { headers }));
  }

  mapMdrItemFromNode(entry: {
    id?: string;
    name?: string;
    nodeType?: string;
    isFolder?: boolean;
    properties?: Record<string, unknown>;
  } | null | undefined): MdrItemRecord | null {
    if (!entry) {
      return null;
    }
    return this.mapMdrItem(entry);
  }

  private async loadDviItemsFromProjectRegister(
    projectId: string,
    filters?: DviListFilters
  ): Promise<{ items: MdrItemRecord[]; totalItems: number }> {
    const pageSize = 100;
    let skipCount = 0;
    let totalItems = 0;
    let hasMore = true;
    const items: MdrItemRecord[] = [];
    const query = this.buildDviSearchQuery(projectId, filters);

    while (hasMore) {
      const body: AlfrescoSearchRequest = {
        query: {
          query,
          language: 'afts'
        },
        include: ['properties'],
        paging: {
          maxItems: pageSize,
          skipCount
        },
        sort: [
          {
            type: 'FIELD',
            field: 'cm:created',
            ascending: false
          }
        ]
      };

      const headers = await this.authHeaders(ACS_SEARCH_API, true);
      const response = await firstValueFrom(
        this.http.post<AlfrescoChildrenResponse>(ACS_SEARCH_API, body, { headers })
      );

      const pagination = response?.list?.pagination;
      totalItems = pagination?.totalItems ?? totalItems;
      hasMore = pagination?.hasMoreItems === true;

      const pageItems = (response?.list?.entries ?? [])
        .map((item) => this.mapMdrItem(item.entry))
        .filter((item): item is MdrItemRecord => item !== null);

      items.push(...pageItems);
      skipCount += pagination?.count ?? pageItems.length;

      if (!pagination) {
        hasMore = false;
      }
    }

    if (!totalItems) {
      totalItems = items.length;
    }

    return { items, totalItems };
  }

  private buildDviSearchQuery(projectId: string, filters?: DviListFilters): string {
    const name = this.toAftsSearchTerm(filters?.name);
    const component = this.toAftsAllOrExact(filters?.component);
    const dviLevel = this.toAftsAllOrExact(filters?.dviLevel);
    const parts = [
      `TYPE:'${DVI_NODE_TYPE}'`,
      `cm:name:'${name}'`,
      `shaedms:dviProgramRef:'${this.escapeAftsExact(projectId)}'`,
      `shaedms:component:'${component}'`,
      `shaedms:dviLevel:'${dviLevel}'`
    ];
    const status = filters?.status?.trim();
    if (status) {
      parts.push(`shaedms:dviStatus:'${this.escapeAftsExact(status)}'`);
    }
    return `(${parts.join(' AND ')})`;
  }

  private toAftsSearchTerm(value: string | undefined): string {
    const text = value?.trim() ?? '';
    if (!text) {
      return '**';
    }
    if (text.includes('*')) {
      return this.escapeAftsExact(text);
    }
    return `*${this.escapeAftsExact(text)}*`;
  }

  private toAftsAllOrExact(value: string | undefined): string {
    const text = value?.trim() ?? '';
    return text ? this.escapeAftsExact(text) : '**';
  }

  private escapeAftsExact(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  private mapMdrItem(entry: AlfrescoMdrEntry['entry']): MdrItemRecord | null {
    if (!entry?.id) {
      return null;
    }

    const props = entry.properties ?? {};
    if (this.isDviEntry(entry, props)) {
      return this.mapDviItem(entry, props);
    }

    if (entry.isFolder === true) {
      return null;
    }

    const plannedRaw = this.readDateProp(props, [
      'edms:plannedSubmissionDate',
      'edms:plannedSubmittalDate'
    ]);
    const actualRaw = this.readDateProp(props, [
      'edms:actualSubmissionDate',
      'edms:actualSubmittalDate',
      'edms:actualSubmittal'
    ]);

    return {
      id: entry.id,
      mdrNumber: this.readProp(props, 'edms:mdrNumber') || entry.name || '—',
      title: '—',
      program: '—',
      component: '—',
      dviLevel: '—',
      documentClass: this.readProp(props, 'edms:documentClass') || '—',
      discipline: this.readProp(props, 'edms:mdrDiscipline') || '—',
      deliverableType: this.readProp(props, 'edms:deliverableType') || '—',
      status: this.normalizeStatus(this.readProp(props, 'edms:mdrStatus')),
      plannedSubmissionDate: this.formatDate(plannedRaw),
      actualSubmissionDate: this.formatDate(actualRaw),
      revision:
        this.readProp(props, 'edms:currentRevision') ||
        this.readProp(props, 'edms:plannedRevision') ||
        '—',
      documentNumber: this.readProp(props, 'edms:linkedDocumentNumber') || '—',
      disposition: this.readProp(props, 'edms:returnCode') || '—',
      overdueDays: this.computeOverdueDays(plannedRaw, actualRaw),
      handoverRequired: this.readBoolean(props['edms:handoverRequired'])
    };
  }

  private isDviEntry(
    entry: NonNullable<AlfrescoMdrEntry['entry']>,
    props: Record<string, unknown>
  ): boolean {
    return (
      entry.nodeType === DVI_NODE_TYPE ||
      this.readProp(props, DVI_PROPERTIES.number) !== '' ||
      this.readProp(props, DVI_PROPERTIES.status) !== ''
    );
  }

  private mapDviItem(
    entry: NonNullable<AlfrescoMdrEntry['entry']>,
    props: Record<string, unknown>
  ): MdrItemRecord {
    const dviNumber = this.readProp(props, DVI_PROPERTIES.number) || entry.name || '—';
    const title = this.readProp(props, DVI_PROPERTIES.title) || '—';
    const component = this.readProp(props, DVI_PROPERTIES.component) || '—';
    const dviLevel = this.readProp(props, DVI_PROPERTIES.level) || '—';
    return {
      id: entry.id ?? '',
      mdrNumber: dviNumber,
      title,
      program: this.readProp(props, DVI_PROPERTIES.program) || '—',
      component,
      dviLevel,
      documentClass: dviLevel,
      discipline: component,
      deliverableType: title,
      status: this.normalizeDviStatus(this.readProp(props, DVI_PROPERTIES.status)),
      plannedSubmissionDate: '—',
      actualSubmissionDate: '—',
      revision: '—',
      documentNumber: dviNumber,
      disposition: this.readProp(props, DVI_PROPERTIES.engineer) || '—',
      overdueDays: null,
      handoverRequired: false
    };
  }

  private readDateProp(props: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = this.readProp(props, key);
      if (value) {
        return value;
      }
    }
    return '';
  }

  private computeOverdueDays(plannedRaw: string, actualRaw: string): number | null {
    if (!actualRaw) {
      return null;
    }

    const planned = this.parseUtcDateOnly(plannedRaw);
    const actual = this.parseUtcDateOnly(actualRaw);
    if (!planned || !actual) {
      return null;
    }

    const diffDays = Math.floor((actual.getTime() - planned.getTime()) / 86_400_000);
    return diffDays > 0 ? diffDays : null;
  }

  private parseUtcDateOnly(raw: string): Date | null {
    if (!raw) {
      return null;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private readProp(props: Record<string, unknown>, key: string): string {
    const value = props[key];
    return value != null ? String(value).trim() : '';
  }

  private readBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private normalizeStatus(raw: string): string {
    const value = raw.trim().toLowerCase();
    if (!value) {
      return 'Expected';
    }
    if (value === 'under review' || value === 'review') {
      return 'Under Review';
    }
    if (value === 'need correction') {
      return 'Need Correction';
    }
    if (value === 'submitted') {
      return 'Submitted';
    }
    if (value === 'approved') {
      return 'Approved';
    }
    if (value === 'expected') {
      return 'Expected';
    }
    if (value === 'overdue') {
      return 'Overdue';
    }
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  private normalizeDviStatus(raw: string): DviStatus {
    const value = raw.trim().toLowerCase().replace(/[_-]+/g, ' ');
    if (value === 'in progress' || value === 'inprogress' || value === 'wip') {
      return 'In Progress';
    }
    if (value === 'approved') {
      return 'Approved';
    }
    if (value === 'rejected') {
      return 'Rejected';
    }
    if (value === 'closed') {
      return 'Closed';
    }
    return 'Draft';
  }

  private formatDate(raw: string): string {
    if (!raw) {
      return '—';
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  private toAuthorityDisplayName(authorityId: string): string {
    return authorityId.replace(/^GROUP_/i, '').replace(/_/g, ' ');
  }

  private mapDviComponent(entry: AlfrescoMdrEntry['entry']): DviComponentOption | null {
    if (!entry?.id || entry.nodeType !== COMPONENT_NODE_TYPE) {
      return null;
    }
    const componentNumber =
      this.readProp(entry.properties ?? {}, COMPONENT_NUMBER_PROPERTY) || entry.name || '';
    if (!componentNumber) {
      return null;
    }
    return { id: entry.id, componentNumber };
  }

  private async authHeaders(url: string, jsonBody = false): Promise<HttpHeaders> {
    let headers = new HttpHeaders({
      Accept: 'application/json',
      'Cache-Control': 'no-store',
      Pragma: 'no-cache'
    });
    if (jsonBody) {
      headers = headers.set('Content-Type', 'application/json');
    }
    return firstValueFrom(this.authService.addTokenToHeader(url, headers));
  }

  async getDviFlowSteps(dviNodeId: string): Promise<DviFlowStep[]> {
    const dviId = dviNodeId?.trim();
    if (!dviId) {
      return [];
    }

    const url = `${ACS_NODES_API_BASE}/${dviId}/children?include=properties&maxItems=100`;
    const headers = await this.authHeaders(url);
    const response = await firstValueFrom(this.http.get<AlfrescoChildrenResponse>(url, { headers }));

    const mapped = (response?.list?.entries ?? [])
      .map((item) => this.mapDviFlowStep(item.entry))
      .filter((item): item is Omit<DviFlowStep, 'tone'> => item !== null)
      .sort((a, b) => a.sequenceNo - b.sequenceNo);

    return this.assignDviFlowTones(mapped);
  }

  private mapDviFlowStep(
    entry: AlfrescoMdrEntry['entry']
  ): Omit<DviFlowStep, 'tone'> | null {
    if (!entry?.id) {
      return null;
    }
    const props = entry.properties ?? {};
    const sequenceRaw = this.readProp(props, DVI_FLOW_PROPERTIES.sequenceNo);
    const sequenceNo = Number.parseInt(sequenceRaw, 10);
    if (!Number.isFinite(sequenceNo)) {
      return null;
    }
    const name = entry.name?.trim() || `Step ${sequenceNo}`;
    return {
      id: entry.id,
      name,
      sequenceNo,
      status: this.readProp(props, DVI_FLOW_PROPERTIES.sequenceStatus),
      properties: this.mapDviStepProperties(entry)
    };
  }

  private mapDviStepProperties(entry: NonNullable<AlfrescoMdrEntry['entry']>): DviStepPropertyRow[] {
    const props = entry.properties ?? {};
    const labels = new Map(DVI_STEP_PROPERTY_FIELDS.map((field) => [field.key, field.label]));
    const rows: DviStepPropertyRow[] = [];

    for (const key of Object.keys(props)) {
      const value = this.readProp(props, key);
      if (!value) {
        continue;
      }
      rows.push({
        label: labels.get(key) ?? key.replace(/^[^:]+:/, '').replace(/_/g, ' '),
        value
      });
    }

    return rows;
  }

  private assignDviFlowTones(steps: Array<Omit<DviFlowStep, 'tone'>>): DviFlowStep[] {
    const currentIndex = steps.findIndex((step) => !this.isCompletedFlowStatus(step.status));
    return steps.map((step, index) => {
      let tone: DviFlowTone;
      if (this.isCompletedFlowStatus(step.status)) {
        tone = 'completed';
      } else if (currentIndex === index) {
        tone = 'current';
      } else {
        tone = 'upcoming';
      }
      return { ...step, tone };
    });
  }

  private isCompletedFlowStatus(status: string): boolean {
    return status.trim().toLowerCase() === 'completed';
  }
}
