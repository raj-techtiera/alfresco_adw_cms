import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthenticationService } from '@alfresco/adf-core';
import { Observable, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { HrNodeListResponse, HrNodeResponse, HrSearchEntry, JobRequisition, JobRequisitionDetails, JobRequisitionPropertyRow, JobRequisitionPropertyTable, JobRequisitionSearchFilter, JobRequisitionStep, jobRequesitionInput } from '../interface/hrManagement';
import { environment } from '../../environments/environment';

const SEARCH_URL = '/alfresco/api/-default-/public/search/versions/1/search';
const NODES_URL = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';
const SEQUENCE_NO_KEYS = ['shaedms:jr_sequence_no', 'shaedms:dvi_sequence_no'];
const SEQUENCE_STATUS_KEYS = ['shaedms:jr_sequence_status', 'shaedms:dvi_sequence_status'];
const PROPERTY_LABELS: Record<string, string> = {
  'shaedms:jobId': 'Job Id',
  'shaedms:jobTitle': 'Job title',
  'shaedms:jr_status': 'Status',
  'shaedms:departmentName': 'Department',
  'shaedms:requestedBy': 'Requested by',
  'shaedms:priority': 'Priority',
  'shaedms:employmentType': 'Employment type',
  'shaedms:jr_sequence_no': 'Sequence',
  'shaedms:dvi_sequence_no': 'Sequence',
  'shaedms:jr_sequence_status': 'Sequence status',
  'shaedms:dvi_sequence_status': 'Sequence status'
};
const EXCLUDED_PROPERTY_KEYS = new Set([
  'cm:lastThumbnailModification',
  'edm:parentFolderID',
  'edms:document_share_id',
  'edms:id',
  'edms:workflow_triggered'
]);
const TABLE_HEADER_LABELS: Record<string, string> = {
  candidateinfo: 'Candidate info',
  candidatename: 'Candidate name',
  candidateemail: 'Email',
  candidatephone: 'Phone',
  experienceyears: 'Experience years'
};
const PROCESS_HEADERS = new HttpHeaders({
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  Pragma: 'no-cache'
});

@Injectable({ providedIn: 'root' })
export class HrManagementService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthenticationService
  ) {}

  searchJobRequisitions(filter: JobRequisitionSearchFilter = {}): Observable<JobRequisition[]> {
    return this.http
      .post<HrNodeListResponse>(SEARCH_URL, this.buildSearchBody(filter), this.auth('Content-Type'))
      .pipe(map((response) => (response.list?.entries ?? []).map((row) => this.mapJobRequisition(row.entry))));
  }

  async startJobRequisitionRequest(input: jobRequesitionInput): Promise<void> {
    const hodname = this.authService.getUsername()?.trim() || localStorage.getItem('ACS_USERNAME')?.trim() || '';
    const missing = !input.programId.trim() ? 'Project id' : !input.programname.trim() ? 'Program name' : !hodname ? 'Logged-in user name' : '';
    if (missing) {
      throw new Error(`${missing} is not available.`);
    }
    const url = environment.processInstancesUrl;
    const processDefinitionKey = environment.jrRequestProcessDefinitionKey.trim();
    const headers = await firstValueFrom(this.authService.addTokenToHeader(url, PROCESS_HEADERS));
    await firstValueFrom(
      this.http.post(url, {
        processDefinitionKey,
        name: this.jobRequesitionName(input.department),
        businessKey: environment.jrRequestBusinessKey.trim() || processDefinitionKey,
        variables: Object.entries({ ...input, hodname }).map(([name, value]) => ({
          name,
          value: typeof value === 'string' ? value.trim() : value
        }))
      }, { headers })
    );
  }

  async getRequisitionDetails(nodeId: string): Promise<JobRequisitionDetails> {
    const id = nodeId.trim();
    const options = this.auth('Accept');
    const [node, children] = await Promise.all([
      firstValueFrom(this.http.get<HrNodeResponse>(`${NODES_URL}/${id}?include=properties`, options)),
      firstValueFrom(this.http.get<HrNodeListResponse>(`${NODES_URL}/${id}/children?include=properties&maxItems=100`, options))
        .catch(() => ({ list: { entries: [] } } as HrNodeListResponse))
    ]);
    const { name, properties = {} } = node.entry;
    return {
      title: this.firstText(properties, ['shaedms:jobId', 'cm:name']) || this.textValue(name) || 'Job requisition',
      status: this.firstText(properties, ['shaedms:jr_status']),
      steps: this.assignStepTones(
        (children.list?.entries ?? [])
          .map((row) => this.mapSequencedStep(row.entry))
          .filter((step): step is Omit<JobRequisitionStep, 'tone'> => !!step)
          .sort((a, b) => a.sequenceNo - b.sequenceNo)
      )
    };
  }

  private mapSequencedStep(entry: HrSearchEntry): Omit<JobRequisitionStep, 'tone'> | null {
    const sequenceNo = Number.parseInt(this.firstText(entry.properties ?? {}, SEQUENCE_NO_KEYS), 10);
    if (!entry?.id || !Number.isFinite(sequenceNo)) {
      return null;
    }
    return {
      id: entry.id,
      name: this.textValue(entry.name) || `Step ${sequenceNo}`,
      sequenceNo,
      status: this.firstText(entry.properties ?? {}, SEQUENCE_STATUS_KEYS),
      properties: this.mapProperties(entry)
    };
  }

  private assignStepTones(steps: Array<Omit<JobRequisitionStep, 'tone'>>): JobRequisitionStep[] {
    const currentIndex = steps.findIndex((step) => step.status.trim().toLowerCase() !== 'completed');
    return steps.map((step, index) => ({
      ...step,
      tone: step.status.trim().toLowerCase() === 'completed' ? 'completed' : currentIndex === index ? 'current' : 'upcoming'
    }));
  }

  private mapProperties(entry: HrSearchEntry): JobRequisitionPropertyRow[] {
    const properties = entry.properties ?? {};
    const rows: JobRequisitionPropertyRow[] = [];
    const seen = new Set<string>();
    const push = (label: string, value: string, table?: JobRequisitionPropertyTable) => {
      if (seen.has(label) || (!value && !table)) {
        return;
      }
      seen.add(label);
      rows.push({ label, value, table });
    };
    push('Name', this.textValue(entry.name));
    for (const [key, label] of Object.entries(PROPERTY_LABELS)) {
      push(label, this.textValue(properties[key]));
    }
    for (const [key, raw] of Object.entries(properties)) {
      if (EXCLUDED_PROPERTY_KEYS.has(key) || PROPERTY_LABELS[key]) {
        continue;
      }
      const table = this.parseJsonTable(raw);
      push(this.formatPropertyLabel(key), table ? '' : this.textValue(raw), table ?? undefined);
    }
    return rows;
  }

  private buildSearchBody({ name = '', status = '' }: JobRequisitionSearchFilter) {
    const term = this.escapeAlfrescoFullTextSearchTerm(name, true);
    const statusTerm = !status.trim() ? '**' : status.trim().toLowerCase() === 'close' ? 'Close*' : this.escapeAlfrescoFullTextSearchTerm(status);
    const nameClause = name.trim()
      ? `(cm:name:'${term}' OR shaedms:jobTitle:'${term}' OR shaedms:departmentName:'${term}' OR shaedms:requestedBy:'${term}')`
      : `cm:name:'**'`;
    return {
      query: {
        query: `(TYPE:'shaedms:jobRequisition' AND ${nameClause} AND shaedms:jr_status:'${statusTerm}')`,
        language: 'afts'
      },
      include: ['properties'],
      paging: { maxItems: 20, skipCount: 0 },
      sort: [{ type: 'FIELD', field: 'cm:created', ascending: false }]
    };
  }

  private mapJobRequisition({ id, name, properties = {} }: HrSearchEntry): JobRequisition {
    const field = (...keys: string[]) => this.firstText(properties, keys) || '—';
    return {
      id,
      jobId: this.firstText(properties, ['shaedms:jobId', 'cm:name']) || this.textValue(name) || '—',
      jobTitle: field('shaedms:jobTitle'),
      status: field('shaedms:jr_status'),
      departmentName: field('shaedms:departmentName'),
      requestedBy: field('shaedms:requestedBy'),
      priority: field('shaedms:priority'),
      employmentType: field('shaedms:employmentType')
    };
  }

  private auth(header: 'Content-Type' | 'Accept'): { headers: HttpHeaders; params: HttpParams } {
    const token = localStorage.getItem('alf_auth');
    let headers = new HttpHeaders(header === 'Content-Type' ? { 'Content-Type': 'application/json' } : { Accept: 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Basic ${token}`);
    }
    const ticket = token ? '' : localStorage.getItem('ticket-ECM');
    return { headers, params: ticket ? new HttpParams().set('alf_ticket', ticket) : new HttpParams() };
  }

  private textValue(value: unknown): string {
    return value != null ? String(value).trim() : '';
  }

  private firstText(properties: Record<string, unknown>, keys: string[]): string {
    return keys.map((key) => this.textValue(properties[key])).find(Boolean) ?? '';
  }

  private parseJsonTable(raw: unknown): JobRequisitionPropertyTable | null {
    let parsed = raw;
    if (typeof raw === 'string') {
      const value = raw.trim();
      if (!value.startsWith('[') && !value.startsWith('{')) {
        return null;
      }
      try {
        parsed = JSON.parse(value);
      } catch {
        return null;
      }
    }
    const records = Array.isArray(parsed) ? parsed.filter((item) => this.isRecord(item)) : this.isRecord(parsed) ? [parsed] : [];
    if (!records.length) {
      return null;
    }
    const keys = [...new Set(records.flatMap((record) => Object.keys(record)))];
    return {
      headers: keys.map((key) => this.formatPropertyLabel(key)),
      rows: records.map((record) => keys.map((key) => this.textValue(record[key]))),
      columnIds: keys.map((_, index) => `c${index}`)
    };
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  private formatPropertyLabel(key: string): string {
    const raw = key.replace(/^[^:]+:/, '');
    const mapped = TABLE_HEADER_LABELS[raw.replace(/[_-]/g, '').toLowerCase()];
    if (mapped) {
      return mapped;
    }
    const spaced = raw.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
    return spaced ? spaced[0].toUpperCase() + spaced.slice(1) : key;
  }

  private escapeAlfrescoFullTextSearchTerm(value: string, wildcard = false): string {
    const escaped = value.trim().replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return escaped ? (wildcard ? `*${escaped}*` : escaped) : '**';
  }

  private jobRequesitionName(department: string): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    return `JR | ${department} | ${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
}

