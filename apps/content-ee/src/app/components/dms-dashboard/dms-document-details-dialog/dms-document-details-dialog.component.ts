import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import {
  DmsDocumentDetailRow,
  DmsDocumentDetailsDialogData,
  DmsDocumentPropertyGroup,
  DmsPreviewMode,
  DmsPropertyGroupDef
} from '../../../interface/dms';
import { isCadFile, resolveCadFileName } from '../../../cad-viewer/is-cad-file';
import { MlightCadViewerService } from '../../../cad-viewer/mlightcad-viewer.service';

const keys = (prefix: string, names: string) => names.split(' ').map((name) => `${prefix}${name}`);

const GROUPS: DmsPropertyGroupDef[] = [
  {
    id: 'document',
    label: 'Document Details',
    icon: 'description',
    keys: keys(
      'dms:',
      'document_number document_status business_domain business_domain_code discipline discipline_code document_type document_type_code document_sheet_number revision'
    )
  },
  { id: 'review', label: 'Review Details', icon: 'rate_review', keys: keys('dms:', 'review_status reviewer_name reviewed_at review_decision review_comments') },
  { id: 'approval', label: 'Approval Details', icon: 'verified', keys: keys('dms:', 'approval_status approver_name approved_at approval_decision approval_comments') },
  {
    id: 'checkout',
    label: 'Check-in / Check-out',
    icon: 'lock',
    keys: keys('dms:', 'current_assignee previous_assignee lock_time_stamp forced_reassign forced_reassign_to forced_reassigned_by lock_status')
  },
  {
    id: 'record-archive',
    label: 'Record / Archive',
    icon: 'folder_special',
    existingOnly: true,
    keys: [
      ...keys('rma:', 'identifier dateFiled declaredAt declaredBy origionalName recordOriginatingDetails'),
      ...keys('gl:', 'archived contentState'),
      ...keys('sys:', 'archived archivedDate archivedBy')
    ],
    prefixes: ['rma:', 'record', 'gl:', 'ark:', 'archive']
  }
];

const BASIC_KEYS = [
  ...keys('cm:', 'name title description author creator created modifier modified owner'),
  ...keys('dms:', 'name title description originator')
];

@Component({
  selector: 'adw-dms-document-details-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './dms-document-details-dialog.component.html',
  styleUrl: './dms-document-details-dialog.component.scss'
})
export class DmsDocumentDetailsDialogComponent implements OnInit, OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cadViewer = inject(MlightCadViewerService);
  readonly data = inject<DmsDocumentDetailsDialogData>(MAT_DIALOG_DATA);
  private readonly nodesUrl = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';
  private readonly objectUrls: string[] = [];
  private previewPollCancelled = false;
  private destroyed = false;
  private cadActive = false;
  private cadMounting = false;
  private cadBlob: Blob | null = null;
  private cadFileName = '';

  loading = true;
  error: string | null = null;
  displayTitle = 'Document';
  groups: DmsDocumentPropertyGroup[] = [];
  selectedGroupId = 'basic';
  previewMode: DmsPreviewMode = 'idle';
  previewSrc: SafeResourceUrl | null = null;
  contentDirectUrl: string | null = null;
  previewFallbackMessage: string | null = null;
  previewLoadingMessage = 'Loading preview…';
  previewTextContent: string | null = null;
  cadReady = false;
  resolvedNodeId = '';
  previewGeneration = 0;

  @ViewChild('cadPreview')
  set cadPreviewRef(ref: ElementRef<HTMLDivElement> | undefined) {
    if (!ref || this.previewMode !== 'cad' || this.cadReady || this.cadMounting || !this.cadBlob) {
      return;
    }
    void this.mountCadPreview(ref.nativeElement);
  }

  get selectedGroup(): DmsDocumentPropertyGroup | null {
    return this.groups.find((group) => group.id === this.selectedGroupId) ?? this.groups[0] ?? null;
  }

  ngOnDestroy(): void {
    this.previewPollCancelled = true;
    this.destroyed = true;
    if (this.cadActive) {
      this.cadActive = false;
      void this.cadViewer.release('preview');
    }
    this.revokeObjectUrls();
  }

  async ngOnInit(): Promise<void> {
    this.resolvedNodeId = this.normalizeNodeId(this.data?.nodeId);
    if (!this.resolvedNodeId) {
      this.loading = false;
      this.error = 'No document id.';
      return;
    }
    try {
      const res: any = await firstValueFrom(this.http.get(this.nodePath(this.resolvedNodeId, '?include=properties,path'), this.authOptions()));
      const entry = res?.entry ?? res;
      const props = (entry?.properties ?? {}) as Record<string, unknown>;
      this.displayTitle = this.firstText(props['cm:title'], props['dms:title'], entry?.name) || 'Document';
      this.groups = this.buildGroups(entry, props);
      this.selectedGroupId = this.groups[0]?.id ?? 'basic';
      await this.initPreview(this.resolvedNodeId, entry);
    } catch {
      this.error = 'Unable to load document properties.';
    } finally {
      this.loading = false;
    }
  }

  openContentInNewTab(): void {
    this.contentDirectUrl && window.open(this.contentDirectUrl, '_blank', 'noopener,noreferrer');
  }

  private buildGroups(entry: any, props: Record<string, unknown>): DmsDocumentPropertyGroup[] {
    const assigned = new Set(BASIC_KEYS);
    return [
      { id: 'basic', label: 'Basic Details', icon: 'info', rows: this.buildBasicRows(entry, props) },
      ...GROUPS.map(({ id, label, icon, keys: groupKeys = [], existingOnly, prefixes = [] }) => ({
        id,
        label,
        icon,
        rows: [...this.rowsFromKeys(props, groupKeys, assigned, !!existingOnly), ...this.rowsFromPrefix(props, prefixes, assigned)]
      }))
    ];
  }

  private buildBasicRows(entry: any, props: Record<string, unknown>): DmsDocumentDetailRow[] {
    const user = (person: any, fallback: unknown) => person?.displayName ?? person?.id ?? fallback;
    const dash = (...values: unknown[]) => this.firstText(...values) || '—';
    return [
      ...(entry?.name ? [this.row('Name', String(entry.name))] : []),
      this.row('Title', dash(props['cm:title'], props['dms:title'])),
      this.row('Description', dash(props['cm:description'], props['dms:description'])),
      this.row('Creator', dash(user(entry?.createdByUser, props['cm:creator']))),
      this.row('Created Date', entry?.createdAt ? this.formatDate(entry.createdAt) : '—'),
      this.row('Modifier', dash(user(entry?.modifiedByUser, props['cm:modifier']))),
      this.row('Modified Date', entry?.modifiedAt ? this.formatDate(entry.modifiedAt) : '—'),
      this.row('Size', this.formatSize(entry?.content?.sizeInBytes)),
      this.row('Mime type', dash(entry?.content?.mimeType)),
      this.row('Author', dash(props['cm:author'], props['dms:originator']))
    ];
  }

  private rowsFromKeys(props: Record<string, unknown>, list: string[], assigned: Set<string>, existingOnly: boolean): DmsDocumentDetailRow[] {
    return list.flatMap((key) => {
      const raw = this.readProp(props, key);
      if (existingOnly && (raw == null || raw === '')) {
        return [];
      }
      assigned.add(key);
      return [this.toRow(this.formatLabel(key), raw)];
    });
  }

  private rowsFromPrefix(props: Record<string, unknown>, prefixes: string[], assigned: Set<string>): DmsDocumentDetailRow[] {
    return prefixes.length
      ? Object.keys(props)
          .sort((a, b) => a.localeCompare(b))
          .flatMap((key) => {
            const lower = key.toLowerCase();
            if (assigned.has(key) || !prefixes.some((prefix) => lower.startsWith(prefix) || lower.includes(prefix))) {
              return [];
            }
            assigned.add(key);
            return [this.toRow(this.formatLabel(key), props[key])];
          })
      : [];
  }

  private async initPreview(nodeId: string, entry: any): Promise<void> {
    this.previewSrc = null;
    this.contentDirectUrl = null;
    this.previewFallbackMessage = null;
    this.previewLoadingMessage = 'Loading preview…';
    this.previewTextContent = null;
    this.previewGeneration = 0;
    this.previewPollCancelled = false;
    this.previewMode = 'idle';
    this.revokeObjectUrls();

    if (entry?.isFolder === true || entry?.isFile === false || (!entry?.content?.mimeType && entry?.isFile !== true)) {
      return;
    }

    const contentPath = this.nodePath(nodeId, '/content');
    const ticket = localStorage.getItem('ticket-ECM');
    const fileName = String(entry?.name ?? '');
    const mimeType = String(entry?.content?.mimeType ?? '');
    const kind = this.classifyPreview(mimeType, fileName);

    if (!ticket && !localStorage.getItem('alf_auth')) {
      this.failPreview('unsupported', 'Sign in to preview or download document content.');
      return;
    }
    if (ticket) {
      this.contentDirectUrl = `${contentPath}?alf_ticket=${encodeURIComponent(ticket)}`;
    }
    if (isCadFile(fileName, mimeType)) {
      await this.loadCadPreview(contentPath, fileName, mimeType);
      return;
    }
    if (kind === 'pdf' || kind === 'image') {
      await this.loadBinaryPreview(contentPath, kind);
      return;
    }
    if (kind === 'text') {
      await this.loadTextPreview(contentPath, !ticket);
      return;
    }

    this.previewMode = 'loading';
    try {
      if (await this.ensurePdfPreview(nodeId)) {
        if (!ticket) {
          await this.attachDownload(contentPath);
        }
        return;
      }
      if (!ticket) {
        this.contentDirectUrl = this.createObjectUrl(await firstValueFrom(this.http.get(contentPath, this.previewReq('blob'))));
      }
      this.failPreview(
        'unsupported',
        ticket
          ? 'A full PDF preview could not be generated. Check that the Transform Service is enabled, then try again or use Open document.'
          : 'A full PDF preview could not be generated. You can still open the original file below.'
      );
    } catch {
      this.failPreview('error', 'Could not load document content for preview.');
    }
  }

  private classifyPreview(mime: string, fileName: string): 'pdf' | 'image' | 'text' | 'other' {
    const lower = fileName.toLowerCase();
    if (mime.includes('pdf') || lower.endsWith('.pdf')) {
      return 'pdf';
    }
    if (mime.startsWith('image/')) {
      return 'image';
    }
    return mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml' || /\.(txt|csv|md|log|tsv|json|xml|yaml|yml|properties)$/i.test(lower)
      ? 'text'
      : 'other';
  }

  private async loadCadPreview(contentPath: string, fileName: string, mimeType: string): Promise<void> {
    this.previewMode = 'loading';
    this.previewLoadingMessage = 'Loading drawing…';
    this.cadReady = false;
    this.cadBlob = null;
    try {
      const blob = await firstValueFrom(this.http.get(contentPath, this.previewReq('blob')));
      if (!blob?.size) {
        this.failPreview('error', 'The drawing is empty.');
        return;
      }
      this.cadFileName = resolveCadFileName(fileName, mimeType);
      this.cadBlob = blob;
      this.previewMode = 'cad';
    } catch {
      this.failPreview('error', 'Could not load this drawing.');
    }
  }

  private async mountCadPreview(host: HTMLDivElement): Promise<void> {
    const blob = this.cadBlob;
    if (!blob || this.destroyed) {
      return;
    }
    this.cadMounting = true;
    this.cadActive = true;
    try {
      if (this.destroyed) {
        return;
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      if (this.destroyed) {
        return;
      }
      await this.cadViewer.initialize(host, 'viewer', 'read', 'preview');
      if (this.destroyed) {
        await this.cadViewer.release('preview');
        this.cadActive = false;
        return;
      }
      await this.cadViewer.loadFile(blob, this.cadFileName);
      if (this.destroyed) {
        await this.cadViewer.release('preview');
        this.cadActive = false;
        return;
      }
      this.cadReady = true;
    } catch (error) {
      this.cadActive = false;
      await this.cadViewer.release('preview');
      if (!this.destroyed) {
        const message = error instanceof Error && error.message ? error.message : 'Could not open this drawing.';
        this.failPreview('error', message);
      }
    } finally {
      this.cadMounting = false;
    }
  }

  private async loadBinaryPreview(contentPath: string, kind: 'pdf' | 'image'): Promise<void> {
    this.previewMode = 'loading';
    try {
      const blob = await firstValueFrom(this.http.get(contentPath, this.previewReq('blob')));
      blob?.size ? this.setPreview(blob, kind) : this.failPreview('error', 'The file is empty.');
    } catch {
      this.failPreview('error', 'Could not load preview.');
    }
  }

  private async loadTextPreview(contentPath: string, blobUrl: boolean): Promise<void> {
    this.previewMode = 'loading';
    try {
      const text = (await firstValueFrom(this.http.get(contentPath, this.previewReq('text')))) ?? '';
      this.previewTextContent = text.length > 512 * 1024 ? `${text.slice(0, 512 * 1024)}\n\n… [preview truncated]` : text;
      this.previewMode = 'text';
      if (blobUrl) {
        this.contentDirectUrl = this.createObjectUrl(new Blob([this.previewTextContent], { type: 'text/plain;charset=utf-8' }));
      }
    } catch {
      this.failPreview('error', 'Could not load text preview.');
    }
  }

  private async ensurePdfPreview(nodeId: string): Promise<boolean> {
    this.previewLoadingMessage = 'Loading preview…';
    if (await this.tryPdfRendition(nodeId)) {
      return true;
    }
    this.previewLoadingMessage = 'Requesting full document preview…';
    const opts = this.authOptions();
    try {
      await firstValueFrom(
        this.http.post(this.nodePath(nodeId, '/renditions'), { id: 'pdf' }, {
          params: opts.params,
          headers: (opts.headers ?? new HttpHeaders()).set('Content-Type', 'application/json')
        })
      );
    } catch {
      /* already queued */
    }
    this.previewLoadingMessage = 'Generating full preview (this may take up to a minute)…';
    for (let i = 0; i < 60 && !this.previewPollCancelled; i++) {
      if (await this.tryPdfRendition(nodeId)) {
        return true;
      }
      if (i < 59) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    return false;
  }

  private async tryPdfRendition(nodeId: string): Promise<boolean> {
    const blob = await this.getBlob(this.nodePath(nodeId, '/renditions/pdf/content'));
    if (!blob || blob.size < 64) {
      return false;
    }
    this.setPreview(blob, 'pdf');
    return true;
  }

  private async attachDownload(contentPath: string): Promise<void> {
    const blob = await this.getBlob(contentPath);
    this.contentDirectUrl = blob ? this.createObjectUrl(blob) : null;
  }

  private async getBlob(path: string): Promise<Blob | null> {
    try {
      const blob = await firstValueFrom(this.http.get(path, this.previewReq('blob')));
      return blob?.size ? blob : null;
    } catch {
      return null;
    }
  }

  private failPreview(mode: 'unsupported' | 'error', message: string): void {
    this.previewMode = mode;
    this.previewFallbackMessage = message;
  }

  private setPreview(blob: Blob, mode: 'pdf' | 'image'): void {
    const url = this.createObjectUrl(blob);
    this.previewGeneration++;
    this.previewSrc = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.contentDirectUrl = url;
    this.previewMode = mode;
  }

  private createObjectUrl(blob: Blob): string {
    const url = URL.createObjectURL(blob);
    this.objectUrls.push(url);
    return url;
  }

  private revokeObjectUrls(): void {
    this.objectUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  }

  private nodePath(id: string, suffix = ''): string {
    return `${this.nodesUrl}/${encodeURIComponent(id)}${suffix}`;
  }

  private readProp(props: Record<string, unknown>, key: string): unknown {
    if (props[key] != null) {
      return props[key];
    }
    const local = key.includes(':') ? key.slice(key.indexOf(':') + 1) : key;
    return Object.entries(props).find(([k]) => k === local || k.endsWith(`:${local}`))?.[1] ?? null;
  }

  private toRow(label: string, value: unknown): DmsDocumentDetailRow {
    if (value == null || value === '') {
      return this.row(label, '—');
    }
    if (typeof value === 'object') {
      try {
        const text = JSON.stringify(value, null, 2);
        return this.row(label, text, text.length > 80 || text.includes('\n'));
      } catch {
        return this.row(label, String(value));
      }
    }
    const text = String(value);
    return /^\d{4}-\d{2}-\d{2}T/.test(text) ? this.row(label, this.formatDate(text)) : this.row(label, text, text.length > 120);
  }

  private row(label: string, value: string, multiline = false): DmsDocumentDetailRow {
    return { label, value, multiline };
  }

  private formatLabel(key: string): string {
    return key.endsWith('origionalName')
      ? 'Original Name'
      : key
          .replace(/^[^:]+:/, '')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .replace(/_/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/\b\w/g, (ch) => ch.toUpperCase());
  }

  private formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'medium' });
  }

  private formatSize(bytes: unknown): string {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size < 0) {
      return '—';
    }
    if (size < 1024) {
      return `${size} B`;
    }
    const i = Math.min(2, Math.floor(Math.log(size / 1024) / Math.log(1024)));
    const value = size / 1024 / 1024 ** i;
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${['KB', 'MB', 'GB'][i]}`;
  }

  private firstText(...values: unknown[]): string {
    return values.map((value) => (value == null ? '' : String(value).trim())).find(Boolean) ?? '';
  }

  private normalizeNodeId(raw: string | undefined): string {
    const value = (raw ?? '').trim();
    return value.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0] ?? value;
  }

  private authOptions(): { params?: HttpParams; headers?: HttpHeaders } {
    const ticket = localStorage.getItem('ticket-ECM');
    const alfAuth = localStorage.getItem('alf_auth');
    return {
      params: ticket ? new HttpParams().set('alf_ticket', ticket) : undefined,
      headers: !ticket && alfAuth ? new HttpHeaders().set('Authorization', `Basic ${alfAuth}`) : undefined
    };
  }

  private previewReq<T extends 'blob' | 'text'>(responseType: T) {
    const base = this.authOptions();
    return {
      params: (base.params ?? new HttpParams()).set('adw_pv', `${this.resolvedNodeId}-${Date.now()}`),
      headers: (base.headers ?? new HttpHeaders()).set('Cache-Control', 'no-cache, no-store, must-revalidate').set('Pragma', 'no-cache'),
      responseType
    };
  }
}
