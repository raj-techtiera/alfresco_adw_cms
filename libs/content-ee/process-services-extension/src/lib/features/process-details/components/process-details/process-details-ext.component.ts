/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, EventEmitter, HostListener, inject, Input, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import {
    UserPreferenceValues,
    UserPreferencesService,
    DataColumnComponent,
    DataColumnListComponent,
    PaginationComponent,
    FullNamePipe,
    ObjectDataRow
} from '@alfresco/adf-core';
import { Pagination, TaskRepresentation } from '@alfresco/js-api';
import { ProcessServiceExtensionState } from '../../../../store/reducers/process-services.reducer';
import { ALL_APPS } from '../../../../models/process-service.model';
import { TaskDetailsExtActions } from '../../../../store/task-details-ext-actions-types';
import { CommonModule } from '@angular/common';
import { TaskListComponent } from '@alfresco/adf-process-services';
import { TranslatePipe } from '@ngx-translate/core';
import {
    resetProcessServicesInfoDrawerAction,
    switchProcessServicesInfoDrawerFocusedTabAction
} from '../../../../actions/process-services-ext.actions';
import { ContextActionsDirective } from '@alfresco/aca-shared';
import { resetSelectedTask, setTaskDetails } from '../../../../store/actions/task-details-ext.actions';
import { ProcessExtensionService } from '../../../../services/process-extension.service';
import { ContentActionRef } from '@alfresco/adf-extensions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'aps-process-details-ext',
    standalone: true,
    imports: [
        ContextActionsDirective,
        CommonModule,
        TaskListComponent,
        DataColumnComponent,
        DataColumnListComponent,
        PaginationComponent,
        FullNamePipe,
        TranslatePipe
    ],
    templateUrl: './process-details-ext.component.html',
    styleUrls: ['./process-details-ext.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'adf-content-area'
    }
})
export class ProcessDetailsExtComponent implements OnInit, OnDestroy {
    @Input()
    processId: string;
    @Input()
    allowNavigateToTask = true;

    @Output()
    infoDrawerTaskDetails = new EventEmitter<TaskRepresentation>();
    @Output()
    isLoading = new EventEmitter<boolean>();
    @Output()
    selectedTaskId = new EventEmitter<string>();

    @HostListener('row-dblclick', ['$event'])
    onRowDblClick(event: CustomEvent) {
        if (this.allowNavigateToTask) {
            this.store.dispatch(
                TaskDetailsExtActions.navigateToTaskDetails({
                    appId: ALL_APPS,
                    selectedTask: event.detail.value.obj
                })
            );
        }
    }

    presetColumn = 'aps-process-task-list';
    paginationPageSize = 10;
    supportedPageSizes: any[];
    lastSelectedTaskId: string;
    taskListContextMenuActions: ContentActionRef[] = [];

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private userPreferenceService: UserPreferencesService,
        private store: Store<ProcessServiceExtensionState>,
        private processExtensionService: ProcessExtensionService
    ) {}

    ngOnInit(): void {
        this.fetchPaginationPreference();
        if (this.allowNavigateToTask) {
            this.taskListContextMenuActions = this.processExtensionService.getTaskListContextMenuEntries();
        }
    }

    ngOnDestroy(): void {
        this.resetSelectionAndInfoDrawer();
    }

    onChangePageSize(event: Pagination): void {
        this.userPreferenceService.paginationSize = event.maxItems;
    }

    onRowsSelected(selectedTaskRows: ObjectDataRow[]) {
        const selectedLength = selectedTaskRows.length;
        const lastSelection = (selectedTaskRows[selectedLength - 1] as any)?.obj as TaskRepresentation;
        if (selectedLength === 0) {
            this.resetSelectionAndInfoDrawer();
            this.selectedTaskId.emit(null);
        } else if (this.lastSelectedTaskId !== lastSelection?.id) {
            this.store.dispatch(switchProcessServicesInfoDrawerFocusedTabAction({ focused: false }));
            this.isLoading.emit(true);
            this.store.dispatch(setTaskDetails({ taskDetails: lastSelection }));
            this.selectedTaskId.emit(lastSelection?.id);
            this.processExtensionService
                .getTaskDetails(lastSelection?.id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((taskDetails) => {
                    this.infoDrawerTaskDetails.emit(taskDetails);
                    this.isLoading.emit(false);
                });
        }
    }

    private fetchPaginationPreference() {
        if (this.userPreferenceService.get(UserPreferenceValues.PaginationSize)) {
            this.paginationPageSize = +this.userPreferenceService.get(UserPreferenceValues.PaginationSize);
        } else {
            this.userPreferenceService.select(UserPreferenceValues.PaginationSize).subscribe((pageSize) => {
                this.paginationPageSize = pageSize;
            });
        }
        this.userPreferenceService.select(UserPreferenceValues.SupportedPageSizes).subscribe((supportedPageSizes) => {
            if (typeof supportedPageSizes === 'string') {
                supportedPageSizes = JSON.parse(supportedPageSizes);
            }
            this.supportedPageSizes = supportedPageSizes;
        });
    }

    private resetSelectionAndInfoDrawer() {
        this.store.dispatch(resetSelectedTask());
        this.store.dispatch(resetProcessServicesInfoDrawerAction());
    }
}
