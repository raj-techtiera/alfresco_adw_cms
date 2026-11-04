import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of, from, firstValueFrom } from 'rxjs';
import { tap, catchError, map, switchMap } from 'rxjs/operators';
import { AuthenticationService } from '@alfresco/adf-core';
import { environment } from '../environments/environment';
import { DviMatrixRow, EngineeringMatrixRow } from './interface/programPortfolio';
import { encodeAlfrescoRelativePathParam } from './utils/encode-alfresco-relative-path-param';
const ACS_NODES_API_BASE = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';
const COMPONENT_REGISTER_RELATIVE_PATH = '/02.Engineering/01.Components/01.Component Register';
const MATRIX_GET_PATHS = [
  '01.Project Governance/02.Distribution Matrix/distribution-matrix.json',
  '05.Distribution/Distribution Matrices/distribution-matrix.json'
];
const MATRIX_CREATE_PATH = '05.Distribution/Distribution Matrices';
const FUNCTION_MATRIX_KEYS: Record<string, string> = {
  scmrequired: 'scmMatrix',
  engineeringrequired: 'engineeringMatrix',
  manufacturingrequired: 'manufacturingMatrix',
  qualityrequired: 'qualityMatrix'
};
const DVI_PAYLOAD_KEY: Record<string, string> = {
  I1: 'I1 Approval Group',
  I2: 'I2 Approval Group',
  I3: 'I3 Approval Group',
  QUA: 'QUA Approval Group',
  'SAE Quality': 'SAE Quality Group'
};
const MATRIX_PROPERTY_KEYS = [
  'shaedms:matrixdata',
  'edms:matrixdata',
  'tt:matrixdata',
  'shaedms:matrix_data',
  'edms:matrix_data',
  'tt:matrix_data',
  'matrixdata'
];

export const DVI_MATRIX_OPTIONS = Object.keys(DVI_PAYLOAD_KEY).map((value) => ({ value, label: value }));

export interface LoadedDistributionMatrix {
  nodeId: string | null;
  propertyKey: string;
  dviRows: DviMatrixRow[];
  functionRows: Record<string, EngineeringMatrixRow[]>;
}
interface AlfrescoSearchListResponse {
  list?: {
    entries?: Array<{ entry: AlfrescoNode }>;
    pagination?: { totalItems?: number };
  };
}

export interface AlfrescoNode {
  id: string;
  name: string;
  nodeType: string;
  isFolder: boolean;
  isFile: boolean;
  parentId?: string;
  modifiedAt: string;
  modifiedByUser: { displayName: string };
  content?: { mimeType: string; sizeInBytes: number };
  properties?: { [key: string]: any };
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
/** Business unit option for Create Project Asset Mapping. */
export interface BusinessUnitOption {
  id: string;
  name: string;
  code: string;
}
@Injectable({
  providedIn: 'root'
})
export class AlfrescoService {
  private baseUrl = '/alfresco/api/-default-/public/alfresco/versions/1';
  private authToken: string | null = null;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private readonly authService: AuthenticationService
  ) {
    this.authToken = localStorage.getItem('alf_auth');
    if (this.authToken || localStorage.getItem('ticket-ECM')) {
      this.isAuthenticatedSubject.next(true);
    }
  }

  login(username: string, password: string): Observable<any> {
    this.authToken = btoa(`${username}:${password}`);

    const headers = new HttpHeaders({
      Authorization: `Basic ${this.authToken}`,
      'Content-Type': 'application/json'
    });

    return this.http.get(`${this.baseUrl}/nodes/-my-`, { headers }).pipe(
      tap(() => {
        localStorage.setItem('alf_auth', this.authToken!);
        this.isAuthenticatedSubject.next(true);
      }),
      catchError((error) => {
        console.error('Login failed:', error);
        this.authToken = null;
        throw error;
      })
    );
  }

  logout(): void {
    this.authToken = null;
    localStorage.removeItem('alf_auth');
    localStorage.removeItem('ALF_LOGIN_CREDENTIALS');
    this.isAuthenticatedSubject.next(false);
  }

  getNodes(
    folderId: string = '-my-',
    options?: { include?: string; maxItems?: number; skipCount?: number; orderBy?: string }
  ): Observable<any> {
    let params = this.getAuthParams();
    if (options?.include) {
      params = params.set('include', options.include);
    }
    if (options?.maxItems != null) {
      params = params.set('maxItems', String(options.maxItems));
    }
    if (options?.skipCount != null) {
      params = params.set('skipCount', String(options.skipCount));
    }
    if (options?.orderBy) {
      params = params.set('orderBy', options.orderBy);
    }
    return this.http.get(`${this.baseUrl}/nodes/${folderId}/children`, {
      headers: this.getHeaders(),
      params
    });
  }

  getComponentRegisterChildren(projectId: string): Observable<any> {
    const encodedPath = encodeAlfrescoRelativePathParam(COMPONENT_REGISTER_RELATIVE_PATH);
    const url = `${this.baseUrl}/nodes/${projectId}/children?include=properties&relativePath=${encodedPath}`;
    return this.http.get(url, { headers: this.getHeaders(), params: this.getAuthParams() });
  }

  getComponentRegisterCount(projectId: string): Observable<number> {
    return this.getComponentRegisterChildren(projectId).pipe(
      map((res) => res?.list?.pagination?.count ?? res?.list?.pagination?.totalItems ?? res?.list?.entries?.length ?? 0)
    );
  }
  postNodes(folderId: string = '', data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/nodes/${folderId}/children`, data, { headers: this.getHeaders(), params: this.getAuthParams() });
  }
  bulkuploadDocumentFiles(file: File, folderId: string, metaData: Record<string, string>): Observable<AlfrescoNode> {
    const formData = new FormData();
    formData.append('filedata', file);
    formData.append('cm:title', file.name);
    formData.append('nodeType', 'dms:dmsDocument');
    formData.append('dms:business_domain', metaData['business_domain'] ?? '');
    formData.append('dms:discipline', metaData['discipline'] ?? '');
    formData.append('dms:discipline_code', metaData['discipline_code'] ?? '');
    formData.append('dms:document_type', metaData['document_type'] ?? '');
    formData.append('dms:document_type_code', metaData['document_type_code'] ?? '');
    formData.append('dms:document_sheet_number', metaData['document_sheet_number'] ?? '');

    if (metaData['relativePath']) {
      formData.append('relativePath', metaData['relativePath']);
    }

    return this.http
      .post<any>(`${this.baseUrl}/nodes/${folderId}/children`, formData, {
        headers: this.getHeaders().delete('Content-Type'),
        params: this.getAuthParams()
      })
      .pipe(
        map((response) => response.entry),
        catchError((error) => {
          console.error('Upload failed:', error);
          throw error;
        })
      );
  }

  uploadIncomingTransmittalFile(
    file: File,
    folderId: string,
    projectTitle: string,
    transmittalNumber: string
  ): Observable<AlfrescoNode> {
    const formData = new FormData();
    formData.append('filedata', file);
    formData.append('cm:title', file.name);
    formData.append('nodeType', 'edms:transmital');
    formData.append('edms:project_title', projectTitle);
    formData.append('edms:transmittal_number', transmittalNumber);

    return this.http
      .post<any>(`${this.baseUrl}/nodes/${folderId}/children`, formData, {
        headers: this.getHeaders().delete('Content-Type'),
        params: this.getAuthParams()
      })
      .pipe(
        map((response) => response.entry),
        catchError((error) => {
          console.error('Incoming transmittal upload failed:', error);
          throw error;
        })
      );
  }

  uploadDocumentFiles(file: File, folderId: string): Observable<AlfrescoNode> {
    const formData = new FormData();
    formData.append('filedata', file);
    formData.append('nodeType', 'cm:content');
    formData.append('relativePath', '02.Engineering/01.Components/02.Component Import Templates');

    return this.http
      .post<any>(`${this.baseUrl}/nodes/${folderId}/children`, formData, {
        headers: this.getHeaders().delete('Content-Type'),
        params: this.getAuthParams()
      })
      .pipe(
        map((response) => response.entry),
        catchError((error) => {
          console.error('Upload failed:', error);
          throw error;
        })
      );
  }
  getNodeContent(nodeId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/nodes/${nodeId}/content`, { headers: this.getHeaders(), params: this.getAuthParams(), responseType: 'blob' });
  }

  updateNodeContent(nodeId: string, file: Blob): Observable<AlfrescoNode> {
    const params = this.getAuthParams().set('majorVersion', 'false').set('comment', 'Saved from CAD viewer');
    return this.http
      .put<any>(`${this.baseUrl}/nodes/${nodeId}/content`, file, {
        headers: this.getHeaders().set('Content-Type', file.type || 'application/octet-stream'),
        params
      })
      .pipe(
        map((response) => response?.entry ?? response),
        catchError((error) => {
          console.error('Content update failed:', error);
          throw error;
        })
      );
  }

  isLoggedIn(): boolean {
    return !!(this.authToken || localStorage.getItem('ticket-ECM'));
  }

  uploadDocument(file: File, folderId: string, metadata?: any): Observable<AlfrescoNode> {
    const formData = new FormData();
    formData.append('filedata', file);
    formData.append('name', file.name);
    formData.append('autoRename', 'true');

    if (metadata) {
      formData.append('properties', JSON.stringify(metadata));
    }

    return this.http
      .post<any>(`${this.baseUrl}/nodes/${folderId}/children`, formData, {
        headers: this.getHeaders().delete('Content-Type'),
        params: this.getAuthParams()
      })
      .pipe(
        map((response) => response.entry),
        catchError((error) => {
          console.error('Upload failed:', error);
          throw error;
        })
      );
  }

  updateNodeMetadata(nodeId: string, metadata: any): Observable<AlfrescoNode> {
    return this.http
      .put<any>(`${this.baseUrl}/nodes/${nodeId}`, { properties: metadata }, { headers: this.getHeaders().set('Content-Type', 'application/json'), params: this.getAuthParams() })
      .pipe(
        map((response) => response.entry),
        catchError((error) => {
          console.error('Metadata update failed:', error);
          throw error;
        })
      );
  }

  getNode(nodeId: string): Observable<AlfrescoNode> {
    return this.http.get<any>(`${this.baseUrl}/nodes/${nodeId}`, { headers: this.getHeaders(), params: this.getAuthParams() }).pipe(
      map((response) => response.entry),
      catchError((error) => {
        console.error('Get node failed:', error);
        throw error;
      })
    );
  }

  searchNodes(query: string, options?: { include?: string[]; maxItems?: number }): Observable<AlfrescoNode[]> {
    const searchQuery: any = {
      query: {
        query,
        language: 'afts'
      },
      paging: {
        maxItems: options?.maxItems || 100,
        skipCount: 0
      }
    };

    if (options?.include?.length) {
      searchQuery.include = options.include;
    }

    return this.http
      .post<any>(`${this.baseUrl.replace('alfresco/versions/1', 'search/versions/1')}/search`, searchQuery, {
        headers: this.getHeaders().set('Content-Type', 'application/json'),
        params: this.getAuthParams()
      })
      .pipe(
        map((response) =>
          response.list.entries.map((e: any) => ({
            ...e.entry,
            properties: e.entry.properties || {}
          }))
        ),
        catchError((error) => {
          console.error('Search failed:', error);
          throw error;
        })
      );
  }

  deleteNode(nodeId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/nodes/${nodeId}`, { headers: this.getHeaders(), params: this.getAuthParams() }).pipe(
      catchError((error) => {
        console.error('Delete node failed:', error);
        throw error;
      })
    );
  }

  moveNode(nodeId: string, targetFolderId: string): Observable<void> {
    return this.http
      .post<any>(
        `${this.baseUrl}/nodes/${nodeId}/move`,
        { targetParentId: targetFolderId },
        { headers: this.getHeaders().set('Content-Type', 'application/json'), params: this.getAuthParams().set('autoRename', 'true') }
      )
      .pipe(
        map(() => void 0),
        catchError((error) => {
          console.error('Move node failed:', error);
          throw error;
        })
      );
  }

  createFolder(name: string, parentId: string): Observable<AlfrescoNode> {
    return this.http
      .post<any>(`${this.baseUrl}/nodes/${parentId}/children`, { name, nodeType: 'cm:folder' }, { headers: this.getHeaders().set('Content-Type', 'application/json'), params: this.getAuthParams() })
      .pipe(
        map((response) => response.entry),
        catchError((error) => {
          console.error('Create folder failed:', error);
          throw error;
        })
      );
  }

  ensureFolder(name: string, parentId: string): Observable<AlfrescoNode> {
    return this.http
      .get<any>(`${this.baseUrl}/nodes/${parentId}/children?where=(isFolder=true)&maxItems=100`, { headers: this.getHeaders(), params: this.getAuthParams() })
      .pipe(
        switchMap((response) => {
          const entries = response.list?.entries || [];
          const existing = entries.find((e: any) => e.entry.name === name && e.entry.isFolder);
          if (existing) {
            return of(existing.entry as AlfrescoNode);
          }
          return this.createFolder(name, parentId);
        }),
        catchError(() =>
          this.createFolder(name, parentId).pipe(
            catchError((createErr) => {
              if (createErr.status === 409) {
                return this.http.get<any>(`${this.baseUrl}/nodes/${parentId}/children?maxItems=100`, { headers: this.getHeaders(), params: this.getAuthParams() }).pipe(
                  map((resp) => {
                    const found = resp.list.entries.find((e: any) => e.entry.name === name && e.entry.isFolder);
                    if (found) {
                      return found.entry as AlfrescoNode;
                    }
                    throw createErr;
                  })
                );
              }
              throw createErr;
            })
          )
        )
      );
  }

  getSites(): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/sites?maxItems=100`, { headers: this.getHeaders(), params: this.getAuthParams() }).pipe(
      map((response) => (response.list?.entries || []).map((e: any) => e.entry)),
      catchError((error) => {
        console.error('Get sites failed:', error);
        throw error;
      })
    );
  }

  getSiteDocumentLibrary(siteId: string): Observable<AlfrescoNode> {
    return this.http.get<any>(`${this.baseUrl}/sites/${siteId}/containers/documentLibrary`, { headers: this.getHeaders(), params: this.getAuthParams() }).pipe(
      map((response) => response.entry),
      catchError((error) => {
        console.error('Get site document library failed:', error);
        throw error;
      })
    );
  }

  getNodeMetadata(nodeId: string): Observable<any> {
    return this.http
      .get<any>(`${this.baseUrl}/nodes/${nodeId}?include=properties`, {
        headers: this.getHeaders(),
        params: this.getAuthParams()
      })
      .pipe(
        map((response) => response.entry.properties),
        catchError((error) => {
          console.error('Get metadata failed:', error);
          throw error;
        })
      );
  }

  listNodeVersions(nodeId: string): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/nodes/${nodeId}/versions`, { headers: this.getHeaders(), params: this.getAuthParams() }).pipe(
      map((response) => (response.list?.entries || []).map((e: any) => e.entry)),
      catchError((error) => {
        console.error('List versions failed:', error);
        throw error;
      })
    );
  }

  revertToVersion(nodeId: string, versionId: string): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/nodes/${nodeId}/versions/${versionId}/revert`, {}, { headers: this.getHeaders().set('Content-Type', 'application/json'), params: this.getAuthParams() })
      .pipe(
        catchError((error) => {
          console.error('Revert version failed:', error);
          throw error;
        })
      );
  }

  searchRecent(maxItems = 6): Observable<{ items: any[]; total: number }> {
    const searchUrl = '/alfresco/api/-default-/public/search/versions/1/search';
    const body = {
      query: { query: 'TYPE:"cm:content"', language: 'afts' },
      sort: [{ type: 'FIELD', field: 'cm:modified', ascending: false }],
      paging: { maxItems },
      include: ['path']
    };

    return this.http
      .post<any>(searchUrl, body, {
        headers: this.getHeaders().set('Content-Type', 'application/json'),
        params: this.getAuthParams()
      })
      .pipe(
        map((resp) => ({
          items: (resp.list?.entries || []).map((e: any) => e.entry),
          total: resp.list?.pagination?.totalItems || 0
        })),
        catchError(() => of({ items: [], total: 0 }))
      );
  }
  
  commonSearch(query: { parentId: string; type: string; status: string; name: string }): Observable<{ items: any[]; total: number }> {
    const searchUrl = '/alfresco/api/-default-/public/search/versions/1/search';
    const body = {
      query: { query:  `(PARENT:'workspace://SpacesStore/${query.parentId}' AND TYPE:'edms:mdrItem' AND edms:mdrStatus:'Expected' AND  cm:name:'*${query.name}*')`, language: 'afts' },
      include: ['properties']
    };

    return this.http
      .post<any>(searchUrl, body, {
        headers: this.getHeaders().set('Content-Type', 'application/json'),
        params: this.getAuthParams()
      })
      .pipe(
        map((resp) => ({
          items: (resp.list?.entries || []).map((e: any) => e.entry),
          total: resp.list?.pagination?.totalItems || 0
        })),
        catchError(() => of({ items: [], total: 0 }))
      );
  }
  FilterSearch(options: {
    projectId: string;
    name?: string;
    documentClass?: string;
    mdrDiscipline?: string;
    deliverableType?: string;
    mdrStatus?: string;
    maxItems?: number;
    skipCount?: number;
  }): Observable<{ items: AlfrescoNode[]; total: number }> {
    const searchUrl = '/alfresco/api/-default-/public/search/versions/1/search';
    const projectId = (options.projectId ?? '').trim();
    if (!projectId) {
      return of({ items: [], total: 0 });
    }

    const clauses = [
      `ANCESTOR:'workspace://SpacesStore/${projectId}'`,
      `TYPE:'edms:mdrItem'`
    ];

    const name = this.escapeAftsExact(options.name);
    if (name) {
      clauses.push(`cm:name:'*${name}*'`);
    }
    const documentClass = this.escapeAftsExact(options.documentClass);
    if (documentClass) {
      clauses.push(`edms:documentClass:'${documentClass}'`);
    }
    const mdrDiscipline = this.escapeAftsExact(options.mdrDiscipline);
    if (mdrDiscipline) {
      clauses.push(`edms:mdrDiscipline:'${mdrDiscipline}'`);
    }
    const deliverableType = this.escapeAftsExact(options.deliverableType);
    if (deliverableType) {
      clauses.push(`edms:deliverableType:'${deliverableType}'`);
    }
    const mdrStatus = this.escapeAftsExact(options.mdrStatus);
    if (mdrStatus) {
      clauses.push(`edms:mdrStatus:'${mdrStatus}'`);
    }

    const query = `(${clauses.join(' AND ')})`;

    const body = {
      query: { query, language: 'afts' },
      include: ['properties'],
      paging: {
        maxItems: options.maxItems ?? 1000,
        skipCount: options.skipCount ?? 0
      },
      sort: [
        {
          type: 'FIELD',
          field: 'cm:name',
          ascending: true
        }
      ]
    };

    return this.http
      .post<any>(searchUrl, body, {
        headers: this.getHeaders().set('Content-Type', 'application/json'),
        params: this.getAuthParams()
      })
      .pipe(
        map((resp) => ({
          items: (resp.list?.entries || []).map((e: any) => e.entry as AlfrescoNode),
          total: resp.list?.pagination?.totalItems || 0
        })),
        catchError(() => of({ items: [], total: 0 }))
      );
  }

  /**
   * Portfolio filter search for edms:engineeringProject under a parent folder.
   * Always includes PARENT + TYPE and wildcard clauses for name/client/type/scope/discipline
   * (`**` when unset, `*value*` when a filter is applied).
   */
  searchEngineeringProjects(options: {
    parentId: string;
    name?: string;
    client?: string;
    projectType?: string;
    projectScope?: string;
    projectDiscipline?: string;
    sort?: 'created-desc' | 'created-asc' | 'name-asc' | 'name-desc';
    maxItems?: number;
    skipCount?: number;
  }): Observable<{ items: AlfrescoNode[]; total: number }> {
    const searchUrl = '/alfresco/api/-default-/public/search/versions/1/search';
    const parentRef = `workspace://SpacesStore/${options.parentId}`;

    const nameTerm = this.toAftsWildcard(options.name);
    const clientTerm = this.toAftsWildcard(options.client);
    const typeTerm = this.toAftsWildcard(options.projectType);
    const scopeTerm = this.toAftsWildcard(options.projectScope);
    const disciplineTerm = this.toAftsWildcard(options.projectDiscipline);
    const query =
      `(PARENT:'${parentRef}' AND TYPE:'edms:engineeringProject'` +
      ` AND cm:name:'${nameTerm}'` +
      ` AND edms:project_client:'${clientTerm}'` +
      ` AND edms:projectType:'${typeTerm}'` +
      ` AND edms:projectScope:'${scopeTerm}'` +
      ` AND edms:projectDiscipline:'${disciplineTerm}')`;

    const body = {
      query: { query, language: 'afts' },
      include: ['properties'],
      paging: {
        maxItems: options.maxItems ?? 1000,
        skipCount: options.skipCount ?? 0
      },
      sort: [this.buildEngineeringProjectSort(options.sort)]
    };

    return this.http
      .post<any>(searchUrl, body, {
        headers: this.getHeaders().set('Content-Type', 'application/json'),
        params: this.getAuthParams()
      })
      .pipe(
        map((resp) => ({
          items: (resp.list?.entries || []).map((e: any) => e.entry as AlfrescoNode),
          total: resp.list?.pagination?.totalItems || 0
        })),
        catchError(() => of({ items: [], total: 0 }))
      );
  }

  /**
   * Portfolio filter search for shaedms:programIdentification under a parent folder.
   * Always includes PARENT + TYPE and wildcard/exact clauses for name/type/status/category
   * (`**` when unset).
   */
  searchPrograms(options: {
    parentId: string;
    name?: string;
    programType?: string;
    programStatus?: string;
    programCategory?: string;
    sort?: 'created-desc' | 'created-asc' | 'name-asc' | 'name-desc';
    maxItems?: number;
    skipCount?: number;
  }): Observable<{ items: AlfrescoNode[]; total: number }> {
    const searchUrl = '/alfresco/api/-default-/public/search/versions/1/search';
    const parentRef = `workspace://SpacesStore/${options.parentId}`;

    const nameTerm = this.toAftsWildcard(options.name);
    const typeTerm = this.toAftsExactOrAll(options.programType);
    const statusTerm = this.toAftsExactOrAll(options.programStatus);
    const categoryTerm = this.toAftsExactOrAll(options.programCategory);
    const query =
      `(PARENT:'${parentRef}' AND TYPE:'shaedms:programIdentification'` +
      ` AND cm:name:'${nameTerm}'` +
      ` AND shaedms:program_type:'${typeTerm}'` +
      ` AND shaedms:program_status:'${statusTerm}'` +
      ` AND shaedms:program_catagory:'${categoryTerm}')`;

    const body = {
      query: { query, language: 'afts' },
      include: ['properties'],
      paging: {
        maxItems: options.maxItems ?? 20,
        skipCount: options.skipCount ?? 0
      },
      sort: [this.buildEngineeringProjectSort(options.sort)]
    };

    return this.http
      .post<AlfrescoSearchListResponse>(searchUrl, body, {
        headers: this.getHeaders().set('Content-Type', 'application/json'),
        params: this.getAuthParams()
      })
      .pipe(
        map((resp) => ({
          items: (resp.list?.entries ?? []).map((e) => e.entry),
          total: resp.list?.pagination?.totalItems ?? 0
        })),
        catchError(() => of({ items: [], total: 0 }))
      );
  }

  /** Escape a value for AFTS exact-match. Empty → omit clause. */
  private escapeAftsExact(value?: string): string {
    const raw = (value ?? '').trim();
    if (!raw) {
      return '';
    }
    return raw.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  /** Empty → `**`; otherwise escaped exact value (no surrounding wildcards). */
  private toAftsExactOrAll(value?: string): string {
    return this.escapeAftsExact(value) || '**';
  }

  /** Empty → `**`; otherwise wrap as `*value*` for AFTS wildcard match. */
  private toAftsWildcard(value?: string): string {
    const escaped = this.escapeAftsExact(value);
    return escaped ? `*${escaped}*` : '**';
  }

  private buildEngineeringProjectSort(
    sort?: 'created-desc' | 'created-asc' | 'name-asc' | 'name-desc'
  ): { type: string; field: string; ascending: boolean } {
    switch (sort) {
      case 'created-asc':
        return { type: 'FIELD', field: 'cm:created', ascending: true };
      case 'name-asc':
        return { type: 'FIELD', field: 'cm:name', ascending: true };
      case 'name-desc':
        return { type: 'FIELD', field: 'cm:name', ascending: false };
      case 'created-desc':
      default:
        return { type: 'FIELD', field: 'cm:created', ascending: false };
    }
  }

  /**
   * Find an uploaded engineering document linked to an MDR item
   * (`edms:docMdrNodeRef` / `edms:docMdrNumber`) for View Details preview.
   */

  findEngineeringDocLinkedToMdr(options: {
    mdrNodeId: string;
    mdrNumber?: string;
    projectId?: string;
  }): Observable<string | null> {
    const mdrNodeId = (options.mdrNodeId ?? '').trim();
    const mdrNumber = (options.mdrNumber ?? '').trim();
    if (!mdrNodeId && !mdrNumber) {
      return of(null);
    }

    const clauses: string[] = [`TYPE:'edms:engineeringDoc'`];
    const projectId = (options.projectId ?? '').trim();
    if (projectId) {
      clauses.push(`ANCESTOR:'workspace://SpacesStore/${projectId}'`);
    }

    const linkClauses: string[] = [];
    if (mdrNodeId) {
      const escapedId = this.escapeAftsExact(mdrNodeId);
      linkClauses.push(`edms:docMdrNodeRef:'workspace://SpacesStore/${escapedId}'`);
      linkClauses.push(`edms:docMdrNodeRef:'${escapedId}'`);
    }
    if (mdrNumber) {
      const escapedNumber = this.escapeAftsExact(mdrNumber);
      if (escapedNumber) {
        linkClauses.push(`edms:docMdrNumber:'${escapedNumber}'`);
      }
    }
    if (linkClauses.length) {
      clauses.push(`(${linkClauses.join(' OR ')})`);
    }

    const searchUrl = '/alfresco/api/-default-/public/search/versions/1/search';
    const body = {
      query: { query: `(${clauses.join(' AND ')})`, language: 'afts' },
      include: ['properties'],
      paging: { maxItems: 1, skipCount: 0 },
      sort: [{ type: 'FIELD', field: 'cm:modified', ascending: false }]
    };

    return this.http
      .post<any>(searchUrl, body, {
        headers: this.getHeaders().set('Content-Type', 'application/json'),
        params: this.getAuthParams()
      })
      .pipe(
        map((resp) => {
          const id = resp?.list?.entries?.[0]?.entry?.id;
          return typeof id === 'string' && id.trim() ? id.trim() : null;
        }),
        catchError(() => of(null))
      );
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (this.authToken) {
      headers = headers.set('Authorization', `Basic ${this.authToken}`);
    }
    return headers;
  }

  private getAuthParams(): HttpParams {
    let params = new HttpParams();
    if (!this.authToken) {
      const ecmTicket = localStorage.getItem('ticket-ECM');
      if (ecmTicket) {
        params = params.set('alf_ticket', ecmTicket);
      }
    }
    return params;
  }
  /**
   * Business units under `NG_APP_BUSINESS_UNITS_NODE_ID`.
   * Used by Create Project → Asset Mapping dropdown.
   */
  private mapBusinessUnitOption(entry: AlfrescoChildEntry): BusinessUnitOption {
    const props = entry.properties ?? {};
    const name =
      this.readPropString(props, 'edms:business_unit_name') ||
      this.readPropString(props, 'cm:title') ||
      (entry.name || '').trim();
    const code = this.readPropString(props, 'edms:business_unit_code');
    return {
      id: entry.id,
      name,
      code
    };
  }

  private readPropString(props: Record<string, unknown>, key: string): string {
    const value = props[key];
    return value != null ? String(value).trim() : '';
  }
  private withIncludeProperties(url: string): string {
    if (url.includes('include=properties')) {
      return url;
    }
    return `${url}${url.includes('?') ? '&' : '?'}include=properties`;
  }
  async getBusinessUnits(): Promise<BusinessUnitOption[]> {
    const parentId = (environment.businessUnitsParentNodeId || '').trim();
    if (!parentId) {
      return [];
    }

    const url = this.withIncludeProperties(
      `${ACS_NODES_API_BASE}/${encodeURIComponent(parentId)}/children?maxItems=200`
    );
    const headers = await firstValueFrom(this.authService.addTokenToHeader(url));
    const response = await firstValueFrom(this.http.get<any>(url, { headers }));
    const entries = (response?.list?.entries ?? [])
      .map((item: any) => item?.entry as AlfrescoChildEntry)
      .filter((entry: AlfrescoChildEntry | undefined): entry is AlfrescoChildEntry => !!entry?.id);

    return entries
      .map((entry:any) => this.mapBusinessUnitOption(entry))
      .filter((opt:any) => !!opt.name)
      .sort((a:any, b:any) => a.name.localeCompare(b.name));
  }

  getCountries(): Observable<any[]> {
    const url = '/alfresco/service/pttep/docnum/countries';
    return this.authService
      .addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
      .pipe(switchMap((headers) => this.http.get<any[]>(url, { headers })));
  }
  getDisciplines(): Observable<any[]> {
    const url = '/alfresco/service/pttep/docnum/disciplines';
    return this.authService
      .addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
      .pipe(switchMap((headers) => this.http.get<any[]>(url, { headers })));
  }
  getCategories(): Observable<any[]> {
    const url = '/alfresco/service/pttep/docnum/categories';
    return this.authService
      .addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
      .pipe(switchMap((headers) => this.http.get<any[]>(url, { headers })));
  }
  getDocumentTypeByCategoryId(categoryId: string): Observable<any[]> {
    const url = `/alfresco/service/pttep/docnum/document-types?categoryCode=${categoryId}`;
    return this.authService
      .addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
      .pipe(switchMap((headers) => this.http.get<any[]>(url, { headers })));
  }
  getSheetNo()
  {
    const url = '/alfresco/service/pttep/docnum/sheets';
    return this.authService
      .addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
      .pipe(switchMap((headers) => this.http.get<any[]>(url, { headers })));
  }
  getVendorcode()
  {
    const url = '/alfresco/service/pttep/docnum/vendor-data-codes';
    return this.authService
      .addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
      .pipe(switchMap((headers) => this.http.get<any[]>(url, { headers })));
  }

  getRecipients(): Observable<any[]> {
    const url = '/alfresco/service/pttep/docnum/recipients';
    return this.authService
      .addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
      .pipe(switchMap((headers) => this.http.get<any[]>(url, { headers })));
  }

  getDocnumFacilities(): Observable<any[]> {
    const url = '/alfresco/service/pttep/docnum/facilities';
    return this.authService
      .addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
      .pipe(switchMap((headers) => this.http.get<any[]>(url, { headers })));
  }

  /**
   * Checks whether an engineering document already uses the given document number.
   * POST /alfresco/api/-default-/public/search/versions/1/search
   */
  searchEngineeringDocByDocumentNumber(documentNumber: string): Observable<{
    exists: boolean;
    count: number;
    entries: unknown[];
  }> {
    const searchUrl = '/alfresco/api/-default-/public/search/versions/1/search';
    const escaped = String(documentNumber ?? '')
      .trim()
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
    const body = {
      query: {
        query: `TYPE:'edms:engineeringDoc' AND =edms:document_number:'${escaped}'`
      },
      include: ['properties'],
      paging: {
        maxItems: 1,
        skipCount: 0
      }
    };

    return this.http
      .post<any>(searchUrl, body, {
        headers: this.getHeaders().set('Content-Type', 'application/json'),
        params: this.getAuthParams()
      })
      .pipe(
        map((response) => {
          const entries = Array.isArray(response?.list?.entries) ? response.list.entries : [];
          const totalItems =
            typeof response?.list?.pagination?.totalItems === 'number'
              ? response.list.pagination.totalItems
              : entries.length;
          const count = Math.max(entries.length, totalItems);
          return {
            exists: count > 0,
            count,
            entries
          };
        }),
        catchError((error) => {
          console.error('Document number search failed:', error);
          throw error;
        })
      );
  }

  /**
   * Starts Document Number Change process via `NG_APP_PROCESS_INSTANCES_URL`
   * with `processDefinitionKey` from `NG_APP_DOCUMENT_NUMBER_CHANGE_PROCESS_DEFINITION_KEY`.
   */
  startDocumentNumberChangeProcess(input: {
    documentId: string;
    documentName: string;
    projectName: string;
    region: string;
    fieldAsset: string;
    facility: string;
    currentDocumentNumber: string;
    proposedDocumentNumber: string;
    reasonForChange: string;
    requestedBy: string;
    requestedDate: string;
  }): Observable<unknown> {
    const key = environment.documentNumberChangeProcessDefinitionKey;
    const currentDocumentNumber = String(input.currentDocumentNumber ?? '').trim();
    const payload = {
      processDefinitionKey: key,
      name: `Document Number Change - ${currentDocumentNumber || input.proposedDocumentNumber}`,
      businessKey: key,
      variables: [
        { name: 'documentid', value: String(input.documentId ?? '').trim() },
        { name: 'documentname', value: String(input.documentName ?? '').trim() },
        { name: 'projectname', value: String(input.projectName ?? '').trim() },
        { name: 'region', value: String(input.region ?? '').trim() },
        { name: 'fieldasset', value: String(input.fieldAsset ?? '').trim() },
        { name: 'facility', value: String(input.facility ?? '').trim() },
        { name: 'currentdocumentnumber', value: currentDocumentNumber },
        { name: 'proposeddocumentnumber', value: String(input.proposedDocumentNumber ?? '').trim() },
        { name: 'reasonforchange', value: String(input.reasonForChange ?? '').trim() },
        { name: 'requestedby', value: String(input.requestedBy ?? '').trim() },
        { name: 'requesteddate', value: String(input.requestedDate ?? '').trim() }
      ]
    };

    return from(
      this.authService.addTokenToHeader(
        environment.processInstancesUrl,
        new HttpHeaders({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
    ).pipe(
      switchMap((headers) => this.http.post(environment.processInstancesUrl, payload, { headers })),
      catchError((error) => {
        console.error('Document number change process start failed:', error);
        throw error;
      })
    );
  }

  async loadDistributionMatrix(projectId: string): Promise<LoadedDistributionMatrix> {
    const id = projectId.trim();
    if (!id) {
      throw new Error('Project id is required.');
    }

    for (const relativePath of MATRIX_GET_PATHS) {
      try {
        const response = await firstValueFrom(
          this.http.get<{ entry?: { id?: string; properties?: Record<string, unknown> } }>(
            `${this.baseUrl}/nodes/${id}?relativePath=${encodeAlfrescoRelativePathParam(relativePath)}&include=properties`,
            { headers: this.getHeaders(), params: this.getAuthParams() }
          )
        );
        const entry = response?.entry;
        return { nodeId: entry?.id?.trim() || null, ...parseMatrixProperties(entry?.properties ?? {}) };
      } catch (err) {
        if (!isNotFoundError(err)) {
          throw err;
        }
      }
    }

    return { nodeId: null, propertyKey: 'edms:matrix_data', dviRows: [], functionRows: {} };
  }

  async saveDistributionMatrix(
    projectId: string,
    nodeId: string | null,
    propertyKey: string,
    dviRows: DviMatrixRow[],
    functionRows: Record<string, EngineeringMatrixRow[]>
  ): Promise<string> {
    const id = projectId.trim();
    if (!id) {
      throw new Error('Project id is required.');
    }

    const properties = { [propertyKey]: buildMatrixPayload(dviRows, functionRows) };
    let matrixNodeId = nodeId?.trim() || (await this.createDistributionMatrixNode(id));
    try {
      await firstValueFrom(this.updateNodeMetadata(matrixNodeId, properties));
      return matrixNodeId;
    } catch (err) {
      if (!isNotFoundError(err)) {
        throw err;
      }
      matrixNodeId = await this.createDistributionMatrixNode(id);
      await firstValueFrom(this.updateNodeMetadata(matrixNodeId, properties));
      return matrixNodeId;
    }
  }

  private async createDistributionMatrixNode(projectId: string): Promise<string> {
    const created = await firstValueFrom(
      this.postNodes(projectId, {
        name: 'distribution-matrix.json',
        nodeType: 'tt:distributionMatrix',
        relativePath: MATRIX_CREATE_PATH
      })
    );
    const createdId = created?.entry?.id?.trim();
    if (!createdId) {
      throw new Error('Created but could not read node id from response.');
    }
    return createdId;
  }

  /**
   * Returns whether the project folder has `isPoRequired` set to true.
   * GET `/nodes/{projectId}?include=properties`
   */
  isProjectPoRequired(projectId: string): Observable<boolean> {
    const id = String(projectId ?? '').trim();
    if (!id) {
      return of(false);
    }

    return this.getNodeMetadata(id).pipe(
      map((properties) => AlfrescoService.readIsPoRequired(properties)),
      catchError(() => of(false))
    );
  }

  private static readIsPoRequired(properties: Record<string, unknown> | null | undefined): boolean {
    if (!properties || typeof properties !== 'object') {
      return false;
    }

    const directKeys = [
      'tt:isPoRequired',
      'tt:ispoRequired',
      'tt:is_po_required',
      'edms:isPoRequired',
      'edms:is_po_required',
      'isPoRequired'
    ];

    for (const key of directKeys) {
      if (Object.prototype.hasOwnProperty.call(properties, key)) {
        return AlfrescoService.isTruthyNodeProperty(properties[key]);
      }
    }

    for (const [key, value] of Object.entries(properties)) {
      const normalized = key
        .replace(/^[a-zA-Z0-9]+:/, '')
        .replace(/[_-]+/g, '')
        .toLowerCase();
      if (normalized === 'isporequired') {
        return AlfrescoService.isTruthyNodeProperty(value);
      }
    }

    return false;
  }

  private static isTruthyNodeProperty(value: unknown): boolean {
    if (value === true || value === 1) {
      return true;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      return normalized === 'true' || normalized === '1' || normalized === 'yes';
    }
    return false;
  }
}

function isNotFoundError(err: unknown): boolean {
  const text = JSON.stringify(err ?? '').toLowerCase();
  return (err as { status?: number })?.status === 404
    ? true
    : text.includes('"status":404') || text.includes('"statuscode":404') || text.includes('not found');
}

function parseMatrixProperties(properties: Record<string, unknown>): Omit<LoadedDistributionMatrix, 'nodeId'> {
  const found = findMatrixProperty(properties);
  const parsed = parseMatrixJson(found.raw);
  const empty = { propertyKey: found.key, dviRows: [] as DviMatrixRow[], functionRows: {} as Record<string, EngineeringMatrixRow[]> };
  if (!parsed) {
    return empty;
  }
  if (Array.isArray(parsed)) {
    return {
      ...empty,
      functionRows: {
        engineeringrequired: parsed
          .map((item) => toEngineeringRow(asObject(item), true))
          .filter((row): row is EngineeringMatrixRow => !!row)
      }
    };
  }
  if (typeof parsed !== 'object') {
    return empty;
  }
  const data = parsed as Record<string, unknown>;
  const functionRows: Record<string, EngineeringMatrixRow[]> = {};
  for (const [functionKey, matrixKey] of Object.entries(FUNCTION_MATRIX_KEYS)) {
    const list = data[matrixKey];
    if (!Array.isArray(list)) {
      continue;
    }
    functionRows[functionKey] = list
      .map((item) => toEngineeringRow(asObject(item), false))
      .filter((row): row is EngineeringMatrixRow => !!row);
  }
  return { propertyKey: found.key, dviRows: readDviRows(data['dviMatrix']), functionRows };
}

function findMatrixProperty(properties: Record<string, unknown>): { key: string; raw: unknown } {
  for (const key of MATRIX_PROPERTY_KEYS) {
    if (properties[key] != null && properties[key] !== '') {
      return { key, raw: properties[key] };
    }
  }
  for (const [key, value] of Object.entries(properties)) {
    if (value == null || value === '') {
      continue;
    }
    const name = key.replace(/^[a-zA-Z0-9]+:/, '').replace(/[_-]+/g, '').toLowerCase();
    if (name === 'matrixdata') {
      return { key, raw: value };
    }
  }
  return { key: 'edms:matrix_data', raw: null };
}

function parseMatrixJson(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
    } catch {
      return null;
    }
  }
  return raw == null || raw === '' ? null : typeof raw === 'object' ? raw : null;
}

function readDviRows(raw: unknown): DviMatrixRow[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return [];
  }
  return Object.entries(raw as Record<string, unknown>)
    .map(([label, value]) => {
      const groupId = textValue(value);
      const match = Object.entries(DVI_PAYLOAD_KEY).find(([, payloadKey]) => payloadKey === label);
      return !groupId
        ? null
        : {
            id: newMatrixId('dvi'),
            dviValue: match?.[0] || label.replace(/\s+Approval Group$/i, '').trim() || label,
            groupId,
            groupName: groupId.replace(/^GROUP_/i, '')
          };
    })
    .filter((row): row is DviMatrixRow => !!row);
}

function toEngineeringRow(row: Record<string, unknown>, allowFacility: boolean): EngineeringMatrixRow | null {
  const discipline = textValue(
    allowFacility ? row['facility'] ?? row['asset'] ?? row['discipline'] : row['discipline']
  );
  const reviewerGroupId = textValue(row['reviewerGroup']);
  const approverGroupId = textValue(row['approverGroup']);
  return !discipline && !reviewerGroupId && !approverGroupId
    ? null
    : {
        id: newMatrixId('em'),
        discipline,
        reviewerGroupId,
        reviewerGroupName: reviewerGroupId.replace(/^GROUP_/i, ''),
        approverGroupId,
        approverGroupName: approverGroupId.replace(/^GROUP_/i, '')
      };
}

function buildMatrixPayload(dviRows: DviMatrixRow[], functionRows: Record<string, EngineeringMatrixRow[]>): string {
  const dviMatrix: Record<string, string> = {};
  for (const row of dviRows) {
    if (row.groupId) {
      dviMatrix[DVI_PAYLOAD_KEY[row.dviValue] || `${row.dviValue} Approval Group`] = row.groupId;
    }
  }
  const payload: Record<string, unknown> = { dviMatrix };
  for (const [functionKey, matrixKey] of Object.entries(FUNCTION_MATRIX_KEYS)) {
    payload[matrixKey] = (functionRows[functionKey] || []).map((row) => ({
      discipline: row.discipline,
      reviewerGroup: row.reviewerGroupId,
      approverGroup: row.approverGroupId
    }));
  }
  return JSON.stringify(payload);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function textValue(value: unknown): string {
  return value != null ? String(value).trim() : '';
}

function newMatrixId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
