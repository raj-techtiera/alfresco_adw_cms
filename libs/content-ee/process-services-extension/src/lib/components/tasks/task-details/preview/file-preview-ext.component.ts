/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    ChangeDetectorRef,
    Component,
    DestroyRef,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewEncapsulation,
    inject
} from '@angular/core';
import { ContentLinkModel, DownloadService, ViewerComponent, ViewerMoreActionsComponent, ViewUtilService } from '@alfresco/adf-core';
import { CommonModule, Location } from '@angular/common';
import { ProcessServiceExtensionState } from '../../../../store/reducers/process-services.reducer';
import { Store } from '@ngrx/store';
import { getAttachedContent } from '../../../../process-services-ext.selector';
import { ProcessContentService, TaskCommentsComponent, TaskService } from '@alfresco/adf-process-services';
import { catchError, first, map, switchMap } from 'rxjs/operators';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContentApiService } from '@alfresco/aca-shared';
import { ContentMetadataCardComponent, NodeCommentsComponent } from '@alfresco/adf-content-services';
import { Node } from '@alfresco/js-api';
import { normalizeAlfrescoNodeId } from '../../../../utils/normalize-alfresco-node-id';

@Component({
    selector: 'aps-file-preview-ext',
    standalone: true,
    imports: [
        CommonModule,
        ViewerComponent,
        TranslatePipe,
        MatButtonModule,
        MatMenuModule,
        MatIconModule,
        ViewerMoreActionsComponent,
        ContentMetadataCardComponent,
        NodeCommentsComponent,
        TaskCommentsComponent
    ],
    templateUrl: './file-preview-ext.component.html',
    styleUrl: './file-preview-ext.component.scss',
    encapsulation: ViewEncapsulation.None
})
export class FilePreviewExtComponent implements OnInit, OnDestroy {
    @ViewChild(ViewerComponent) private viewer?: ViewerComponent<any>;

    /** Process task id from route `apps/:appId/task-details/:taskId/view` */
    taskId: string | null = null;

    content = new ContentLinkModel();
    showViewer = true;
    customError = '';
    metadataNode: Node | null = null;
    /** 0 Preview (full-width viewer), 1 Properties (metadata), 2 Comments (task + document) */
    selectedTab = 0;

    private readonly destroyRef = inject(DestroyRef);
    private readonly previewNotAvailableError = 'PROCESS-EXTENSION.ERROR.PREVIEW_UNSUPPORTED';

    constructor(
        private processContentService: ProcessContentService,
        private downloadService: DownloadService,
        private location: Location,
        private store: Store<ProcessServiceExtensionState>,
        private taskService: TaskService,
        private route: ActivatedRoute,
        private viewUtilService: ViewUtilService,
        private contentApi: ContentApiService,
        private cdr: ChangeDetectorRef
    ) {}

    get linkedNodeId(): string {
        return normalizeAlfrescoNodeId(this.content?.sourceId);
    }

    ngOnInit() {
        this.taskId = this.route.snapshot.paramMap.get('taskId');
        this.store
            .select(getAttachedContent)
            .pipe(first())
            .subscribe((content) => {
                const id = content?.id || parseInt(sessionStorage.getItem('file-viewer-file-id'), 10);
                const name = content?.name || sessionStorage.getItem('file-viewer-file-name');

                if (content?.contentBlob) {
                    this.content = content;
                    this.setCustomError(content);
                    this.loadRepositoryMetadata();
                    this.cdr.markForCheck();
                } else {
                    this.taskService
                        .getTask(this.route.snapshot.paramMap.get('taskId'))
                        .pipe(
                            takeUntilDestroyed(this.destroyRef),
                            switchMap((task) => {
                                const isUnknownViewerType =
                                    this.viewUtilService.getViewerTypeByMimeType(content?.mimeType) === 'unknown';

                                const blob$ =
                                    task.endDate && isUnknownViewerType
                                        ? this.processContentService
                                              .getContentRenditionTypePreview(id)
                                              .pipe(catchError(() => this.processContentService.getFileRawContent(id)))
                                        : this.processContentService.getFileRawContent(id);

                                return blob$.pipe(map((blob) => ({ blob, task })));
                            }),
                            first()
                        )
                        .subscribe(({ blob, task }) => {
                            this.content = new ContentLinkModel(content || {});
                            this.content.contentBlob = blob;
                            this.content.id = id;
                            this.content.name = name;
                            this.setCustomError(this.content, task?.endDate);
                            this.loadRepositoryMetadata();
                            this.cdr.markForCheck();
                        });
                }

                if (id && name) {
                    sessionStorage.setItem('file-viewer-file-id', String(id));
                    sessionStorage.setItem('file-viewer-file-name', name);
                }
            });
    }

    ngOnDestroy(): void {
        sessionStorage.removeItem('file-viewer-file-id');
        sessionStorage.removeItem('file-viewer-file-name');
    }

    onViewerVisibilityChanged() {
        this.location.back();
    }

    public downloadContent(): void {
        this.processContentService
            .getFileRawContent(this.content.id)
            .subscribe((blob: Blob) => this.downloadService.downloadBlob(blob, this.content.name));
    }

    goToCommentsTab(): void {
        this.selectTab(2);
    }

    selectTab(index: number): void {
        this.selectedTab = index;
        this.cdr.markForCheck();
    }

    triggerFullscreen(): void {
        this.viewer?.enterFullScreen();
    }

    /** Metadata header: jump to preview then enter browser fullscreen on the viewer */
    openPreviewFullscreen(): void {
        this.selectTab(0);
        this.cdr.detectChanges();
        queueMicrotask(() => this.viewer?.enterFullScreen());
    }

    popOutFile(): void {
        const blob = this.content?.contentBlob;
        if (!blob || !(blob instanceof Blob)) {
            return;
        }
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
    }

    private loadRepositoryMetadata(): void {
        this.metadataNode = null;
        const nodeId = this.linkedNodeId;
        if (!nodeId) {
            return;
        }
        this.contentApi.getNode(nodeId).subscribe({
            next: (ne) => {
                this.metadataNode = ne.entry;
                this.cdr.markForCheck();
            },
            error: () => {
                this.metadataNode = null;
                this.cdr.markForCheck();
            }
        });
    }

    private setCustomError(content: ContentLinkModel, endDate: Date = undefined) {
        const isOfficeFile = ['word', 'powerpoint', 'excel'].includes(content?.simpleType);
        const isNotRendition = content?.contentBlob?.type !== 'application/pdf';

        if (isOfficeFile && isNotRendition && !endDate) {
            this.customError = this.previewNotAvailableError;
        } else {
            this.customError = '';
        }
    }
}
