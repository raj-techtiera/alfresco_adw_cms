import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AuthenticationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';
import { AlfrescoService } from '../../alfresco.service';
import { DmsDashboardFilters, DmsSearchResponse } from '../../interface/dms';

@Injectable({ providedIn: 'root' })
export class DmsDashboardService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthenticationService);
  private readonly alfrescoService = inject(AlfrescoService);
  private readonly searchUrl = '/alfresco/api/-default-/public/search/versions/1/search';

  async searchDocuments(filters: DmsDashboardFilters, maxItems = 100): Promise<DmsSearchResponse> {
    const query = this.buildQuery(filters);
    const headers = await firstValueFrom(
      this.authService.addTokenToHeader(
        this.searchUrl,
        new HttpHeaders({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
    );
    return firstValueFrom(
      this.http.post<DmsSearchResponse>(
        this.searchUrl,
        {
          query: { query, language: 'afts' },
          include: ['properties'],
          paging: { maxItems, skipCount: 0 },
          sort: [{ type: 'FIELD', field: 'cm:created', ascending: false }]
        },
        { headers }
      )
    );
  }

  getDisciplines(): Promise<unknown> {
    return firstValueFrom(this.alfrescoService.getDisciplines());
  }

  getDocumentTypes(): Promise<unknown> {
    return firstValueFrom(this.alfrescoService.getDocumentTypeByCategoryId('ENGINEERING'));
  }

  private buildQuery(filters: DmsDashboardFilters): string {
    const status = this.escapeAfts(filters.status);
    const discipline = this.escapeAfts(filters.discipline);
    const documentType = this.escapeAfts(filters.documentType).replace(/ /g, '_');
    const search = this.escapeAfts(filters.search);
    return `(${[
      `TYPE:'dms:dmsDocument'`,
      status && `dms:document_status:'*${status}*'`,
      discipline && `dms:discipline:'${discipline}'`,
      documentType && `dms:document_type:'*${documentType}*'`,
      search && `(cm:name:'*${search}*' OR cm:title:'*${search}*')`
    ]
      .filter(Boolean)
      .join(' AND ')})`;
  }

  private escapeAfts(value?: string): string {
    const raw = (value ?? '').trim();
    return raw ? raw.replace(/\\/g, '\\\\').replace(/'/g, "\\'") : '';
  }
}
