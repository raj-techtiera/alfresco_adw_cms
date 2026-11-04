/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CAD_PDF_RENDERER } from './cad-pdf-renderer';
import { normalizeAlfrescoNodeId } from '../utils/normalize-alfresco-node-id';

const NODE_REF_PREFIX = 'workspace://SpacesStore/';
const CREDENTIALS_STORAGE_KEY = 'ALF_LOGIN_CREDENTIALS';
const NODES_API = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';
const TICKETS_API = '/alfresco/api/-default-/public/authentication/versions/1/tickets';

interface StoredCredentials {
    userId: string;
    password: string;
}

interface NodeMeta {
    id: string;
    name: string;
    mimeType: string;
    parentId: string;
    versionLabel: string;
}

@Injectable({ providedIn: 'root' })
export class ArenderRedirectService {
    private readonly http = inject(HttpClient);
    private readonly cadPdf = inject(CAD_PDF_RENDERER, { optional: true });

    /**
     * Opens the ARender viewer for the given Alfresco node id in a new tab.
     * Opens the tab synchronously on the user click so popup blockers do not
     * suppress the window after async ticket/version lookups (e.g. from MatDialog).
     *
     * PDF/Office/image nodes keep the original ARender URL (nodeRef + ticket).
     * Native DWG/DXF cannot be annotated in ARender, so those open a PDF:
     * a sibling PDF in the same folder when one exists, otherwise a PDF
     * preview generated from the drawing.
     */
    async openDocument(
        documentId: string | null | undefined,
        options?: { fileName?: string | null; usePdfRendition?: boolean }
    ): Promise<void> {
        const nodeId = normalizeAlfrescoNodeId(documentId);
        if (!nodeId) {
            throw new Error('Missing document id.');
        }

        const popup = window.open('about:blank', '_blank');

        try {
            const user = this.resolveUserFromProfile();
            if (!user) {
                throw new Error('User profile not found. Please sign in again.');
            }

            const alfTicket = await this.createAlfTicket();
            const node = await this.fetchNodeMeta(nodeId, alfTicket);
            const fileName = String(options?.fileName ?? node.name ?? '').trim();
            const treatAsCad = options?.usePdfRendition ?? this.isCadDocument(fileName, node.mimeType);

            let url: string;
            if (treatAsCad) {
                this.writePopupStatus(popup, 'Preparing a PDF for ARender annotation…');
                url = await this.buildCadAnnotationUrl(node, {
                    user,
                    alfTicket,
                    fileName
                });
            } else {
                url = this.buildArenderUrl({
                    nodeRef: `${NODE_REF_PREFIX}${node.id}`,
                    user,
                    alfTicket,
                    versionLabel: node.versionLabel
                });
            }

            if (popup && !popup.closed) {
                popup.location.href = url;
                return;
            }

            // Popup was blocked — try one more open with the final URL.
            const fallback = window.open(url, '_blank');
            if (!fallback) {
                throw new Error('Unable to open ARender. Allow pop-ups for this site and try again.');
            }
        } catch (err) {
            if (popup && !popup.closed) {
                popup.close();
            }
            throw err;
        }
    }

    private async buildCadAnnotationUrl(
        node: NodeMeta,
        ctx: { user: string; alfTicket: string; fileName: string }
    ): Promise<string> {
        const sibling = await this.findSiblingPdf(node.parentId, ctx.fileName || node.name, ctx.alfTicket);
        if (sibling) {
            return this.buildArenderUrl({
                nodeRef: `${NODE_REF_PREFIX}${sibling.id}`,
                user: ctx.user,
                alfTicket: ctx.alfTicket,
                versionLabel: sibling.versionLabel,
                fileName: sibling.name
            });
        }

        const generated = await this.generateCadPdfSibling(node, ctx);
        if (generated) {
            return this.buildArenderUrl({
                nodeRef: `${NODE_REF_PREFIX}${generated.id}`,
                user: ctx.user,
                alfTicket: ctx.alfTicket,
                versionLabel: generated.versionLabel,
                fileName: generated.name
            });
        }

        throw new Error(
            'ARender cannot annotate native DWG/DXF. Use View (MLightCAD view), or keep a PDF copy in the same folder to annotate.'
        );
    }

    private toPdfFileName(fileName: string): string {
        const name = String(fileName ?? '').trim() || 'drawing';
        return name.replace(/\.(dwg|dxf)$/i, '') + '.pdf';
    }

    private isCadDocument(fileName?: string | null, mimeType?: string | null): boolean {
        if (/\.(dwg|dxf)$/i.test(String(fileName ?? ''))) {
            return true;
        }
        const mime = String(mimeType ?? '')
            .split(';')[0]
            .trim()
            .toLowerCase();
        return (
            mime.includes('dwg') ||
            mime.includes('dxf') ||
            mime.includes('acad') ||
            mime === 'drawing/x-dwg'
        );
    }

    private writePopupStatus(popup: Window | null, message: string): void {
        if (!popup || popup.closed) {
            return;
        }
        try {
            popup.document.open();
            popup.document.write(
                `<!doctype html><title>${message}</title><p style="font-family:sans-serif;padding:24px">${message}</p>`
            );
            popup.document.close();
        } catch {
            /* ignore */
        }
    }

    private async generateCadPdfSibling(
        node: NodeMeta,
        ctx: { user: string; alfTicket: string; fileName: string }
    ): Promise<{ id: string; name: string; versionLabel: string } | null> {
        if (!this.cadPdf || !node.parentId) {
            return null;
        }
        const pdfName = this.toPdfFileName(ctx.fileName || node.name);
        const ticketParams = new HttpParams().set('alf_ticket', ctx.alfTicket);
        const drawing = await firstValueFrom(
            this.http.get(`${NODES_API}/${encodeURIComponent(node.id)}/content`, {
                params: ticketParams,
                responseType: 'blob'
            })
        );
        if (!drawing?.size) {
            throw new Error('The CAD file could not be downloaded for ARender.');
        }

        const pdf = await this.cadPdf.renderPdf(drawing, ctx.fileName || node.name);
        if (!pdf?.size) {
            throw new Error('Could not create a PDF preview of this CAD file.');
        }

        const form = new FormData();
        form.append('filedata', new File([pdf], pdfName, { type: 'application/pdf' }), pdfName);
        form.append('name', pdfName);
        form.append('nodeType', 'cm:content');
        form.append('autoRename', 'true');
        try {
            const created = await firstValueFrom(
                this.http.post<{ entry?: { id?: string; name?: string } }>(
                    `${NODES_API}/${encodeURIComponent(node.parentId)}/children`,
                    form,
                    { params: ticketParams }
                )
            );
            const id = String(created?.entry?.id ?? '').trim();
            const name = String(created?.entry?.name ?? pdfName).trim() || pdfName;
            if (!id) {
                return null;
            }
            return {
                id,
                name,
                versionLabel: await this.fetchVersionLabel(id, ctx.alfTicket)
            };
        } catch {
            return this.findSiblingPdf(node.parentId, ctx.fileName || node.name, ctx.alfTicket);
        }
    }

    private async findSiblingPdf(
        parentId: string,
        fileName: string,
        alfTicket: string
    ): Promise<{ id: string; name: string; versionLabel: string } | null> {
        const folderId = String(parentId ?? '').trim();
        if (!folderId) {
            return null;
        }
        const stem = String(fileName ?? '')
            .replace(/\.(dwg|dxf)$/i, '')
            .trim()
            .toLowerCase();
        if (!stem) {
            return null;
        }

        try {
            const response = await firstValueFrom(
                this.http.get<{
                    list?: { entries?: Array<{ entry?: { id?: string; name?: string } }> };
                }>(`${NODES_API}/${encodeURIComponent(folderId)}/children`, {
                    params: new HttpParams()
                        .set('alf_ticket', alfTicket)
                        .set('where', '(isFile=true)')
                        .set('maxItems', '200')
                })
            );
            const pdfs = (response?.list?.entries ?? [])
                .map((item) => ({
                    id: String(item?.entry?.id ?? '').trim(),
                    name: String(item?.entry?.name ?? '').trim()
                }))
                .filter((item) => item.id && /\.pdf$/i.test(item.name));
            const exactName = `${stem}.pdf`;
            const exact = pdfs.find((item) => item.name.toLowerCase() === exactName);
            const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const versioned = new RegExp(`^${escaped}[-_ .].+\\.pdf$`, 'i');
            const prefixed = pdfs
                .filter((item) => versioned.test(item.name))
                .sort((a, b) => a.name.length - b.name.length);
            const match = exact ?? prefixed[0];
            if (!match) {
                return null;
            }
            return {
                id: match.id,
                name: match.name,
                versionLabel: await this.fetchVersionLabel(match.id, alfTicket)
            };
        } catch {
            return null;
        }
    }

    private async fetchNodeMeta(nodeId: string, alfTicket: string): Promise<NodeMeta> {
        const response = await firstValueFrom(
            this.http.get<{
                entry?: {
                    id?: string;
                    name?: string;
                    parentId?: string;
                    content?: { mimeType?: string };
                    properties?: Record<string, unknown>;
                };
            }>(`${NODES_API}/${encodeURIComponent(nodeId)}`, {
                params: new HttpParams().set('alf_ticket', alfTicket)
            })
        );
        const entry = response?.entry;
        const versionLabel = entry?.properties?.['cm:versionLabel'];
        return {
            id: String(entry?.id ?? nodeId).trim() || nodeId,
            name: String(entry?.name ?? '').trim(),
            mimeType: String(entry?.content?.mimeType ?? '').trim(),
            parentId: String(entry?.parentId ?? '').trim(),
            versionLabel:
                versionLabel != null && String(versionLabel).trim() ? String(versionLabel).trim() : '1.0'
        };
    }

    private buildArenderUrl(params: {
        user: string;
        alfTicket: string;
        nodeRef?: string;
        versionLabel?: string;
        fileName?: string;
        pdfContentUrl?: string;
    }): string {
        const search = new URLSearchParams({
            user: params.user,
            alf_ticket: params.alfTicket
        });
        if (params.nodeRef) {
            search.set('nodeRef', params.nodeRef);
        }
        if (params.versionLabel) {
            search.set('versionLabel', params.versionLabel);
        }
        if (params.fileName) {
            search.set('fileName', params.fileName);
            search.set('title', params.fileName);
        }
        if (params.pdfContentUrl) {
            search.set('url', params.pdfContentUrl);
            search.set('mimeType', 'application/pdf');
        }
        return `${window.location.origin}/arender/?${search.toString()}`;
    }

    private resolveUserFromProfile(): string {
        let raw: string | null = null;
        try {
            raw = localStorage.getItem('USER_PROFILE');
        } catch {
            raw = null;
        }

        const value = (raw ?? '').trim();
        if (value) {
            if (value.startsWith('{')) {
                try {
                    const parsed = JSON.parse(value);
                    const fromJson = parsed?.id ?? parsed?.username ?? parsed?.userName ?? parsed?.key ?? '';
                    if (fromJson != null && String(fromJson).trim()) {
                        return String(fromJson).trim();
                    }
                } catch {
                    /* fall through */
                }
            } else {
                return value;
            }
        }

        const credentials = this.getStoredCredentials();
        if (credentials?.userId) {
            return credentials.userId;
        }

        try {
            const ticketUser = localStorage.getItem('TICKET_USERNAME') ?? localStorage.getItem('username');
            if (ticketUser?.trim()) {
                return ticketUser.trim();
            }
        } catch {
            /* ignore */
        }

        return '';
    }

    private getStoredCredentials(): StoredCredentials | null {
        try {
            const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
            if (!raw) {
                return this.credentialsFromBasicAuth();
            }
            const parsed = JSON.parse(raw) as StoredCredentials;
            const userId = parsed?.userId?.trim();
            const password = parsed?.password ?? '';
            if (userId && password) {
                return { userId, password };
            }
        } catch {
            /* fall through */
        }
        return this.credentialsFromBasicAuth();
    }

    private credentialsFromBasicAuth(): StoredCredentials | null {
        try {
            const alfAuth = localStorage.getItem('alf_auth');
            if (!alfAuth) {
                return null;
            }
            const decoded = atob(alfAuth);
            const colon = decoded.indexOf(':');
            if (colon <= 0) {
                return null;
            }
            return {
                userId: decoded.slice(0, colon),
                password: decoded.slice(colon + 1)
            };
        } catch {
            return null;
        }
    }

    private async createAlfTicket(): Promise<string> {
        const existingTicket = (() => {
            try {
                return (localStorage.getItem('ticket-ECM') ?? '').trim();
            } catch {
                return '';
            }
        })();

        const credentials = this.getStoredCredentials();
        if (!credentials) {
            if (existingTicket) {
                return existingTicket;
            }
            throw new Error('Login credentials not found. Please sign in again.');
        }

        try {
            const response = await firstValueFrom(
                this.http.post<{ entry?: { id?: string } }>(TICKETS_API, {
                    userId: credentials.userId,
                    password: credentials.password
                })
            );

            const ticket = response?.entry?.id?.trim();
            if (ticket) {
                return ticket;
            }
        } catch {
            if (existingTicket) {
                return existingTicket;
            }
            throw new Error('Unable to obtain Alfresco ticket.');
        }

        if (existingTicket) {
            return existingTicket;
        }
        throw new Error('Unable to obtain Alfresco ticket.');
    }

    private async fetchVersionLabel(nodeId: string, alfTicket: string): Promise<string> {
        try {
            const response = await firstValueFrom(
                this.http.get<{ entry?: { properties?: Record<string, unknown> } }>(
                    `${NODES_API}/${encodeURIComponent(nodeId)}`,
                    {
                        params: new HttpParams().set('alf_ticket', alfTicket)
                    }
                )
            );

            const versionLabel = response?.entry?.properties?.['cm:versionLabel'];
            if (versionLabel != null && String(versionLabel).trim()) {
                return String(versionLabel).trim();
            }
        } catch {
            /* default below */
        }

        return '1.0';
    }
}
