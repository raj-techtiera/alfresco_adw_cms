import { Injectable } from '@angular/core';
import { AlfrescoApiService } from '@alfresco/adf-content-services';
import { ClassesApi, Node } from '@alfresco/js-api';
import { Subject, firstValueFrom } from 'rxjs';
import { AlfrescoService } from '../alfresco.service';
import { MlightCadViewerService } from './mlightcad-viewer.service';

export const CAD_COMMENTS_PROPERTY = 'dms:cad_comments';

@Injectable({ providedIn: 'root' })
export class CadCommentsMetadataService {
    private activeNode: Node | null = null;
    private readonly classHasCadComments = new Map<string, boolean>();
    private readonly appliedSubject = new Subject<Node>();
    /** Emits when an open metadata panel should reload with the stored comments. */
    readonly applied$ = this.appliedSubject.asObservable();

    constructor(
        private readonly cadViewer: MlightCadViewerService,
        private readonly alfresco: AlfrescoService,
        private readonly alfrescoApi: AlfrescoApiService
    ) {}

    /** Remember the node whose metadata panel is open and fill CAD Comments. */
    watch(node: Node | null): void {
        this.activeNode = node;
        if (!node) {
            return;
        }
        const nodeId = node.id;
        if (!nodeId) {
            return;
        }
        const text = this.cadViewer.storedCadCommentsText(nodeId);
        if (!text) {
            return;
        }
        this.writeComments(node, text);
        void this.persistWhenClassDefinesComments(node, text);
    }

    /**
     * Load comments already stored on this node so a new MTEXT appends to this
     * drawing only. Another file's comments stay on their own node.
     */
    async loadExistingIntoStorage(nodeId: string): Promise<void> {
        const id = nodeId.trim();
        if (!id) {
            return;
        }
        this.cadViewer.beginDocument(id);
        try {
            const properties = await firstValueFrom(this.alfresco.getNodeMetadata(id));
            const raw = properties?.[CAD_COMMENTS_PROPERTY];
            if (typeof raw === 'string' && raw.trim()) {
                this.cadViewer.replaceStoredComments(id, raw);
            }
        } catch {
            /* keep comments already stored for this drawing */
        }
    }

    /**
     * After the CAD viewer saves, write the stored comments onto that node
     * and refresh the metadata panel when it is the open document.
     */
    saveAndRefresh(nodeId: string): void {
        const text = this.cadViewer.storedCadCommentsText(nodeId);
        if (!nodeId || !text) {
            return;
        }
        const node = this.activeNode;
        if (node?.id === nodeId) {
            const changed = this.writeComments(node, text);
            if (changed) {
                this.appliedSubject.next(node);
            }
        }
        void this.persist(nodeId, text);
    }

    private writeComments(node: Node, text: string): boolean {
        if (!node.properties) {
            node.properties = {};
        }
        if (node.properties[CAD_COMMENTS_PROPERTY] === text) {
            return false;
        }
        node.properties[CAD_COMMENTS_PROPERTY] = text;
        return true;
    }

    private async persistWhenClassDefinesComments(node: Node, text: string): Promise<void> {
        const nodeType = node.nodeType?.trim();
        if (!nodeType || !node.id) {
            return;
        }
        const defines = await this.classDefinesCadComments(nodeType);
        if (!defines || this.activeNode?.id !== node.id) {
            return;
        }
        await this.persist(node.id, text);
    }

    private async classDefinesCadComments(nodeType: string): Promise<boolean> {
        const cached = this.classHasCadComments.get(nodeType);
        if (cached != null) {
            return cached;
        }
        try {
            const classesApi = new ClassesApi(this.alfrescoApi.getInstance());
            const definition = await classesApi.getClass(nodeType.replace(/:/g, '_'));
            const defines = !!definition?.properties && CAD_COMMENTS_PROPERTY in definition.properties;
            this.classHasCadComments.set(nodeType, defines);
            return defines;
        } catch {
            return nodeType === 'dms:dmsDocument';
        }
    }

    private async persist(nodeId: string, text: string): Promise<void> {
        try {
            await firstValueFrom(this.alfresco.updateNodeMetadata(nodeId, { [CAD_COMMENTS_PROPERTY]: text }));
        } catch {
            /* the metadata panel still shows the stored comments */
        }
    }
}
