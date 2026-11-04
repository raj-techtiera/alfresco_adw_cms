/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageComponent, PageLayoutComponent, ToolbarComponent } from '@alfresco/aca-shared';
import { ContentMetadataComponent, NodeCommentsComponent } from '@alfresco/adf-content-services';
import { ContentActionRef, ContentActionType } from '@alfresco/adf-extensions';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslatePipe } from '@ngx-translate/core';
import { BehaviorSubject, catchError, finalize, of } from 'rxjs';
import { NodeEntry } from '@alfresco/js-api';
import { NavigateToFolder, SetSelectedNodesAction } from '@alfresco/aca-shared/store';
import { PreviewTabComponent } from './preview-tab/preview-tab.component';
import { TaggedDocument, TagsWorkspaceService, TagSummary } from './tags-workspace.service';

@Component({
    selector: 'adw-tags-workspace',
    standalone: true,
    imports: [
        CommonModule,
        PreviewTabComponent,
        ContentMetadataComponent,
        NodeCommentsComponent,
        PageLayoutComponent,
        ToolbarComponent,
        TranslatePipe,
        MatButtonModule,
        MatCheckboxModule,
        MatIconModule,
        MatMenuModule,
        MatProgressSpinnerModule,
        MatTabsModule
    ],
    templateUrl: './tags-workspace.component.html',
    styleUrl: './tags-workspace.component.scss',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'adw-tags-workspace'
    }
})
export class TagsWorkspaceComponent extends PageComponent implements OnInit {
    readonly tags$ = new BehaviorSubject<TagSummary[]>([]);
    readonly tagsLoading$ = new BehaviorSubject(true);
    readonly documentsLoading$ = new BehaviorSubject(false);
    readonly tagsError$ = new BehaviorSubject(false);
    readonly documentsError$ = new BehaviorSubject(false);

    documents: TaggedDocument[] = [];
    documentActions: ContentActionRef[] = [];
    selectedTag: TagSummary | null = null;
    previewDocument: TaggedDocument | null = null;
    isPreviewPanelOpen = false;
    selectedDocumentId = '';
    selectedDocumentIds = new Set<string>();
    contextMenuDocument: TaggedDocument | null = null;
    contextMenuPosition = { x: '0px', y: '0px' };
    tagsEnabled = true;
    previewPanelWidth = 550;
    readonly contentActionType = ContentActionType;
    private readonly previewDrawerToolbarActionIds = new Set(['app.toolbar.info.infoDrawer', 'app.libraries.toolbar.infoDrawer']);
    private readonly moreToolbarActionId = 'app.toolbar.more';
    private previewPanelOpenTimeout: ReturnType<typeof setTimeout> | null = null;
    private previewPanelMaxWidth = 900;
    private previewResizeContainerRight = 0;
    private removePreviewPanelResizeListeners: (() => void) | null = null;
    private readonly actionDisplayOverrides: Record<string, { icon: string; label: string }> = {
        'app.context.menu.share': { icon: 'link', label: 'Share' },
        'app.context.toggleLock': { icon: 'edit', label: 'Edit Offline' },
        'app.context.menu.download': { icon: 'get_app', label: 'Download' },
        'app.context.menu.preview': { icon: 'visibility', label: 'View' },
        'app.context.menu.uploadNodeVersion': { icon: 'playlist_add', label: 'Upload New Version' },
        'app.context.menu.favorite.add': { icon: 'star_border', label: 'Favorite' },
        'app.context.menu.favorite.remove': { icon: 'star', label: 'Remove Favorite' },
        'app.context.menu.favorite': { icon: 'star_border', label: 'Favorite' },
        'app.context.menu.move': { icon: 'drive_file_move', label: 'Move' },
        'app.context.menu.copy': { icon: 'content_copy', label: 'Copy' },
        'app.context.menu.delete': { icon: 'delete', label: 'Delete' },
        'app.context.menu.info': { icon: 'info', label: 'Information' },
        'app.context.menu.node-info': { icon: 'info', label: 'Information' },
        'app.context.menu.versions': { icon: 'history', label: 'Manage Versions' },
        'app.context.menu.aspects': { icon: 'view_list', label: 'Edit Aspects' },
        'app.context.menu.permissions': { icon: 'groups', label: 'Permissions' },
        'app.context.record.menu.securityMarks': { icon: 'vpn_key', label: 'Security Marks' },
        'app.context.menu.startProcess': { icon: 'poll', label: 'Start Process' },
        'app.context.menu.editOffice': { icon: 'edit', label: 'Edit in Microsoft Office(TM)' }
    };

    constructor(
        private readonly tagsWorkspaceService: TagsWorkspaceService,
        private readonly tagsDestroyRef: DestroyRef,
        private readonly changeDetectorRef: ChangeDetectorRef
    ) {
        super();
        this.tagsDestroyRef.onDestroy(() => this.stopPreviewPanelResize());
    }

    get tagToolbarActionsBeforePreview(): ContentActionRef[] {
        return this.actions.filter((action) => !this.isPreviewDrawerToolbarAction(action) && action.id !== this.moreToolbarActionId);
    }

    get tagToolbarActionsAfterPreview(): ContentActionRef[] {
        return this.actions.filter((action) => !this.isPreviewDrawerToolbarAction(action) && action.id === this.moreToolbarActionId);
    }

    get previewGridTemplateColumns(): string {
        if (!this.isPreviewPanelOpen || !this.previewDocument) {
            return 'minmax(0, 1fr)';
        }

        return `minmax(0, 1fr) 8px minmax(360px, ${this.previewPanelWidth}px)`;
    }

    ngOnInit(): void {
        super.ngOnInit();
        this.tagsEnabled = this.tagsWorkspaceService.areTagsEnabled();
        this.extensions.getAllowedContextMenuActions()
            .pipe(takeUntilDestroyed(this.tagsDestroyRef))
            .subscribe((actions) => {
                this.documentActions = actions;
                this.changeDetectorRef.markForCheck();
            });
        this.loadTags();
    }

    loadTags(): void {
        this.tagsLoading$.next(true);
        this.tagsError$.next(false);

        this.tagsWorkspaceService.getTags().pipe(
            catchError(() => {
                this.tagsError$.next(true);
                return of([]);
            }),
            finalize(() => this.tagsLoading$.next(false)),
            takeUntilDestroyed(this.tagsDestroyRef)
        ).subscribe((tags) => this.tags$.next(tags));
    }

    selectTag(tag: TagSummary): void {
        this.selectedTag = tag;
        this.clearSelection();
        this.documents = [];
        this.documentsLoading$.next(true);
        this.documentsError$.next(false);

        this.tagsWorkspaceService.getDocumentsByTag(tag.name).pipe(
            catchError(() => {
                this.documentsError$.next(true);
                return of([]);
            }),
            finalize(() => this.documentsLoading$.next(false)),
            takeUntilDestroyed(this.tagsDestroyRef)
        ).subscribe((documents) => (this.documents = documents));
    }

    clearSelectedTag(): void {
        this.selectedTag = null;
        this.clearSelection();
        this.closePreviewPanel();
        this.documents = [];
        this.documentsError$.next(false);
    }

    getSelectedCountLabel(): string {
        const count = this.selectedDocumentIds.size || (this.selectedDocumentId ? 1 : 0);
        return count > 0 ? `(${count})` : '';
    }

    getDocumentCountLabel(tag: TagSummary): string {
        return tag.count > 0 ? String(tag.count) : '-';
    }

    getTotalResults(): number {
        return this.documents.length;
    }

    openDocument(document: TaggedDocument): void {
        this.selectDocument(document);
        this.showPreview(document.node, { location: this.router.url });
    }

    togglePreviewPanel(): void {
        if (this.isPreviewPanelOpen) {
            this.closePreviewPanel();
            return;
        }

        const selectedDocument = this.getPrimarySelectedDocument();

        if (selectedDocument) {
            this.openPreviewPanel(selectedDocument);
        }
    }

    onNodeDoubleClick(node: NodeEntry): void {
        if (node?.entry) {
            if (node.entry.isFolder) {
                this.store.dispatch(new NavigateToFolder(node));
                return;
            }

            this.showPreview(node, { location: this.router.url });
        }
    }

    selectDocument(document: TaggedDocument): void {
        this.selectedDocumentId = document.id;
        this.store.dispatch(new SetSelectedNodesAction([document.node]));

        if (this.isPreviewPanelOpen) {
            this.previewDocument = document;
        }
    }

    openDocumentContextMenu(event: MouseEvent, document: TaggedDocument): void {
        event.preventDefault();
        this.selectDocument(document);
        this.contextMenuDocument = document;
        this.contextMenuPosition = {
            x: `${event.clientX}px`,
            y: `${event.clientY}px`
        };
    }

    closeDocumentContextMenu(): void {
        this.contextMenuDocument = null;
    }

    toggleDocumentSelection(document: TaggedDocument, checked: boolean): void {
        this.selectDocument(document);

        if (checked) {
            this.selectedDocumentIds.add(document.id);
        } else {
            this.selectedDocumentIds.delete(document.id);
        }

        this.updateStoreSelection();
    }

    toggleAllDocuments(documents: TaggedDocument[], checked: boolean): void {
        this.selectedDocumentIds.clear();

        if (checked) {
            documents.forEach((document) => this.selectedDocumentIds.add(document.id));
            this.selectedDocumentId = documents[0]?.id || '';
            this.previewDocument = documents[0] || null;
        }

        this.updateStoreSelection();
    }

    openPreviewPanel(document: TaggedDocument): void {
        this.selectDocument(document);
        this.previewDocument = document;

        if (this.isPreviewPanelOpen) {
            this.changeDetectorRef.markForCheck();
            return;
        }

        this.previewPanelOpenTimeout = setTimeout(() => {
            if (this.previewDocument?.id === document.id) {
                this.isPreviewPanelOpen = true;
                this.changeDetectorRef.markForCheck();
            }
        });
    }

    closePreviewPanel(): void {
        if (this.previewPanelOpenTimeout) {
            clearTimeout(this.previewPanelOpenTimeout);
            this.previewPanelOpenTimeout = null;
        }

        this.isPreviewPanelOpen = false;
        this.previewDocument = null;
    }

    canOpenPreviewPanel(): boolean {
        return this.documents.length > 0;
    }

    startPreviewPanelResize(event: PointerEvent): void {
        event.preventDefault();
        event.stopPropagation();

        const target = event.currentTarget as HTMLElement;
        const resultsBody = target.closest('.adw-tags-results-body');
        const resultsBodyRect = resultsBody?.getBoundingClientRect();

        this.previewResizeContainerRight = resultsBodyRect?.right ?? window.innerWidth;
        this.previewPanelMaxWidth = Math.max(360, Math.min(900, (resultsBodyRect?.width ?? window.innerWidth) - 368));

        const onPointerMove = (moveEvent: PointerEvent) => {
            moveEvent.preventDefault();
            this.resizePreviewPanel(moveEvent.clientX);
        };
        const onPointerEnd = () => this.stopPreviewPanelResize();

        this.stopPreviewPanelResize();
        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerEnd);
        window.addEventListener('pointercancel', onPointerEnd);
        document.body.classList.add('adw-tags-preview-resizing');

        this.removePreviewPanelResizeListeners = () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerEnd);
            window.removeEventListener('pointercancel', onPointerEnd);
            document.body.classList.remove('adw-tags-preview-resizing');
        };
    }

    areAllDocumentsSelected(documents: TaggedDocument[]): boolean {
        return documents.length > 0 && documents.every((document) => this.selectedDocumentIds.has(document.id));
    }

    areSomeDocumentsSelected(documents: TaggedDocument[]): boolean {
        return this.selectedDocumentIds.size > 0 && !this.areAllDocumentsSelected(documents);
    }

    executeDocumentAction(action: ContentActionRef, document: TaggedDocument): void {
        if (action.type === ContentActionType.separator) {
            return;
        }

        this.selectDocument(document);
        this.closeDocumentContextMenu();

        if (action.actions?.click) {
            this.extensions.runActionById(action.actions.click);
            return;
        }

        this.extensions.runActionById(action.id);
    }

    getDocumentIcon(document: TaggedDocument): string {
        const extension = document.name.split('.').pop()?.toLowerCase();

        if (extension === 'pdf') {
            return 'picture_as_pdf';
        }

        if (['doc', 'docx', 'odt'].includes(extension || '')) {
            return 'description';
        }

        if (['ppt', 'pptx'].includes(extension || '')) {
            return 'slideshow';
        }

        if (['xls', 'xlsx', 'csv'].includes(extension || '')) {
            return 'table_chart';
        }

        return document.isFile ? 'description' : 'folder';
    }

    getDocumentIconClass(document: TaggedDocument): string {
        const extension = document.name.split('.').pop()?.toLowerCase();

        if (extension === 'pdf') {
            return 'adw-tags-file-icon-pdf';
        }

        if (['doc', 'docx', 'odt'].includes(extension || '')) {
            return 'adw-tags-file-icon-word';
        }

        if (['ppt', 'pptx'].includes(extension || '')) {
            return 'adw-tags-file-icon-powerpoint';
        }

        if (['xls', 'xlsx', 'csv'].includes(extension || '')) {
            return 'adw-tags-file-icon-excel';
        }

        return 'adw-tags-file-icon-default';
    }

    formatFileSize(size: number | null): string {
        if (size === null) {
            return '-';
        }

        if (size < 1024) {
            return `${size} B`;
        }

        const units = ['KB', 'MB', 'GB'];
        let value = size / 1024;
        let unitIndex = 0;

        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }

        return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
    }

    getActionIcon(action: ContentActionRef): string {
        return this.actionDisplayOverrides[action.id]?.icon || action.icon || this.getCustomActionIcon(action);
    }

    getActionLabel(action: ContentActionRef): string {
        return this.actionDisplayOverrides[action.id]?.label || action.data?.title || action.title || action.tooltip || action.id;
    }

    trackByTag(_: number, tag: TagSummary): string {
        return tag.id || tag.name;
    }

    trackByDocument(_: number, document: TaggedDocument): string {
        return document.id;
    }

    trackByAction(_: number, action: ContentActionRef): string {
        return action.id;
    }

    private clearSelection(): void {
        this.selectedDocumentId = '';
        this.selectedDocumentIds.clear();
        this.closePreviewPanel();
        this.store.dispatch(new SetSelectedNodesAction([]));
    }

    private updateStoreSelection(): void {
        const selectedNodes = this.documents
            .filter((document) => this.selectedDocumentIds.has(document.id))
            .map((document) => document.node);

        this.store.dispatch(new SetSelectedNodesAction(selectedNodes));
    }

    private getPrimarySelectedDocument(): TaggedDocument | null {
        if (this.selectedDocumentId) {
            return this.documents.find((document) => document.id === this.selectedDocumentId) || null;
        }

        const firstSelectedDocumentId = this.selectedDocumentIds.values().next().value;
        if (firstSelectedDocumentId) {
            return this.documents.find((document) => document.id === firstSelectedDocumentId) || null;
        }

        return this.previewDocument || this.documents[0] || null;
    }

    private getCustomActionIcon(action: ContentActionRef): string {
        if (action.component?.includes('toggleSharedLink')) {
            return 'link';
        }

        if (action.component?.includes('toggleEditOffline')) {
            return 'edit';
        }

        if (action.component?.includes('viewNode')) {
            return 'visibility';
        }

        if (action.component?.includes('toggleFavorite')) {
            return 'star_border';
        }

        return 'extension';
    }

    private isPreviewDrawerToolbarAction(action: ContentActionRef): boolean {
        return this.previewDrawerToolbarActionIds.has(action.id) || action.component === 'app.toolbar.toggleInfoDrawer';
    }

    private resizePreviewPanel(clientX: number): void {
        const minWidth = 360;
        this.previewPanelWidth = Math.min(this.previewPanelMaxWidth, Math.max(minWidth, this.previewResizeContainerRight - clientX));
        this.changeDetectorRef.markForCheck();
    }

    private stopPreviewPanelResize(): void {
        this.removePreviewPanelResizeListeners?.();
        this.removePreviewPanelResizeListeners = null;
    }
}
