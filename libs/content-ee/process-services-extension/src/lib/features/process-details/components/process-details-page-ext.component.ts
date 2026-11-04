/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { loadSelectedProcess, resetSelectedProcess } from '../../../store/actions/process-details-ext.actions';
import { Store } from '@ngrx/store';
import { getSelectedProcess, isProcessServicesInfoDrawerOpened } from '../../../process-services-ext.selector';
import { ProcessInstanceRepresentation, TaskRepresentation } from '@alfresco/js-api';
import { CommonModule } from '@angular/common';
import { PageLayoutComponent, PageLayoutContentComponent, PageLayoutHeaderComponent, ToolbarComponent } from '@alfresco/aca-shared';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ProcessDetailsExtComponent } from './process-details/process-details-ext.component';
import { ProcessServiceExtensionState } from '../../../store/reducers/process-services.reducer';
import { TaskInfoDrawerComponent } from '../../task-info-drawer/components/task-info-drawer.component';
import { ContentActionRef } from '@alfresco/adf-extensions';
import { resetProcessServicesInfoDrawerAction } from '../../../actions/process-services-ext.actions';
import { ProcessExtensionService } from '../../../services/process-extension.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'aps-process-details-page-ext',
    standalone: true,
    imports: [
        CommonModule,
        PageLayoutHeaderComponent,
        PageLayoutComponent,
        PageLayoutContentComponent,
        TranslatePipe,
        MatIconModule,
        ToolbarComponent,
        TaskInfoDrawerComponent,
        MatButtonModule,
        ProcessDetailsExtComponent
    ],
    templateUrl: './process-details-page-ext.component.html',
    styleUrls: ['./process-details-page-ext.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ProcessDetailsPageExtComponent implements OnInit, OnDestroy {
    processInstanceDetails: ProcessInstanceRepresentation = {};
    infoDrawerOpened = false;
    infoDrawerTaskDetails: TaskRepresentation;
    actions: Array<ContentActionRef> = [];
    isLoading: boolean;
    lastSelectedTaskId: string;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private route: ActivatedRoute,
        private store: Store<ProcessServiceExtensionState>,
        private processExtensionService: ProcessExtensionService
    ) {}

    ngOnInit(): void {
        this.route.params.subscribe((params) => {
            this.loadProcessDetails(params['processId']);
        });

        this.processExtensionService
            .getAllowedToolbarActions()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((actions) => {
                this.actions = actions;
            });

        this.store
            .select(getSelectedProcess)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((processInstanceDetails) => {
                this.processInstanceDetails = processInstanceDetails;
            });

        this.store
            .select(isProcessServicesInfoDrawerOpened)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((isOpened) => (this.infoDrawerOpened = isOpened));
    }

    private loadProcessDetails(processInstanceId: string) {
        this.store.dispatch(
            loadSelectedProcess({
                processInstanceId
            })
        );
    }

    onInfoDrawerTaskDetails(selectedTask: TaskRepresentation) {
        this.infoDrawerTaskDetails = selectedTask;
    }

    onLoading(loading: boolean) {
        this.isLoading = loading;
    }

    onSelectedTaskId(taskId: string) {
        this.lastSelectedTaskId = taskId;
    }

    ngOnDestroy(): void {
        this.store.dispatch(resetProcessServicesInfoDrawerAction());
        this.store.dispatch(resetSelectedProcess());
    }
}
