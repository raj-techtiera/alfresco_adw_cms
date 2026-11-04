import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { NotificationService, AuthenticationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';
import { ArenderRedirectService } from '../../../../../../libs/content-ee/process-services-extension/src/lib/services/arender-redirect.service';
import { environment } from '../../../environments/environment';
import { ConstructionDocumentDetailsDialogData, ConstructionDocumentDetailRow, PreviewMode } from '../../interface/compliance';

@Component({
    standalone: true,
    selector: 'adw-construction-document-details-dialog',
    imports: [
        CommonModule,
        ScrollingModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTabsModule
    ],
    templateUrl: './construction-document-details-dialog.component.html',
    styleUrl: './construction-document-details-dialog.component.scss'
})
export class ConstructionDocumentDetailsDialogComponent implements OnInit, OnDestroy {
    private readonly http = inject(HttpClient);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly arenderRedirect = inject(ArenderRedirectService);
    private readonly notification = inject(NotificationService);
    private readonly authService = inject(AuthenticationService);
    readonly data = inject<ConstructionDocumentDetailsDialogData>(MAT_DIALOG_DATA);

    private readonly nodesUrl = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';

    /** Object URLs (preview + download) — revoked on destroy. */
    private readonly objectUrls: string[] = [];

    /** Stops PDF polling if the dialog is closed. */
    private previewPollCancelled = false;

    /** Latest Alfresco node entry — used for red-line process values. */
    private nodeEntry: any = null;

    loading = true;
    error: string | null = null;
    displayTitle = 'Document';
    nodeRows: ConstructionDocumentDetailRow[] = [];
    propertyRows: ConstructionDocumentDetailRow[] = [];
    metadataTabIndex = 0;
    openingMarkup = false;
    submittingRedLineRequest = false;

    previewMode: PreviewMode = 'idle';
    previewSrc: SafeResourceUrl | null = null;
    /** Ticket URL or blob URL â€" used by "Open document" when inline preview is not available. */
    contentDirectUrl: string | null = null;
    previewFallbackMessage: string | null = null;
    /** Shown under the spinner while preview / transform runs. */
    previewLoadingMessage = 'Loading preview...';
    /** Inline text/json/xml body â€" iframe is not used (avoids browser download from Content-Disposition). */
    previewTextContent: string | null = null;

    /** Normalized UUID from `MAT_DIALOG_DATA` â€" used for API + iframe remount key. */
    resolvedNodeId = '';

    /** Bumps when a new blob URL is assigned so the iframe/img remounts per document. */
    previewGeneration = 0;

    private static readonly maxTextPreviewChars = 512 * 1024;

    private static readonly excludedPropertyKeys = new Set([
        'cm:lastThumbnailModification',
        'edm:parentFolderID',
        'edms:document_share_id',
        'edms:engDocCoverLetterShareId',
        'edms:id',
        'edms:workflow_triggered'
    ]);

    get hasPreviewPanel(): boolean {
        return ['loading', 'pdf', 'image', 'text', 'unsupported', 'error'].includes(this.previewMode);
    }

    ngOnDestroy(): void {
        this.previewPollCancelled = true;
        this.revokeAllObjectUrls();
    }

    openContentInNewTab(): void {
        const url = this.contentDirectUrl;
        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    /** Opens the current document in ARender for markup. */
    async openAddMarkup(): Promise<void> {
        const id = (this.resolvedNodeId || '').trim();
        if (!id || this.openingMarkup) {
            return;
        }
        this.openingMarkup = true;
        try {
            await this.arenderRedirect.openDocument(id);
        } catch (err: unknown) {
            const message =
                err instanceof Error && err.message.trim()
                    ? err.message.trim()
                    : 'Unable to open the document in ARender. Please sign in again and try once more.';
            this.notification.openSnackMessage(message);
        } finally {
            this.openingMarkup = false;
        }
    }

    /** Placeholder — starts Red Line Mark Up Approval process. */
    async onAddRedLineMarkupRequest(): Promise<void> {
        const documentId = (this.resolvedNodeId || '').trim();
        if (!documentId || this.submittingRedLineRequest) {
            return;
        }

        const processDefinitionKey = (environment.redLineMarkupProcessDefinitionKey || '').trim();
        const processName = (environment.redLineMarkupProcessName || '').trim();
        const businessKey = (environment.redLineMarkupBusinessKey || '').trim();
        if (!processDefinitionKey || !processName || !businessKey) {
            this.notification.openSnackMessage(
                'Red line markup process is not configured. Set the process definition, name, and business key in environment.'
            );
            return;
        }

        const props = (this.nodeEntry?.properties ?? {}) as Record<string, unknown>;
        const documentName =
            this.strProp(props, ['cm:title', 'edms:document_name', 'edms:documentName']) ||
            (this.nodeEntry?.name != null ? String(this.nodeEntry.name).trim() : '') ||
            this.displayTitle ||
            '';

        const originalDocumentId =
            this.propByLabel(props, 'Original Doc Id') ||
            this.strProp(props, [
                'edms:original_doc_id',
                'edms:originalDocId',
                'edms:original_document_id',
                'edms:originalDocumentId',
                'edms:original_docId'
            ]);

        const project =
            this.propByLabel(props, 'Project Identifier') ||
            this.strProp(props, [
                'edms:project_identifier',
                'edms:projectIdentifier',
                'edms:project_id',
                'edms:projectId',
                'edms:project_name',
                'edms:projectName',
                'edms:project_ref',
                'edms:projectRef'
            ]);

        const payload = {
            processDefinitionKey,
            name: processName,
            businessKey,
            values: {
                redlinedocumentid: documentId,
                originaldocumentid: originalDocumentId,
                facility: this.strProp(props, [
                    'edms:document_facility',
                    'edms:facility',
                    'edms:facility_name',
                    'edms:facilityName'
                ]),
                asset: this.strProp(props, [
                    'edms:asset_code',
                    'edms:assetCode',
                    'edms:asset',
                    'edms:asset_name',
                    'edms:assetName'
                ]),
                discipline: this.strProp(props, [
                    'edms:discipline',
                    'edms:document_discipline',
                    'edms:documentDiscipline'
                ]),
                project,
                documenttype: this.strProp(props, [
                    'edms:document_type',
                    'edms:documentType',
                    'edms:doc_type',
                    'edms:docType'
                ]) || (this.nodeEntry?.nodeType != null ? String(this.nodeEntry.nodeType).trim() : ''),
                documentname: documentName
            }
        };

        this.submittingRedLineRequest = true;
        try {
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
            await firstValueFrom(
                this.http.post(environment.processInstancesUrl, payload, {
                    headers,
                    withCredentials: true
                })
            );
            this.notification.openSnackMessage('Red line markup request submitted successfully.');
        } catch (err: unknown) {
            const msg =
                ConstructionDocumentDetailsDialogComponent.apiErrorMessage(err) ||
                'Failed to submit red line markup request.';
            this.notification.openSnackMessage(msg);
        } finally {
            this.submittingRedLineRequest = false;
        }
    }

    private static apiErrorMessage(err: unknown): string {
        const anyErr = err as any;
        const body = anyErr?.error;
        if (body && typeof body === 'object') {
            const apiError = body.error;
            if (typeof apiError === 'string' && apiError.trim()) {
                return apiError.trim();
            }
            if (apiError && typeof apiError === 'object') {
                const message = apiError.message ?? apiError.briefMessage ?? apiError.description;
                if (typeof message === 'string' && message.trim()) {
                    return message.trim();
                }
            }
            const message = body.message ?? body.briefMessage ?? body.description;
            if (typeof message === 'string' && message.trim()) {
                return message.trim();
            }
        }
        if (typeof anyErr?.message === 'string' && anyErr.message.trim()) {
            return anyErr.message.trim();
        }
        return '';
    }

    private strProp(properties: Record<string, unknown>, keys: string[]): string {
        for (const key of keys) {
            const v = properties[key];
            if (v != null && String(v).trim()) {
                return String(v).trim();
            }
        }
        return '';
    }

    /** Resolve a property by the same label shown in the Properties tab (e.g. "Original Doc Id"). */
    private propByLabel(properties: Record<string, unknown>, wantedLabel: string): string {
        const wanted = (wantedLabel || '').trim().toLowerCase();
        if (!wanted) {
            return '';
        }
        for (const key of Object.keys(properties)) {
            if (this.formatPropertyLabel(key).toLowerCase() !== wanted) {
                continue;
            }
            const v = properties[key];
            if (v != null && String(v).trim()) {
                return String(v).trim();
            }
        }
        return '';
    }

    async ngOnInit(): Promise<void> {
        this.resolvedNodeId = this.normalizeAlfrescoNodeId(this.data?.nodeId);
        const id = this.resolvedNodeId;
        if (!id) {
            this.loading = false;
            this.error = 'No document id.';
            return;
        }
        try {
            const url = `${this.nodesUrl}/${encodeURIComponent(id)}`;
            const res: any = await firstValueFrom(this.http.get(url, this.buildAuthOptions()));
            const entry = res?.entry ?? res;
            this.nodeEntry = entry;
            this.displayTitle =
                entry?.properties?.['cm:title'] != null && String(entry.properties['cm:title']).trim()
                    ? String(entry.properties['cm:title']).trim()
                    : entry?.name != null
                      ? String(entry.name)
                      : 'Document';
            const { nodeRows, propertyRows } = this.buildMetadata(entry);
            this.nodeRows = nodeRows;
            this.propertyRows = propertyRows;
            this.metadataTabIndex = 0;
            await this.initPreview(id, entry);
        } catch {
            this.error = 'Unable to load document properties.';
        } finally {
            this.loading = false;
        }
    }

    /**
     * Preview uses GET .../nodes/{id}/content (same host as the app; ticket or Basic auth).
     */
    private async initPreview(nodeId: string, entry: any): Promise<void> {
        this.previewMode = 'idle';
        this.previewSrc = null;
        this.contentDirectUrl = null;
        this.previewFallbackMessage = null;
        this.previewLoadingMessage = 'Loading preview...';
        this.previewPollCancelled = false;
        this.previewTextContent = null;
        this.previewGeneration = 0;
        this.revokeAllObjectUrls();

        if (entry?.isFolder === true) {
            return;
        }
        if (entry?.isFile === false) {
            return;
        }
        const mime = String(entry?.content?.mimeType ?? '');
        if (!mime && entry?.isFile !== true) {
            return;
        }

        const name = String(entry?.name ?? '');
        const contentPath = `${this.nodesUrl}/${encodeURIComponent(nodeId)}/content`;
        const ticket = localStorage.getItem('ticket-ECM');
        const alfAuth = localStorage.getItem('alf_auth');
        const directKind = this.classifyDirectPreview(mime, name);

        if (ticket) {
            const mainUrl = `${contentPath}?alf_ticket=${encodeURIComponent(ticket)}`;
            this.contentDirectUrl = mainUrl;

            if (directKind === 'pdf' || directKind === 'image') {
                await this.loadBinaryPreviewFromPath(contentPath, directKind);
                return;
            }
            if (directKind === 'text') {
                await this.loadInlineTextPreview(contentPath);
                return;
            }

            this.previewMode = 'loading';
            const ok = await this.ensureFullPdfPreview(nodeId);
            if (ok) {
                return;
            }

            this.previewMode = 'unsupported';
            this.previewFallbackMessage =
                'A full PDF preview could not be generated. Check that the Transform Service is enabled, then try again or use Open document.';
            return;
        }

        if (alfAuth) {
            this.previewMode = 'loading';
            try {
                if (directKind === 'pdf' || directKind === 'image') {
                    await this.loadBinaryPreviewFromPath(contentPath, directKind);
                    return;
                }
                if (directKind === 'text') {
                    await this.loadInlineTextPreview(contentPath);
                    if (this.previewTextContent != null) {
                        const b = new Blob([this.previewTextContent], {
                            type: 'text/plain;charset=utf-8'
                        });
                        this.contentDirectUrl = this.createObjectUrl(b);
                    }
                    return;
                }

                const ok = await this.ensureFullPdfPreview(nodeId);
                if (ok) {
                    await this.attachMainContentBlobForDownload(contentPath);
                    return;
                }

                const blob = await firstValueFrom(this.http.get(contentPath, this.buildPreviewBlobOptions()));
                this.contentDirectUrl = this.createObjectUrl(blob);
                this.previewMode = 'unsupported';
                this.previewFallbackMessage =
                    'A full PDF preview could not be generated. You can still open the original file below.';
            } catch {
                this.previewMode = 'error';
                this.previewFallbackMessage = 'Could not load document content for preview.';
            }
            return;
        }

        this.previewMode = 'unsupported';
        this.previewFallbackMessage = 'Sign in to preview or download document content.';
    }

    /** Main file MIME types that the browser can show inline (not Office packages â€" those use Alfresco renditions). */
    private classifyDirectPreview(mime: string, fileName: string): 'pdf' | 'image' | 'text' | 'other' {
        const lower = fileName.toLowerCase();
        if (mime === 'application/pdf' || mime.includes('pdf') || lower.endsWith('.pdf')) {
            return 'pdf';
        }
        if (mime.startsWith('image/')) {
            return 'image';
        }
        if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml') {
            return 'text';
        }
        /* Plain text is often mislabelled as octet-stream */
        if (/\.(txt|csv|md|log|tsv|json|xml|yaml|yml|properties|env|gitignore)$/i.test(lower)) {
            return 'text';
        }
        return 'other';
    }

    /**
     * Loads PDF/image via XHR as a blob and uses a blob: URL in the iframe/img.
     * Navigating the iframe to Alfresco `.../content?alf_ticket=...` often sends `Content-Disposition: attachment`,
     * which forces download instead of inline preview.
     */
    private async loadBinaryPreviewFromPath(contentPath: string, kind: 'pdf' | 'image'): Promise<void> {
        this.previewMode = 'loading';
        this.previewLoadingMessage = 'Loading preview...';
        try {
            const blob = await firstValueFrom(this.http.get(contentPath, this.buildPreviewBlobOptions()));
            if (!blob?.size) {
                this.previewMode = 'error';
                this.previewFallbackMessage = 'The file is empty.';
                return;
            }
            const objUrl = this.createObjectUrl(blob);
            this.previewGeneration++;
            this.previewSrc = this.sanitizer.bypassSecurityTrustResourceUrl(objUrl);
            this.contentDirectUrl = objUrl;
            this.previewMode = kind;
        } catch {
            this.previewMode = 'error';
            this.previewFallbackMessage = 'Could not load preview.';
        }
    }

    /** Fetches text via XHR so the browser does not treat the response as a download (unlike iframe src). */
    private async loadInlineTextPreview(contentPath: string): Promise<void> {
        this.previewMode = 'loading';
        this.previewLoadingMessage = 'Loading preview...';
        try {
            const text = await firstValueFrom(this.http.get(contentPath, this.buildPreviewTextOptions()));
            let body = text ?? '';
            if (body.length > ConstructionDocumentDetailsDialogComponent.maxTextPreviewChars) {
                body =
                    body.slice(0, ConstructionDocumentDetailsDialogComponent.maxTextPreviewChars) +
                    '\n\n... [preview truncated]';
            }
            this.previewTextContent = body;
            this.previewMode = 'text';
        } catch {
            this.previewMode = 'error';
            this.previewFallbackMessage = 'Could not load text preview.';
        }
    }

    /**
     * Full-document preview for Office and other non-inline types: only the **`pdf` rendition**
     * (full-page transform). Thumbnails (`doclib` / `medium`) are not used â€" they look like tiny blurred images.
     * If the PDF is missing, we POST to create the rendition and poll until it is ready.
     */
    private async ensureFullPdfPreview(nodeId: string): Promise<boolean> {
        this.previewLoadingMessage = 'Loading preview...';
        if (await this.tryLoadPdfRendition(nodeId)) {
            return true;
        }

        this.previewLoadingMessage = 'Requesting full document preview...';
        await this.requestPdfRendition(nodeId);

        this.previewLoadingMessage = 'Generating full preview (this may take up to a minute)...';
        return await this.pollPdfRendition(nodeId);
    }

    /** Loads `.../renditions/pdf/content` into an iframe (full scrollable document). */
    private async tryLoadPdfRendition(nodeId: string): Promise<boolean> {
        try {
            const blob = await firstValueFrom(
                this.http.get(
                    `${this.nodesUrl}/${encodeURIComponent(nodeId)}/renditions/pdf/content`,
                    this.buildPreviewBlobOptions()
                )
            );
            if (!blob?.size || blob.size < 64) {
                return false;
            }
            const objUrl = this.createObjectUrl(blob);
            this.previewGeneration++;
            this.previewMode = 'pdf';
            this.previewSrc = this.sanitizer.bypassSecurityTrustResourceUrl(objUrl);
            this.contentDirectUrl = objUrl;
            return true;
        } catch {
            return false;
        }
    }

    /** Queues async PDF transform (Alfresco REST: POST .../nodes/{id}/renditions). */
    private async requestPdfRendition(nodeId: string): Promise<void> {
        const opts = this.buildAuthOptions();
        let headers = opts.headers ?? new HttpHeaders();
        headers = headers.set('Content-Type', 'application/json');
        try {
            await firstValueFrom(
                this.http.post(
                    `${this.nodesUrl}/${encodeURIComponent(nodeId)}/renditions`,
                    { id: 'pdf' },
                    { params: opts.params, headers }
                )
            );
        } catch {
            /* 409 / duplicate request / already queued â€" continue polling */
        }
    }

    private async pollPdfRendition(nodeId: string): Promise<boolean> {
        const maxAttempts = 60;
        for (let i = 0; i < maxAttempts; i++) {
            if (this.previewPollCancelled) {
                return false;
            }
            if (await this.tryLoadPdfRendition(nodeId)) {
                return true;
            }
            if (i < maxAttempts - 1) {
                await this.delay(2000);
            }
        }
        return false;
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async attachMainContentBlobForDownload(contentPath: string): Promise<void> {
        try {
            const blob = await firstValueFrom(this.http.get(contentPath, this.buildPreviewBlobOptions()));
            this.contentDirectUrl = this.createObjectUrl(blob);
        } catch {
            this.contentDirectUrl = null;
        }
    }

    private createObjectUrl(blob: Blob): string {
        const u = URL.createObjectURL(blob);
        this.objectUrls.push(u);
        return u;
    }

    private revokeAllObjectUrls(): void {
        for (const u of this.objectUrls) {
            URL.revokeObjectURL(u);
        }
        this.objectUrls.length = 0;
    }

    private buildMetadata(entry: any): { nodeRows: ConstructionDocumentDetailRow[]; propertyRows: ConstructionDocumentDetailRow[] } {
        const nodeRows: ConstructionDocumentDetailRow[] = [];
        if (entry?.name != null) {
            nodeRows.push(this.makeRow('Name', String(entry.name)));
        }
        if (entry?.nodeType) {
            nodeRows.push(this.makeRow('Type', String(entry.nodeType)));
        }
        if (entry?.createdAt) {
            nodeRows.push(this.makeRow('Created at', this.formatDate(entry.createdAt)));
        }
        if (entry?.modifiedAt) {
            nodeRows.push(this.makeRow('Modified at', this.formatDate(entry.modifiedAt)));
        }
        const createdBy = entry?.createdByUser?.displayName ?? entry?.createdByUser?.id;
        if (createdBy) {
            nodeRows.push(this.makeRow('Created by', String(createdBy)));
        }
        const modifiedBy = entry?.modifiedByUser?.displayName ?? entry?.modifiedByUser?.id;
        if (modifiedBy) {
            nodeRows.push(this.makeRow('Modified by', String(modifiedBy)));
        }
        if (entry?.path) {
            nodeRows.push(this.makeRow('Path', String(entry.path), true));
        }

        const props = entry?.properties ?? {};
        const keys = Object.keys(props).sort((a, b) => a.localeCompare(b));
        const propertyRows: ConstructionDocumentDetailRow[] = [];
        for (const key of keys) {
            if (ConstructionDocumentDetailsDialogComponent.excludedPropertyKeys.has(key)) {
                continue;
            }
            const label = this.formatPropertyLabel(key);
            if (label.toLowerCase() === 'document id') {
                continue;
            }
            const raw = props[key];
            const { text, multiline } = this.stringifyPropertyValue(raw);
            propertyRows.push({
                label,
                value: text,
                multiline
            });
        }

        return { nodeRows, propertyRows };
    }

    private makeRow(label: string, value: string, multiline = false): ConstructionDocumentDetailRow {
        return {
            label: this.capitalizeLabel(label),
            value,
            multiline
        };
    }

    private capitalizeLabel(label: string): string {
        return label
            .split(' ')
            .map((word) => (word.length ? word.charAt(0).toUpperCase() + word.slice(1) : word))
            .join(' ');
    }

    private formatPropertyLabel(key: string): string {
        const strip = key.replace(/^(cm|app|sys|edms|edm|eng):/i, '');
        const spaced = strip.replace(/([a-z])([A-Z])/g, '$1 $2');
        const cleaned = spaced.replace(/_/g, ' ').replace(/\s+/g, ' ').trim() || key;
        return this.capitalizeLabel(cleaned);
    }

    private stringifyPropertyValue(v: unknown): { text: string; multiline: boolean } {
        if (v == null) {
            return { text: 'â€"', multiline: false };
        }
        if (typeof v === 'object') {
            try {
                const s = JSON.stringify(v, null, 2);
                return { text: s, multiline: s.length > 80 || s.includes('\n') };
            } catch {
                return { text: String(v), multiline: false };
            }
        }
        const s = String(v);
        return { text: s, multiline: s.length > 120 };
    }

    private formatDate(iso: string): string {
        try {
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) {
                return iso;
            }
            return d.toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'medium'
            });
        } catch {
            return String(iso);
        }
    }

    private buildAuthOptions(): { params?: HttpParams; headers?: HttpHeaders } {
        let params = new HttpParams();
        let headers = new HttpHeaders();
        const ecmTicket = localStorage.getItem('ticket-ECM');
        const alfAuth = localStorage.getItem('alf_auth');

        if (ecmTicket) {
            params = params.set('alf_ticket', ecmTicket);
        } else if (alfAuth) {
            headers = headers.set('Authorization', `Basic ${alfAuth}`);
        }

        return {
            params: params.keys().length ? params : undefined,
            headers: headers.keys().length ? headers : undefined
        };
    }

    /** Bare UUID for `/nodes/{id}` when the UI passes a full nodeRef string. */
    private normalizeAlfrescoNodeId(raw: string | undefined): string {
        const s = (raw ?? '').trim();
        if (!s) {
            return '';
        }
        const m = s.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        return m ? m[1] : s;
    }

    /** Avoids cached `/content` responses and cross-talk between documents. */
    private buildPreviewBlobOptions(): {
        params: HttpParams;
        headers: HttpHeaders;
        responseType: 'blob';
    } {
        const base = this.buildAuthOptions();
        let params = base.params ?? new HttpParams();
        params = params.set('adw_pv', `${this.resolvedNodeId}-${Date.now()}`);
        let headers = base.headers ?? new HttpHeaders();
        headers = headers
            .set('Cache-Control', 'no-cache, no-store, must-revalidate')
            .set('Pragma', 'no-cache');
        return { params, headers, responseType: 'blob' };
    }

    private buildPreviewTextOptions(): {
        params: HttpParams;
        headers: HttpHeaders;
        responseType: 'text';
    } {
        const base = this.buildAuthOptions();
        let params = base.params ?? new HttpParams();
        params = params.set('adw_pv', `${this.resolvedNodeId}-${Date.now()}`);
        let headers = base.headers ?? new HttpHeaders();
        headers = headers
            .set('Cache-Control', 'no-cache, no-store, must-revalidate')
            .set('Pragma', 'no-cache');
        return { params, headers, responseType: 'text' };
    }
}
