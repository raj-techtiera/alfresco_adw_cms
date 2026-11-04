import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { AuthenticationService } from '@alfresco/adf-core';
import { AdfHttpClient } from '@alfresco/adf-core/api';
import { firstValueFrom } from 'rxjs';
import { encodeAlfrescoRelativePathParam } from '../utils/encode-alfresco-relative-path-param';
import { environment } from '../../environments/environment';

const ACS_NODES_BASE = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';

export type WatermarkTemplateKind = 'text' | 'image';

export interface WatermarkTemplate {
  id: string;
  name: string;
  templateValue: string;
  templateDescription: string;
  mimeType: string;
  isFile: boolean;
  modifiedAt: string;
  contentUrl: string;
  properties: Record<string, unknown>;
}

export interface CreateTextWatermarkInput {
  title: string;
  description: string;
}

export interface CreateImageWatermarkInput {
  description: string;
  file: File;
}

interface AlfrescoChildEntry {
  id?: string;
  name?: string;
  isFile?: boolean;
  isFolder?: boolean;
  modifiedAt?: string;
  content?: { mimeType?: string };
  properties?: Record<string, unknown>;
}

interface AlfrescoChildrenResponse {
  list?: {
    entries?: Array<{ entry?: AlfrescoChildEntry }>;
  };
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly adfHttpClient = inject(AdfHttpClient);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthenticationService);

  async listTemplates(kind: WatermarkTemplateKind): Promise<WatermarkTemplate[]> {
    const relativePath = this.relativePathFor(kind);
    const url =
      `${ACS_NODES_BASE}/-root-/children` +
      `?relativePath=${encodeAlfrescoRelativePathParam(relativePath)}` +
      `&include=properties&skipCount=0&maxItems=200`;

    const response = (await this.adfHttpClient.request(url, {
      httpMethod: 'GET',
      accepts: ['application/json'],
      contentTypes: ['application/json']
    })) as AlfrescoChildrenResponse;

    return (response?.list?.entries ?? [])
      .map((item) => item.entry)
      .filter((entry): entry is AlfrescoChildEntry => !!entry?.id && entry.isFolder !== true)
      .map((entry) => this.mapEntry(entry));
  }

  async createTextTemplate(input: CreateTextWatermarkInput): Promise<void> {
    const templateValue = (input.title ?? '').trim();
    const description = (input.description ?? '').trim();
    if (!templateValue) {
      throw new Error('Title is required.');
    }
    if (!description) {
      throw new Error('Description is required.');
    }

    const payload = {
      name: this.toStampFileName(templateValue),
      nodeType: this.nodeType(),
      relativePath: this.relativePathFor('text'),
      properties: {
        'cm:title': templateValue,
        'edms:template_value': templateValue,
        'edms:template_type': 'TEXT',
        'edms:template_description': description
      }
    };

    await this.adfHttpClient.request(`${ACS_NODES_BASE}/-root-/children?autoRename=true`, {
      httpMethod: 'POST',
      accepts: ['application/json'],
      contentTypes: ['application/json'],
      bodyParam: payload
    });
  }

  async createImageTemplate(input: CreateImageWatermarkInput): Promise<void> {
    const description = (input.description ?? '').trim();
    const file = input.file;
    if (!file) {
      throw new Error('Image file is required.');
    }
    if (!description) {
      throw new Error('Description is required.');
    }

    const fileName = this.toImageStampFileName(file.name);
    const url = `${ACS_NODES_BASE}/-root-/children?autoRename=true`;
    const formData = new FormData();
    formData.append('filedata', file, fileName);
    formData.append('name', fileName);
    formData.append('nodeType', this.nodeType());
    formData.append('relativePath', this.relativePathFor('image'));
    formData.append('edms:template_value', 'IMAGE');
    formData.append('edms:template_description', description);

    const headers = (
      await firstValueFrom(
        this.authService.addTokenToHeader(
          url,
          new HttpHeaders({
            Accept: 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
        )
      )
    ).delete('Content-Type');
    await firstValueFrom(this.http.post(url, formData, { headers, withCredentials: true }));
  }

  contentUrl(nodeId: string): string {
    const id = (nodeId ?? '').trim();
    if (!id) {
      return '';
    }
    const base = `${ACS_NODES_BASE}/${encodeURIComponent(id)}/content`;
    const ticket = (localStorage.getItem('ticket-ECM') ?? '').trim();
    return ticket ? `${base}?alf_ticket=${encodeURIComponent(ticket)}` : base;
  }

  async getTemplateContent(nodeId: string): Promise<Blob> {
    const id = (nodeId ?? '').trim();
    if (!id) {
      throw new Error('Missing watermark id.');
    }
    const url = `${ACS_NODES_BASE}/${encodeURIComponent(id)}/content`;
    const headers = await firstValueFrom(this.authService.addTokenToHeader(url, new HttpHeaders()));
    const ticket = (localStorage.getItem('ticket-ECM') ?? '').trim();
    const params = ticket ? new HttpParams().set('alf_ticket', ticket) : new HttpParams();
    return firstValueFrom(this.http.get(url, { headers, params, responseType: 'blob' }));
  }

  relativePathFor(kind: WatermarkTemplateKind): string {
    const fromEnv =
      kind === 'text'
        ? (environment.watermarkTextRelativePath || '').trim()
        : (environment.watermarkImageRelativePath || '').trim();
    if (fromEnv) {
      return fromEnv;
    }
    const siteId = (environment.edmsCentralSiteId || 'safran-hal').trim() || 'safran-hal';
    const folder = kind === 'text' ? 'Text' : 'Images';
    return `Sites/${siteId}/documentLibrary/Watermark Templates/${folder}`;
  }

  private nodeType(): string {
    return (environment.watermarkTemplateNodeType || 'edms:watermarkTemplate').trim() || 'edms:watermarkTemplate';
  }

  toStampFileName(templateValue: string): string {
    const base = this.sanitizeFileName(templateValue)
      .replace(/\.txt$/i, '')
      .toUpperCase();
    const withStamp = /(?:^|[-_])STAMP$/i.test(base) ? base : `${base}-STAMP`;
    return `${withStamp || 'WATERMARK-STAMP'}.txt`;
  }

  toImageStampFileName(originalName: string): string {
    const sanitized = this.sanitizeFileName(originalName) || 'watermark.png';
    const dot = sanitized.lastIndexOf('.');
    const ext = (dot > 0 ? sanitized.slice(dot) : '.png').toLowerCase();
    const base = (dot > 0 ? sanitized.slice(0, dot) : sanitized).replace(/[-_]?stamp$/i, '');
    return `${(base || 'watermark').toLowerCase()}-stamp${ext}`;
  }

  private sanitizeFileName(raw: string): string {
    return (raw ?? '')
      .trim()
      .replace(/[<>:"/\\|?*]+/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private mapEntry(entry: AlfrescoChildEntry): WatermarkTemplate {
    const id = String(entry.id ?? '').trim();
    const name = (entry.name ?? '').trim() || id;
    const properties = entry.properties ?? {};
    return {
      id,
      name,
      templateValue: this.readProp(properties, 'edms:template_value'),
      templateDescription: this.readProp(properties, 'edms:template_description'),
      mimeType: String(entry.content?.mimeType ?? '').trim(),
      isFile: entry.isFile === true,
      modifiedAt: String(entry.modifiedAt ?? '').trim(),
      contentUrl: this.contentUrl(id),
      properties
    };
  }

  private readProp(properties: Record<string, unknown>, key: string): string {
    const value = properties[key];
    if (typeof value === 'string') {
      return value.trim();
    }
    if (value != null && typeof value !== 'object') {
      return String(value).trim();
    }
    return '';
  }
}
