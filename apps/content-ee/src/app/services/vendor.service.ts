import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AlfrescoApiService } from '@alfresco/adf-content-services';
import { AuthenticationService } from '@alfresco/adf-core';
import { NodesApi } from '@alfresco/js-api';
import { firstValueFrom } from 'rxjs';
import { encodeAlfrescoRelativePathParam } from '../utils/encode-alfresco-relative-path-param';
import { environment } from '../../environments/environment';

export type PoType = 'Existing Modification' | 'New PO';

const ACS_NODES_API_BASE = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';
const EXISTING_MOD_VENDOR_RELATIVE_PATH = '09.Vendor Submission';

export interface VendorEntry {
  id: string;
  name: string;
}

export type PoNumberEntry = VendorEntry;

export interface VdrLineEntry {
  id: string;
  name: string;
  title: string;
  equipmentTag: string;
  vdrNumber: string;
  vdrPoRef: string;
  vdrStatus: string;
}

@Injectable({ providedIn: 'root' })
export class VendorService {
  constructor(
    private readonly alfrescoApi: AlfrescoApiService,
    private readonly http: HttpClient,
    private readonly authService: AuthenticationService
  ) {}

  async loadVendorEntries(poType: PoType, projectId?: string): Promise<VendorEntry[]> {
    if (poType === 'Existing Modification') {
      return this.listChildrenByRelativePath(projectId, EXISTING_MOD_VENDOR_RELATIVE_PATH);
    }
    return this.loadDefaultVendorChildren();
  }

  /** Children under `09.Vendor Submission/{vendorName}/{poNumber}` — VDR lines for Existing Modification. */
  async loadVdrLineEntries(
    projectId: string | undefined,
    vendorName: string,
    poNumber: string
  ): Promise<VdrLineEntry[]> {
    const id = projectId?.trim();
    const vendor = vendorName?.trim();
    const po = poNumber?.trim();
    if (!id) {
      throw new Error('Project id is required to load VDR lines.');
    }
    if (!vendor || !po) {
      return [];
    }
    const relativePath = `${EXISTING_MOD_VENDOR_RELATIVE_PATH}/${vendor}/${po}`;
    return this.listVdrLineEntriesByRelativePath(id, relativePath);
  }

  /** Children under `09.Vendor Submission/{vendorName}` — PO numbers for Existing Modification. */
  async loadPoNumberEntries(projectId: string | undefined, vendorName: string): Promise<PoNumberEntry[]> {
    const id = projectId?.trim();
    const vendor = vendorName?.trim();
    if (!id) {
      throw new Error('Project id is required to load PO numbers.');
    }
    if (!vendor) {
      return [];
    }
    const relativePath = `${EXISTING_MOD_VENDOR_RELATIVE_PATH}/${vendor}`;
    return this.listChildrenByRelativePath(id, relativePath);
  }

  private async loadDefaultVendorChildren(): Promise<VendorEntry[]> {
    const nodesApi = new NodesApi(this.alfrescoApi.getInstance());
    const res: any = await nodesApi.listNodeChildren(environment.vendorListParentNodeId, {
      include: ['properties', 'allowableOperations'],
      skipCount: 0,
      maxItems: 200
    });
    return this.mapEntries(res);
  }

  private async listChildrenByRelativePath(projectId: string | undefined, relativePath: string): Promise<VendorEntry[]> {
    const id = projectId?.trim();
    if (!id) {
      throw new Error('Project id is required.');
    }
    const encodedPath = encodeAlfrescoRelativePathParam(relativePath);
    const url =
      `${ACS_NODES_API_BASE}/${id}/children` +
      `?relativePath=${encodedPath}&include=properties&skipCount=0&maxItems=200`;
    const headers = await firstValueFrom(this.authService.addTokenToHeader(url));
    const res = await firstValueFrom(this.http.get<any>(url, { headers }));
    return this.mapEntries(res);
  }

  private async listVdrLineEntriesByRelativePath(
    projectId: string,
    relativePath: string
  ): Promise<VdrLineEntry[]> {
    const encodedPath = encodeAlfrescoRelativePathParam(relativePath);
    const url =
      `${ACS_NODES_API_BASE}/${projectId}/children` +
      `?relativePath=${encodedPath}&include=properties&skipCount=0&maxItems=200`;
    const headers = await firstValueFrom(this.authService.addTokenToHeader(url));
    const res = await firstValueFrom(this.http.get<any>(url, { headers }));
    return this.mapVdrLineEntries(res);
  }

  private mapEntries(res: any): VendorEntry[] {
    return (res?.list?.entries || [])
      .map((e: any) => ({
        id: e.entry?.id as string,
        name: (e.entry?.name as string) || (e.entry?.id as string)
      }))
      .filter((v: VendorEntry) => !!v.id);
  }

  private mapVdrLineEntries(res: any): VdrLineEntry[] {
    return (res?.list?.entries || [])
      .map((e: any) => this.mapVdrLineEntry(e?.entry))
      .filter((v: VdrLineEntry | null): v is VdrLineEntry => !!v?.id);
  }

  private mapVdrLineEntry(entry: any): VdrLineEntry | null {
    if (!entry?.id) {
      return null;
    }
    const properties = entry.properties ?? {};
    const title = this.strProp(properties, ['edms:title']) || (entry.name as string) || '';
    const vdrNumber = this.strProp(properties, ['edms:vdr_number', 'edms:vdrNumber']);
    return {
      id: entry.id as string,
      name: (entry.name as string) || title || (entry.id as string),
      title,
      equipmentTag: this.strProp(properties, ['edms:equipment_tag', 'edms:equipmentTag']),
      vdrNumber,
      vdrPoRef: this.strProp(properties, ['edms:vdr_po_ref', 'edms:vdrPoRef']),
      vdrStatus: this.strProp(properties, ['edms:vdr_status', 'edms:vdrStatus'])
    };
  }

  private strProp(properties: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
      const value = properties[key];
      if (value != null && String(value).trim()) {
        return String(value).trim();
      }
    }
    return '';
  }

  
}
