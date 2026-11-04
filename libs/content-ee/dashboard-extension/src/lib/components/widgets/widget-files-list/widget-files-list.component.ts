/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    EventEmitter,
    HostListener,
    inject,
    OnInit,
    Output,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { WidgetBaseComponent } from '../widget-base/widget-base.component';
import { WidgetFilter } from '../../../models/widget-filter.interface';
import { CloseButtonPosition, DataColumnComponent, DataColumnListComponent, ObjectDataRow } from '@alfresco/adf-core';
import { InfiniteScrollDatatableComponent } from '../../infinite-scroll-datatable/infinite-scroll-datatable.component';
import { InfiniteScrollDatatableRowAction } from '../../../models/infinite-scroll-datatable-row-action.interface';
import { InfiniteScrollDatatableRowEvent } from '../../../models/infinite-scroll-datatable-row-event.interface';
import { FilesDataSource } from './files-data-source';
import { FilesFilter } from '../../../models/files-filter';
import { AlfrescoViewerComponent, CustomResourcesService, NodesApiService } from '@alfresco/adf-content-services';
import { WidgetFilesListActions } from '../../../models/widget-files-list-actions';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { DownloadNodesAction, ShareNodeAction } from '@alfresco/aca-shared/store';
import { ContentManagementService } from '@alfresco/aca-content';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, Observable, of, timeout } from 'rxjs';

@Component({
    selector: 'acs-widget-files-list',
    standalone: true,
    imports: [
        CommonModule,
        WidgetBaseComponent,
        DataColumnComponent,
        DataColumnListComponent,
        InfiniteScrollDatatableComponent,
        AlfrescoViewerComponent
    ],
    templateUrl: './widget-files-list.component.html',
    styleUrl: './widget-files-list.component.scss',
    host: {
        class: 'acs-widget-files-list'
    },
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WidgetFilesListComponent implements OnInit {
    @ViewChild(InfiniteScrollDatatableComponent)
    datatable: InfiniteScrollDatatableComponent;

    @Output()
    previewToggled = new EventEmitter<boolean>();

    @HostListener('keydown.escape', ['$event'])
    onEscape() {
        if (this.previewOpened) {
            this.toggleFilePreview();
        }
    }

    private readonly destroyRef = inject(DestroyRef);
    protected readonly CloseButtonPosition = CloseButtonPosition;

    /** Loading state with 15s timeout so the spinner does not show forever if the API hangs or fails. */
    loading$: Observable<boolean>;

    infiniteScrollDataSource: FilesDataSource;
    emptyStateMessage = 'WIDGETS.FILES_LIST.NO_RECENT_FILES';
    files: ObjectDataRow[] = [];
    filesActions: InfiniteScrollDatatableRowAction[] = [];
    previewOpened = false;
    previewNodeId: string = null;
    previewedNodeIndex: number = null;
    selectedFilter: FilesFilter = FilesFilter.RECENT;
    widgetFilters: WidgetFilter[] = [
        { id: 'recent', isActive: true, displayName: 'WIDGETS.FILES_LIST.RECENT', value: FilesFilter.RECENT },
        { id: 'favorites', isActive: false, displayName: 'WIDGETS.FILES_LIST.FAVORITES', value: FilesFilter.FAVORITES },
        { id: 'personal', isActive: false, displayName: 'WIDGETS.FILES_LIST.PERSONAL', value: FilesFilter.PERSONAL },
        { id: 'shared', isActive: false, displayName: 'WIDGETS.FILES_LIST.SHARED', value: FilesFilter.SHARED }
    ];

    constructor(
        private nodesApiService: NodesApiService,
        private customResourcesService: CustomResourcesService,
        private contentService: ContentManagementService,
        private router: Router,
        private store: Store,
    ) {}

    ngOnInit() {
        this.infiniteScrollDataSource = new FilesDataSource(this.nodesApiService, this.customResourcesService);
        this.loading$ = this.infiniteScrollDataSource.isLoading.pipe(
            timeout(15000),
            catchError(() => of(false))
        );
        this.infiniteScrollDataSource.filesFetched.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((fetchedFiles) => (this.files = fetchedFiles));
        this.filesActions = [
            {
                actionType: WidgetFilesListActions.VIEW,
                title: 'WIDGETS.FILES_LIST.ACTIONS.VIEW',
                icon: 'visibility',
                isVisible: this.checkRowActionVisibility
            },
            {
                actionType: WidgetFilesListActions.DOWNLOAD,
                title: 'WIDGETS.FILES_LIST.ACTIONS.DOWNLOAD',
                icon: 'get_app',
                isVisible: this.checkRowActionVisibility
            },
            {
                actionType: WidgetFilesListActions.SHARE,
                title: 'WIDGETS.FILES_LIST.ACTIONS.SHARE',
                icon: 'link',
                isVisible: this.checkRowActionVisibility
            },
            {
                actionType: WidgetFilesListActions.SHARED_LINK_SETTING,
                title: 'WIDGETS.FILES_LIST.ACTIONS.SHARED_LINK_SETTINGS',
                icon: 'link',
                isVisible: this.checkRowActionVisibility
            },
            {
                actionType: WidgetFilesListActions.FOLDER_INFORMATION,
                title: 'WIDGETS.FILES_LIST.ACTIONS.FOLDER_INFORMATION',
                icon: 'info',
                isVisible: this.checkRowActionVisibility
            }
        ];
    }

    refreshWidget() {
        this.infiniteScrollDataSource.reset();
    }

    checkRowActionVisibility = (row: ObjectDataRow, actionType: string): boolean => {
        const isNotFolder = row.getValue('isFolder') === undefined || row.getValue('isFolder') === false;
        const isShared = !!row.getValue('properties')?.['qshare:sharedId'];
        switch (actionType) {
            case WidgetFilesListActions.VIEW:
                return true;
            case WidgetFilesListActions.SHARE:
                return this.selectedFilter !== FilesFilter.SHARED && isNotFolder && !isShared;
            case WidgetFilesListActions.SHARED_LINK_SETTING:
                return this.selectedFilter === FilesFilter.SHARED || (isNotFolder && isShared);
            case WidgetFilesListActions.DOWNLOAD:
                return true;
            case WidgetFilesListActions.FOLDER_INFORMATION:
                return !isNotFolder;
            default:
                return false;
        }
    };

    executeRowAction(event: InfiniteScrollDatatableRowEvent): void {
        switch (event.actionType) {
            case WidgetFilesListActions.VIEW: {
                const nodeId = event.row.getValue('nodeId') ?? event.row.getValue('id');
                const url =
                    event.row.getValue('isFolder') === true
                        ? `personal-files/${nodeId}`
                        : `personal-files/(viewer:view/${nodeId})?location=dashboard`;
                void this.router.navigateByUrl(url);
                break;
            }
            case WidgetFilesListActions.SHARE:
            case WidgetFilesListActions.SHARED_LINK_SETTING: {
                this.store.dispatch(new ShareNodeAction({ entry: event.row.getSourceObject() }));
                break;
            }
            case WidgetFilesListActions.DOWNLOAD: {
                this.store.dispatch(new DownloadNodesAction([{ entry: event.row.getSourceObject() }]));
                break;
            }
            case WidgetFilesListActions.FOLDER_INFORMATION: {
                this.contentService.showNodeInformation({ entry: event.row.getSourceObject() });
                break;
            }
        }
    }

    filterSelected(filterValue: string) {
        switch (filterValue) {
            case FilesFilter.RECENT:
                this.infiniteScrollDataSource.filesFilter = FilesFilter.RECENT;
                this.emptyStateMessage = 'WIDGETS.FILES_LIST.NO_RECENT_FILES';
                break;
            case FilesFilter.FAVORITES:
                this.infiniteScrollDataSource.filesFilter = FilesFilter.FAVORITES;
                this.emptyStateMessage = 'WIDGETS.FILES_LIST.NO_FAVORITES_FILES';
                break;
            case FilesFilter.PERSONAL:
                this.infiniteScrollDataSource.filesFilter = FilesFilter.PERSONAL;
                this.emptyStateMessage = 'WIDGETS.FILES_LIST.NO_PERSONAL_FILES';
                break;
            case FilesFilter.SHARED:
                this.infiniteScrollDataSource.filesFilter = FilesFilter.SHARED;
                this.emptyStateMessage = 'WIDGETS.FILES_LIST.NO_SHARED_FILES';
                break;
        }
        this.selectedFilter = FilesFilter[filterValue];
        this.infiniteScrollDataSource.reset();
    }

    navigateToFilesList(): void {
        switch (this.selectedFilter) {
            case FilesFilter.RECENT:
                void this.router.navigateByUrl('recent-files');
                break;
            case FilesFilter.FAVORITES:
                void this.router.navigateByUrl('favorites');
                break;
            case FilesFilter.PERSONAL:
                void this.router.navigateByUrl('personal-files');
                break;
            case FilesFilter.SHARED:
                void this.router.navigateByUrl('shared');
                break;
        }
    }

    onNameColumnClick(row: ObjectDataRow) {
        if (row.getValue('isFolder')) {
            this.executeRowAction({ row, actionType: WidgetFilesListActions.VIEW });
        } else {
            this.previewNode(row);
        }
    }

    toggleFilePreview() {
        this.previewNodeId = null;
        this.previewedNodeIndex = null;
        this.previewOpened = !this.previewOpened;
        this.datatable.keyManager.setActiveItem(null);
        this.previewToggled.emit(this.previewOpened);
    }

    previewPrevious() {
        if (this.previewOpened && this.previewedNodeIndex > 0) {
            const prevNode = this.files[this.previewedNodeIndex - 1];
            if (prevNode.getValue('isFolder') === undefined || prevNode.getValue('isFolder') === false) {
                this.previewNode(prevNode);
            }
        }
    }

    previewNext() {
        if (this.previewOpened && this.previewedNodeIndex < this.files.length - 1) {
            const nextNode = this.files[this.previewedNodeIndex + 1];
            if (nextNode.getValue('isFolder') === undefined || nextNode.getValue('isFolder') === false) {
                this.previewNode(nextNode);
            }
        }
    }

    private previewNode(row: ObjectDataRow) {
        const currentNodeId = row.getValue('nodeId') ?? row.getValue('id');
        if (this.previewOpened && currentNodeId === this.previewNodeId) {
            this.executeRowAction({ row, actionType: WidgetFilesListActions.VIEW });
        } else {
            this.previewNodeId = currentNodeId;
            this.previewedNodeIndex = this.files.findIndex((file) => (file.getValue('nodeId') ?? file.getValue('id')) === this.previewNodeId);
            this.datatable.keyManager.setActiveItem(this.previewedNodeIndex + 1);
            this.previewOpened = true;
            this.previewToggled.emit(true);
        }
    }
}
