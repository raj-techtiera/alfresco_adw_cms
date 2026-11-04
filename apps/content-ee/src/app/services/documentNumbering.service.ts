import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';

const DOCNUM_BASE = '/alfresco/service/pttep/docnum';

export interface CreateDocnumCategoryInput {
  categoryCode: string;
  categoryName: string;
  description: string;
  status: string;
  createdBy: string;
}

export interface CreateDocnumCountryInput {
  countryCode: string;
  countryName: string;
  numberingType: string;
  status: string;
  createdBy: string;
}

export interface CreateDocnumDisciplineInput {
  disciplineCode: string;
  disciplineName: string;
  status: string;
  createdBy: string;
}

export interface CreateDocnumDocumentTypeInput {
  documentTypeCode: string;
  documentTypeName: string;
  categoryCode: string;
  status: string;
  createdBy: string;
}

export interface DocnumCategory {
  id?: number | string;
  categoryCode: string;
  categoryName: string;
  description?: string;
  status?: string;
  createdBy?: string;
}

export interface DocnumCountry {
  id?: number | string;
  countryCode: string;
  countryName: string;
  numberingType?: string;
  status?: string;
  createdBy?: string;
}

export interface DocnumDiscipline {
  id?: number | string;
  disciplineCode: string;
  disciplineName: string;
  status?: string;
  createdBy?: string;
}

export interface DocnumDocumentType {
  id?: number | string;
  documentTypeCode: string;
  documentTypeName: string;
  categoryCode: string;
  status?: string;
  createdBy?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentNumberingService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthenticationService);

  getCategories(): Promise<DocnumCategory[]> {
    return this.getList(`${DOCNUM_BASE}/categories`).then((items) =>
      items.map((item) => this.mapCategory(item))
    );
  }

  createCategory(input: CreateDocnumCategoryInput): Promise<void> {
    return this.post(`${DOCNUM_BASE}/categories`, input);
  }

  updateCategory(id: number | string, input: CreateDocnumCategoryInput): Promise<void> {
    return this.put(`${DOCNUM_BASE}/categories/${encodeURIComponent(String(id))}`, input);
  }

  getCountries(): Promise<DocnumCountry[]> {
    return this.getList(`${DOCNUM_BASE}/countries`).then((items) =>
      items.map((item) => this.mapCountry(item))
    );
  }

  createCountry(input: CreateDocnumCountryInput): Promise<void> {
    return this.post(`${DOCNUM_BASE}/countries`, input);
  }

  updateCountry(id: number | string, input: CreateDocnumCountryInput): Promise<void> {
    return this.put(`${DOCNUM_BASE}/countries/${encodeURIComponent(String(id))}`, input);
  }

  getDisciplines(): Promise<DocnumDiscipline[]> {
    return this.getList(`${DOCNUM_BASE}/disciplines`).then((items) =>
      items.map((item) => this.mapDiscipline(item))
    );
  }

  createDiscipline(input: CreateDocnumDisciplineInput): Promise<void> {
    return this.post(`${DOCNUM_BASE}/disciplines`, input);
  }

  updateDiscipline(id: number | string, input: CreateDocnumDisciplineInput): Promise<void> {
    return this.put(`${DOCNUM_BASE}/disciplines/${encodeURIComponent(String(id))}`, input);
  }

  /**
   * GET /document-types — optional repeated `categoryCode` query params
   * (e.g. ?categoryCode=VENDOR_DATA&categoryCode=CORRESPONDENCE).
   */
  getDocumentTypes(categoryCodes?: string[]): Promise<DocnumDocumentType[]> {
    let url = `${DOCNUM_BASE}/document-types`;
    const codes = (categoryCodes ?? []).map((code) => code.trim()).filter(Boolean);
    if (codes.length) {
      const query = codes
        .map((code) => `categoryCode=${encodeURIComponent(code)}`)
        .join('&');
      url = `${url}?${query}`;
    }
    return this.getList(url).then((items) => items.map((item) => this.mapDocumentType(item)));
  }

  createDocumentType(input: CreateDocnumDocumentTypeInput): Promise<void> {
    return this.post(`${DOCNUM_BASE}/document-types`, input);
  }

  updateDocumentType(id: number | string, input: CreateDocnumDocumentTypeInput): Promise<void> {
    return this.put(`${DOCNUM_BASE}/document-types/${encodeURIComponent(String(id))}`, input);
  }

  private async getList(url: string): Promise<Record<string, unknown>[]> {
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
    return this.asList(response);
  }

  private async post(url: string, body: unknown): Promise<void> {
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

  private async put(url: string, body: unknown): Promise<void> {
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

    await firstValueFrom(this.http.put(url, body, { headers }));
  }

  private asList(response: unknown): Record<string, unknown>[] {
    if (Array.isArray(response)) {
      return response as Record<string, unknown>[];
    }

    if (response && typeof response === 'object') {
      const record = response as Record<string, unknown>;
      for (const key of ['data', 'entries', 'list', 'items', 'results']) {
        const value = record[key];
        if (Array.isArray(value)) {
          return value as Record<string, unknown>[];
        }
        if (value && typeof value === 'object') {
          const nested = value as Record<string, unknown>;
          if (Array.isArray(nested.entries)) {
            return nested.entries as Record<string, unknown>[];
          }
        }
      }
    }

    return [];
  }

  private mapCategory(item: Record<string, unknown>): DocnumCategory {
    return {
      id: (item['id'] as number | string | undefined) ?? undefined,
      categoryCode: String(item['categoryCode'] ?? item['code'] ?? ''),
      categoryName: String(item['categoryName'] ?? item['name'] ?? item['label'] ?? ''),
      description: item['description'] != null ? String(item['description']) : undefined,
      status: item['status'] != null ? String(item['status']) : undefined,
      createdBy: item['createdBy'] != null ? String(item['createdBy']) : undefined
    };
  }

  private mapCountry(item: Record<string, unknown>): DocnumCountry {
    return {
      id: (item['id'] as number | string | undefined) ?? undefined,
      countryCode: String(item['countryCode'] ?? item['code'] ?? ''),
      countryName: String(item['countryName'] ?? item['name'] ?? item['label'] ?? ''),
      numberingType: item['numberingType'] != null ? String(item['numberingType']) : undefined,
      status: item['status'] != null ? String(item['status']) : undefined,
      createdBy: item['createdBy'] != null ? String(item['createdBy']) : undefined
    };
  }

  private mapDiscipline(item: Record<string, unknown>): DocnumDiscipline {
    return {
      id: (item['id'] as number | string | undefined) ?? undefined,
      disciplineCode: String(item['disciplineCode'] ?? item['code'] ?? ''),
      disciplineName: String(item['disciplineName'] ?? item['name'] ?? item['label'] ?? ''),
      status: item['status'] != null ? String(item['status']) : undefined,
      createdBy: item['createdBy'] != null ? String(item['createdBy']) : undefined
    };
  }

  private mapDocumentType(item: Record<string, unknown>): DocnumDocumentType {
    return {
      id: (item['id'] as number | string | undefined) ?? undefined,
      documentTypeCode: String(item['documentTypeCode'] ?? item['code'] ?? ''),
      documentTypeName: String(item['documentTypeName'] ?? item['name'] ?? item['label'] ?? ''),
      categoryCode: String(item['categoryCode'] ?? ''),
      status: item['status'] != null ? String(item['status']) : undefined,
      createdBy: item['createdBy'] != null ? String(item['createdBy']) : undefined
    };
  }
}
