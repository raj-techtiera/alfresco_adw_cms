/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { WidgetBaseComponent } from '../widget-base/widget-base.component';
import { WidgetFilter } from '../../../models/widget-filter.interface';
import { DataColumnComponent, DataColumnListComponent, NotificationService, ObjectDataRow } from '@alfresco/adf-core';
import { TaskFilterService, TaskListService } from '@alfresco/adf-process-services';
import { TaskQueryRepresentation } from '@alfresco/js-api';
import { InfiniteScrollDatatableComponent } from '../../infinite-scroll-datatable/infinite-scroll-datatable.component';
import { InfiniteScrollDatatableRowAction } from '../../../models/infinite-scroll-datatable-row-action.interface';
import { TaskFilter } from '../../../models/task-filter';
import { WidgetTaskListActions } from '../../../models/widget-task-list-actions';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { AddTaskCommentDialogComponent, AddTaskCommentDialogData } from '../../add-task-comment-dialog/add-task-comment-dialog.component';
import { InfiniteScrollDatatableRowEvent } from '../../../models/infinite-scroll-datatable-row-event.interface';
import { TasksDataSource } from './tasks-data-source';

@Component({
    selector: 'acs-widget-task-list',
    standalone: true,
    imports: [CommonModule, TranslatePipe, WidgetBaseComponent, DataColumnComponent, DataColumnListComponent, InfiniteScrollDatatableComponent],
    templateUrl: './widget-task-list.component.html',
    styleUrl: './widget-task-list.component.scss',
    host: {
        class: 'acs-widget-task-list'
    },
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WidgetTaskListComponent implements OnInit {
    infiniteScrollDataSource: TasksDataSource;
    currentTaskQuery: TaskQueryRepresentation;
    emptyStateMessage = 'WIDGETS.TASK_LIST.NO_OVERDUE_TASKS';
    taskActions: InfiniteScrollDatatableRowAction[] = [];
    selectedFilter: TaskFilter = TaskFilter.OVERDUE;
    widgetFilters: WidgetFilter[] = [
        { id: 'overdue', isActive: true, displayName: 'WIDGETS.TASK_LIST.OVERDUE', value: TaskFilter.OVERDUE },
        { id: 'unassigned', isActive: false, displayName: 'WIDGETS.TASK_LIST.UNASSIGNED', value: TaskFilter.UNASSIGNED },
        {
            id: 'in-progress',
            isActive: false,
            displayName: 'WIDGETS.TASK_LIST.IN_PROGRESS',
            value: TaskFilter.IN_PROGRESS
        }
    ];

    constructor(
        private taskListService: TaskListService,
        private taskFilterService: TaskFilterService,
        private router: Router,
        private notificationService: NotificationService,
        private dialog: MatDialog
    ) {}

    ngOnInit() {
        this.currentTaskQuery = new TaskQueryRepresentation({
            appDefinitionId: null,
            assignment: 'assignee',
            text: '',
            includeProcessInstance: false,
            dueBefore: new Date()
        });
        this.infiniteScrollDataSource = new TasksDataSource(this.taskListService, this.currentTaskQuery);
        this.taskActions = [
            {
                actionType: WidgetTaskListActions.VIEW,
                title: 'WIDGETS.TASK_LIST.ACTIONS.VIEW',
                icon: 'open_in_new',
                isVisible: this.checkRowActionVisibility
            },
            {
                actionType: WidgetTaskListActions.COMMENT,
                title: 'WIDGETS.TASK_LIST.ACTIONS.COMMENT',
                icon: 'comment',
                isVisible: this.checkRowActionVisibility
            },
            {
                actionType: WidgetTaskListActions.CLAIM,
                title: 'WIDGETS.TASK_LIST.ACTIONS.CLAIM',
                icon: 'task',
                isVisible: this.checkRowActionVisibility
            }
        ];
    }

    refreshWidget() {
        this.infiniteScrollDataSource.reset();
    }

    checkRowActionVisibility(row: ObjectDataRow, actionType: string): boolean {
        switch (actionType) {
            case WidgetTaskListActions.VIEW:
                return true;
            case WidgetTaskListActions.COMMENT:
                return true;
            case WidgetTaskListActions.CLAIM:
                return row.getValue('assignee') === null;
            default:
                return false;
        }
    }

    executeRowAction(event: InfiniteScrollDatatableRowEvent): void {
        switch (event.actionType) {
            case WidgetTaskListActions.VIEW:
                void this.router.navigateByUrl(`apps/0/task-details/${event.row.getValue('id')}`);
                break;
            case WidgetTaskListActions.COMMENT:
                this.dialog.open(AddTaskCommentDialogComponent, {
                    data: {
                        id: event.row.getValue('id'),
                        taskName: event.row.getValue('name')
                    } as AddTaskCommentDialogData,
                    width: '800px'
                });
                break;
            case WidgetTaskListActions.CLAIM:
                this.taskListService.claimTask(event.row.getValue('id')).subscribe({
                    next: () => {
                        this.refreshWidget();
                        this.notificationService.showInfo('WIDGETS.TASK_LIST.NOTIFICATIONS.TASK_CLAIMED');
                    },
                    error: () => this.notificationService.showError('WIDGETS.TASK_LIST.NOTIFICATIONS.CLAIMING_FAILED')
                });
                break;
        }
    }

    filterSelected(filterValue: string) {
        switch (filterValue) {
            case TaskFilter.OVERDUE:
                this.infiniteScrollDataSource.taskQuery.dueBefore = new Date();
                this.infiniteScrollDataSource.taskQuery.assignment = 'assignee';
                this.emptyStateMessage = 'WIDGETS.TASK_LIST.NO_OVERDUE_TASKS';
                break;
            case TaskFilter.UNASSIGNED:
                this.infiniteScrollDataSource.taskQuery.dueBefore = null;
                this.infiniteScrollDataSource.taskQuery.assignment = 'candidate';
                this.emptyStateMessage = 'WIDGETS.TASK_LIST.NO_UNASSIGNED_TASKS';
                break;
            case TaskFilter.IN_PROGRESS:
                this.infiniteScrollDataSource.taskQuery.dueBefore = null;
                this.infiniteScrollDataSource.taskQuery.assignment = 'assignee';
                this.emptyStateMessage = 'WIDGETS.TASK_LIST.NO_IN_PROGRESS_TASKS';
                break;
        }
        this.selectedFilter = TaskFilter[filterValue];
        this.infiniteScrollDataSource.reset();
    }

    navigateToTaskList(): void {
        this.taskFilterService.getTaskListFilters(0).subscribe((filters) => {
            let filterNameToFind = '';
            switch (this.selectedFilter) {
                case TaskFilter.OVERDUE:
                    filterNameToFind = 'Overdue Tasks';
                    break;
                case TaskFilter.UNASSIGNED:
                    filterNameToFind = 'Unassigned Tasks';
                    break;
                case TaskFilter.IN_PROGRESS:
                    filterNameToFind = 'My Tasks';
                    break;
            }
            const filter = filters.find((f) => f.name === filterNameToFind);
            if (filter?.id != null) {
                void this.router.navigateByUrl(`apps/0/tasks/${filter.id}`);
            }
        });
    }

    onNameColumnClick(row: ObjectDataRow) {
        this.executeRowAction({ row, actionType: WidgetTaskListActions.VIEW });
    }
}
