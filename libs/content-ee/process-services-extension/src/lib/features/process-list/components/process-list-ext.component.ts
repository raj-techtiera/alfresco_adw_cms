/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, HostListener, inject, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import {
    DataColumnComponent,
    DataColumnListComponent,
    DataSorting,
    FullNamePipe,
    ObjectDataRow,
    ObjectDataTableAdapter,
    PaginationComponent
} from '@alfresco/adf-core';
import { Pagination, ProcessInstanceRepresentation, UserProcessInstanceFilterRepresentation } from '@alfresco/js-api';
import { ActivatedRoute } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { ProcessListExtService } from '../services/process-list-ext.service';
import {
    ContextActionsDirective,
    PageLayoutComponent,
    PageLayoutContentComponent,
    PageLayoutHeaderComponent,
    ToolbarComponent
} from '@alfresco/aca-shared';
import { ContentActionRef } from '@alfresco/adf-extensions';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ProcessInstanceListComponent } from '@alfresco/adf-process-services';
import { Store } from '@ngrx/store';
import { ProcessServiceExtensionState } from '../../../store/reducers/process-services.reducer';
import { ProcessInfoDrawerComponent } from '../../process-details/components/info-drawer/process-info-drawer.component';
import { isProcessServicesInfoDrawerOpened } from '../../../process-services-ext.selector';
import { resetSelectedProcess, setSelectedProcess } from '../../../store/actions/process-details-ext.actions';
import { resetProcessServicesInfoDrawerAction, switchProcessServicesInfoDrawerFocusedTabAction } from '../../../actions/process-services-ext.actions';
import { ProcessExtensionService } from '../../../services/process-extension.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'aps-process-list-ext',
    standalone: true,
    imports: [
        CommonModule,
        ContextActionsDirective,
        PageLayoutHeaderComponent,
        PageLayoutComponent,
        PageLayoutContentComponent,
        MatIconModule,
        TranslatePipe,
        ToolbarComponent,
        ProcessInstanceListComponent,
        DataColumnListComponent,
        DataColumnComponent,
        PaginationComponent,
        FullNamePipe,
        ProcessInfoDrawerComponent
    ],
    templateUrl: './process-list-ext.component.html',
    styleUrls: ['./process-list-ext.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ProcessListExtComponent implements OnInit, OnDestroy {
    @ViewChild('processInstanceList') processInstanceList: ProcessInstanceListComponent;

    @HostListener('row-dblclick', ['$event'])
    onRowDblClick(event: CustomEvent) {
        this.processListExtService.navigateToProcessDetails(this.appId, (event as CustomEvent).detail.value.obj);
    }

    static RUNNING_PROCESS_FILTER_NAME = 'Running';
    static RUNNING_SCHEMA = 'running';
    static DEFAULT_SCHEMA = 'default';

    appId = null;
    filterId: number;
    currentFilter: UserProcessInstanceFilterRepresentation;
    paginationPageSize = 10;
    supportedPageSizes: any[];
    dataProcesses: ObjectDataTableAdapter;
    processSchema = ProcessListExtComponent.DEFAULT_SCHEMA;
    actions: Array<ContentActionRef> = [];
    lastSelectedProcessId: string;
    infoDrawerProcessDetails: ProcessInstanceRepresentation;
    infoDrawerOpened: boolean;
    isLoading = true;
    processListContextMenuActions: Array<ContentActionRef> = [];

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private store: Store<ProcessServiceExtensionState>,
        private route: ActivatedRoute,
        private processListExtService: ProcessListExtService,
        private processExtensionService: ProcessExtensionService
    ) {}

    ngOnInit() {
        this.route.params
            .pipe(
                switchMap((params) => {
                    this.appId = +params['appId'];
                    this.filterId = +params['filterId'];
                    return this.processListExtService.getProcessFilterById(this.filterId);
                })
            )
            .subscribe((filter) => {
                this.currentFilter = filter;
                this.processListExtService.selectFilter(filter);
                this.processListExtService.expandProcessManagementSection();

                this.processSchema =
                    this.currentFilter.name === ProcessListExtComponent.RUNNING_PROCESS_FILTER_NAME
                        ? ProcessListExtComponent.RUNNING_SCHEMA
                        : ProcessListExtComponent.DEFAULT_SCHEMA;
                this.resetSelectionAndInfoDrawer();
            });

        this.fetchPaginationPreference();
        this.setSortOrder();

        this.processExtensionService
            .getAllowedToolbarActions()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((actions) => {
                this.actions = actions;
            });

        this.store
            .select(isProcessServicesInfoDrawerOpened)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((isOpened) => {
                this.infoDrawerOpened = isOpened;
            });

        this.processListExtService.reloadListAction$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.processInstanceList.reload());

        this.processListContextMenuActions = this.processExtensionService.getProcessListContextMenuEntries();
    }

    ngOnDestroy() {
        this.resetSelectionAndInfoDrawer();
    }

    onChangePageSize(pagination: Pagination): void {
        this.processListExtService.setPageSize(pagination);
    }

    getProcessStatus(processInstance: any): string {
        const statusPath = 'PROCESS-EXTENSION.STATUS.';
        if (processInstance) {
            return statusPath + (this.isRunning(processInstance) ? 'RUNNING' : 'COMPLETED');
        }
        return statusPath + 'UNKNOWN';
    }

    isRunning(processInstance: any): boolean {
        return processInstance && !processInstance.ended;
    }

    onRowsSelected(selectedProcessRows: ObjectDataRow[]) {
        const selectedLength = selectedProcessRows.length;
        const lastSelection = (selectedProcessRows[selectedLength - 1] as any)?.obj as ProcessInstanceRepresentation;
        if (selectedLength === 0) {
            this.resetSelectionAndInfoDrawer();
            this.lastSelectedProcessId = null;
        } else if (this.lastSelectedProcessId !== lastSelection?.id) {
            this.store.dispatch(switchProcessServicesInfoDrawerFocusedTabAction({ focused: false }));
            this.isLoading = true;
            this.store.dispatch(setSelectedProcess({ processInstance: lastSelection }));
            this.lastSelectedProcessId = lastSelection?.id;
            this.processExtensionService
                .getProcessDetails(lastSelection.id)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((processDetails) => {
                    this.infoDrawerProcessDetails = processDetails;
                    this.isLoading = false;
                });
        }
    }

    private resetSelectionAndInfoDrawer() {
        this.store.dispatch(resetSelectedProcess());
        this.store.dispatch(resetProcessServicesInfoDrawerAction());
    }

    private fetchPaginationPreference() {
        this.processListExtService
            .fetchPaginationPreference()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((res) => {
                this.paginationPageSize = +res.pageSize;
                this.supportedPageSizes = res.supportedPageSizes;
            });
    }

    private setSortOrder(): void {
        this.dataProcesses = new ObjectDataTableAdapter([], []);
        this.dataProcesses.setSorting(new DataSorting('started', 'desc'));
    }
}
