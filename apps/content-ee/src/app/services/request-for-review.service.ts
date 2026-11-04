import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

const ACS_NODES_BASE = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';
const ACTIVITI_PROFILE_URL = '/activiti-app/api/enterprise/profile';

export interface ReviewFileEntry {
  id: string;
  name: string;
}

export interface BulkProxyRegistrationProcessPayload {
  processDefinitionKey: string;
  name: string;
  businessKey: string;
  values: {
    bulkDocumentIds: string;
    processinstancename: string;
  };
}

interface ActivitiProfile {
  name?: string;
  firstName?: string;
  lastName?: string;
  primaryGroup?: { name?: string; externalId?: string | null } | null;
  groups?: Array<{ name?: string; externalId?: string | null }> | null;
}

@Injectable({ providedIn: 'root' })
export class RequestForReviewService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthenticationService);
  private readonly adfHttpClient = inject(AdfHttpClient);

  async listFolderFiles(folderId: string): Promise<ReviewFileEntry[]> {
    const id = folderId?.trim();
    if (!id) {
      throw new Error('Folder id is missing.');
    }

    const url = `${ACS_NODES_BASE}/${id}/children?include=properties&maxItems=200&skipCount=0`;
    const response = (await this.adfHttpClient.request(url, {
      httpMethod: 'GET',
      accepts: ['application/json'],
      contentTypes: ['application/json']
    })) as { list?: { entries?: Array<{ entry?: { id?: string; name?: string; isFile?: boolean } }> } };

    return (response?.list?.entries ?? [])
      .map((e) => e.entry)
      .filter((entry): entry is { id: string; name: string; isFile?: boolean } => !!entry?.id && entry.isFile === true)
      .map((entry) => ({
        id: RequestForReviewService.normalizeNodeId(entry.id),
        name: (entry.name ?? '').trim() || entry.id
      }));
  }

  async submitForReview(documentIds: string[]): Promise<string> {
    const response = (await this.startBulkProxyRegistrationProcess(documentIds)) as {
      variables?: Array<{ name?: string; value?: unknown }>;
    };
    const value = response?.variables?.find((item) => item?.name === 'moveErrorMessage')?.value;
    return value != null ? String(value).trim() : '';
  }

  /**
   * POST `/activiti-app/api/enterprise/process-instances`
   * (`NG_APP_BULK_PROXY_REGISTRATION_PROCESS_DEFINITION_KEY`, default DMS-Bulk-Proxy-Registration-v1).
   */
  async startBulkProxyRegistrationProcess(documentIds: string[], discipline?: string): Promise<unknown> {
    const processKey = (environment.bulkProxyRegistrationProcessDefinitionKey || '').trim();
    if (!processKey) {
      throw new Error('Bulk proxy registration process is not configured.');
    }

    const ids = documentIds.map((id) => String(id ?? '').trim()).filter(Boolean);
    if (ids.length === 0) {
      throw new Error('Select at least one file to submit.');
    }

    const resolvedDiscipline = (discipline ?? '').trim() || (await this.resolveDiscipline());
    const processName = this.buildProcessInstanceName(resolvedDiscipline, ids.length);
    const payload: BulkProxyRegistrationProcessPayload = {
      processDefinitionKey: processKey,
      name: processName,
      businessKey: processKey,
      values: {
        bulkDocumentIds: ids.join(' '),
        processinstancename: processName
      }
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

    return firstValueFrom(
      this.http.post(environment.processInstancesUrl, payload, {
        headers,
        withCredentials: true
      })
    );
  }

  async resolveDiscipline(): Promise<string> {
    try {
      const headers = await firstValueFrom(
        this.authService.addTokenToHeader(
          ACTIVITI_PROFILE_URL,
          new HttpHeaders({
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
        )
      );
      const profile = await firstValueFrom(this.http.get<ActivitiProfile>(ACTIVITI_PROFILE_URL, { headers }));
      const candidates = [
        profile?.name,
        profile?.firstName,
        [profile?.firstName, profile?.lastName].filter(Boolean).join(' '),
        profile?.primaryGroup?.name,
        profile?.primaryGroup?.externalId,
        ...(profile?.groups ?? []).flatMap((g) => [g?.name, g?.externalId])
      ];
      for (const raw of candidates) {
        const discipline = RequestForReviewService.disciplineFromLabel(raw);
        if (discipline) {
          return discipline;
        }
      }
    } catch {
      // Fall through to default.
    }
    return 'Electrical';
  }

  private buildProcessInstanceName(discipline: string, documentCount: number): string {
    const disc = (discipline || 'Electrical').trim() || 'Electrical';
    const when = RequestForReviewService.formatProcessTimestamp(new Date());
    return `${disc} | ${documentCount} Doc | ${when}`;
  }

  private static formatProcessTimestamp(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  }

  private static disciplineFromLabel(raw: unknown): string | null {
    const value = String(raw ?? '').trim();
    if (!value) {
      return null;
    }
    const engineer = value.match(/^([A-Za-z]+)Engineer/i);
    if (engineer?.[1]) {
      return RequestForReviewService.capitalize(engineer[1]);
    }
    const lead = value.match(/(?:LEAD|EPC)_([A-Z]+)(?:_ENGINEER)?/i);
    if (lead?.[1] && !['DCM', 'PROCUREMENT'].includes(lead[1].toUpperCase())) {
      return RequestForReviewService.capitalize(lead[1].toLowerCase() === 'pipe' ? 'Piping' : lead[1]);
    }
    const known = [
      'Electrical',
      'Mechanical',
      'Instrumentation',
      'Instrument',
      'Civil',
      'Process',
      'Piping',
      'Structural',
      'Pipeline'
    ];
    const upper = value.toUpperCase();
    return known.find((name) => upper.includes(name.toUpperCase())) ?? null;
  }

  private static capitalize(value: string): string {
    const s = value.trim();
    if (!s) {
      return s;
    }
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  private static normalizeNodeId(raw: string | null | undefined): string {
    const s = (raw ?? '').trim();
    if (!s) {
      return '';
    }
    const composite = s.split('__')[0]?.trim();
    if (composite) {
      const m = composite.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
      if (m) {
        return m[1];
      }
    }
    const at = s.indexOf('@');
    if (at > 0) {
      return s.slice(0, at);
    }
    return s;
  }
}
