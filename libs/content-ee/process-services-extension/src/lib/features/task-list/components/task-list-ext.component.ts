/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, HostListener, inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import {
    DataColumnComponent,
    DataColumnListComponent,
    DataSorting,
    FullNamePipe,
    ObjectDataRow,
    ObjectDataTableAdapter,
    PaginationComponent
} from '@alfresco/adf-core';
import { ActivatedRoute } from '@angular/router';
import { Pagination, TaskRepresentation, UserTaskFilterRepresentation } from '@alfresco/js-api';
import { switchMap } from 'rxjs/operators';
import { TaskListExtService } from '../services/task-list-ext.service';
import {
    ContextActionsDirective,
    PageLayoutComponent,
    PageLayoutContentComponent,
    PageLayoutHeaderComponent,
    ToolbarComponent
} from '@alfresco/aca-shared';
import { ContentActionRef } from '@alfresco/adf-extensions';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { TaskListComponent } from '@alfresco/adf-process-services';
import { TaskInfoDrawerComponent } from '../../task-info-drawer/components/task-info-drawer.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Store } from '@ngrx/store';
import { isProcessServicesInfoDrawerOpened } from '../../../process-services-ext.selector';
import { resetSelectedTask, setTaskDetails } from '../../../store/actions/task-details-ext.actions';
import { ProcessServiceExtensionState } from '../../../store/reducers/process-services.reducer';
import { resetProcessServicesInfoDrawerAction, switchProcessServicesInfoDrawerFocusedTabAction } from '../../../actions/process-services-ext.actions';
import { ProcessExtensionService } from '../../../services/process-extension.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'aps-task-list-ext',
    standalone: true,
    imports: [
        ContextActionsDirective,
        CommonModule,
        PageLayoutComponent,
        PageLayoutHeaderComponent,
        PageLayoutContentComponent,
        TranslatePipe,
        MatIconModule,
        MatProgressBarModule,
        ToolbarComponent,
        TaskInfoDrawerComponent,
        TaskListComponent,
        DataColumnListComponent,
        DataColumnComponent,
        PaginationComponent,
        FullNamePipe
    ],
    templateUrl: './task-list-ext.component.html',
    styleUrls: ['./task-list-ext.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class TaskListExtComponent implements OnInit, OnDestroy {
    @HostListener('row-dblclick', ['$event'])
    onRowDblClick(event: CustomEvent) {
        this.taskListExtService.navigateToTaskDetails(this.appId, (event as CustomEvent).detail.value.obj);
    }

    static COMPLETED_TASK_FILTER_NAME = 'Completed Tasks';
    static COMPLETED_SCHEMA = 'completed';
    static DEFAULT_SCHEMA = 'default';

    appId = null;
    filterId: number;
    currentFilter: UserTaskFilterRepresentation;
    paginationPageSize = 10;
    supportedPageSizes: any[];
    dataTasks: ObjectDataTableAdapter;
    actions: Array<ContentActionRef> = [];
    taskSchema: string = TaskListExtComponent.DEFAULT_SCHEMA;
    isLoading = true;
    infoDrawerOpened: boolean;
    lastSelectedTaskId: string;
    infoDrawerTaskDetails: TaskRepresentation;
    taskListContextMenuActions: ContentActionRef[];
    dueBefore: string;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        protected store: Store<ProcessServiceExtensionState>,
        private taskListExtService: TaskListExtService,
        private route: ActivatedRoute,
        private processExtensionService: ProcessExtensionService
    ) {}

    ngOnInit() {
        this.route.params
            .pipe(
                switchMap((params) => {
                    this.appId = +params['appId'];
                    this.filterId = +params['filterId'];
                    return this.taskListExtService.getTaskFilterById(this.filterId);
                })
            )
            .subscribe((filter) => {
                this.dueBefore = filter?.name === 'Overdue Tasks' ? new Date().toString() : null;
                this.currentFilter = filter;
                this.taskListExtService.selectFilter(filter);
                this.taskListExtService.expandProcessManagementSection();
                this.taskSchema =
                    this.currentFilter.name === TaskListExtComponent.COMPLETED_TASK_FILTER_NAME
                        ? TaskListExtComponent.COMPLETED_SCHEMA
                        : TaskListExtComponent.DEFAULT_SCHEMA;
                this.resetSelectionAndInfoDrawer();
            });

        this.fetchPaginationPreference();
        this.setSortOrder();

        this.processExtensionService
            .getAllowedToolbarActions()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((actions) => (this.actions = actions));

        this.store
            .select(isProcessServicesInfoDrawerOpened)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((isOpened) => (this.infoDrawerOpened = isOpened));

        this.taskListContextMenuActions = this.processExtensionService.getTaskListContextMenuEntries();
    }

    ngOnDestroy() {
        this.resetSelectionAndInfoDrawer();
    }

    onChangePageSize(pagination: Pagination): void {
        this.taskListExtService.setPageSize(pagination);
    }

    onRowsSelected(selectedTaskRows: ObjectDataRow[]) {
        const selectedLength = selectedTaskRows.length;
        const lastSelection = (selectedTaskRows[selectedLength - 1] as any)?.obj as TaskRepresentation;
        if (selectedLength === 0) {
            this.resetSelectionAndInfoDrawer();
            this.lastSelectedTaskId = null;
        } else if (this.lastSelectedTaskId !== lastSelection?.id) {
            this.store.dispatch(switchProcessServicesInfoDrawerFocusedTabAction({ focused: false }));
            this.isLoading = true;
            this.store.dispatch(setTaskDetails({ taskDetails: lastSelection }));
            this.lastSelectedTaskId = lastSelection?.id;
            this.processExtensionService.getTaskDetails(lastSelection?.id).subscribe((taskDetails) => {
                this.infoDrawerTaskDetails = taskDetails;
                this.isLoading = false;
            });
        }
    }

    private fetchPaginationPreference() {
        this.taskListExtService
            .fetchPaginationPreference()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((res) => {
                this.paginationPageSize = +res.pageSize;
                this.supportedPageSizes = res.supportedPageSizes;
            });
    }

    private setSortOrder(): void {
        this.dataTasks = new ObjectDataTableAdapter([], []);
        this.dataTasks.setSorting(new DataSorting('created', 'desc'));
    }

    private resetSelectionAndInfoDrawer() {
        this.store.dispatch(resetSelectedTask());
        this.store.dispatch(resetProcessServicesInfoDrawerAction());
    }
}
