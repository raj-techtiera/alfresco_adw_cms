import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { normalizeAlfrescoNodeId } from '../../../../../libs/content-ee/process-services-extension/src/lib/utils/normalize-alfresco-node-id';
import { CadViewerDialogComponent } from './cad-viewer-dialog.component';
import { isCadFile, resolveCadFileName } from './is-cad-file';

const NODES_API = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';

interface NodeLookup {
    entry?: {
        name?: string;
        content?: { mimeType?: string };
    };
}

@Injectable({ providedIn: 'root' })
export class CadViewerOpenService {
    constructor(
        private readonly http: HttpClient,
        private readonly dialog: MatDialog
    ) {}

    isCadEntry(entry: { name?: string; content?: { mimeType?: string } } | null | undefined): boolean {
        return isCadFile(entry?.name, entry?.content?.mimeType);
    }

    async openDocument(documentId: string | null | undefined, hints?: { name?: string; mimeType?: string | null }): Promise<void> {
        const nodeId = normalizeAlfrescoNodeId(documentId);
        if (!nodeId) {
            throw new Error('Missing document id.');
        }

        const cad = hints?.name && isCadFile(hints.name, hints.mimeType)
            ? {
                  nodeId,
                  fileName: resolveCadFileName(hints.name, hints.mimeType),
                  mimeType: hints.mimeType
              }
            : await this.resolveCadNode(nodeId);

        if (!cad) {
            throw new Error('This file is not a CAD drawing (DWG or DXF).');
        }

        this.dialog.open(CadViewerDialogComponent, {
            data: cad,
            width: '100vw',
            maxWidth: '100vw',
            height: '100vh',
            maxHeight: '100vh',
            panelClass: 'adw-cad-viewer-dialog-panel',
            autoFocus: false,
            restoreFocus: true
        });
    }

    private async resolveCadNode(
        nodeId: string
    ): Promise<{ nodeId: string; fileName: string; mimeType?: string | null } | null> {
        const response = await firstValueFrom(
            this.http.get<NodeLookup>(`${NODES_API}/${encodeURIComponent(nodeId)}`)
        );
        const name = response?.entry?.name ?? '';
        const mimeType = response?.entry?.content?.mimeType ?? '';
        if (!isCadFile(name, mimeType)) {
            return null;
        }
        return {
            nodeId,
            fileName: resolveCadFileName(name || 'drawing', mimeType),
            mimeType
        };
    }
}
