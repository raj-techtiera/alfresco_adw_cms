/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, switchMap, take, tap, withLatestFrom } from 'rxjs/operators';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { ProcessServicesExtActions } from '../../../process-services-ext-actions-types';
import { ProcessServiceExtensionState } from '../../../store/reducers/process-services.reducer';
import { getDefaultTaskFilter, getSelectedFilter, getSelectedTask } from '../../../process-services-ext.selector';
import { ALL_APPS } from '../../../models/process-service.model';
import { navigateToTaskDetails } from '../../../store/actions/task-details-ext.actions';
import { TaskDetailsExtActions } from '../../../store/task-details-ext-actions-types';

@Injectable()
export class TaskListExtEffect {

    private store = inject(Store<ProcessServiceExtensionState>);
    private actions$ = inject(Actions);
    private router = inject(Router);

    navigateToTasks$ = createEffect(() => this.actions$.pipe(
        ofType(ProcessServicesExtActions.navigateToTasksAction),
        map((action) => {
            void this.router.navigateByUrl(`apps/${action.appId}/tasks/${action.filterId}`);
        })
    ), { dispatch: false });


    navigateToTaskDetails$ = createEffect(() => this.actions$.pipe(
        ofType(navigateToTaskDetails),
        tap((action) => {
            this.store.dispatch(TaskDetailsExtActions.setTaskDetails({ taskDetails: action.selectedTask }));
            void this.router.navigateByUrl(`apps/${action.appId}/task-details/${action.selectedTask.id}`);
        })
    ), { dispatch: false });


    navigateToTaskDefaultFilter$ = createEffect(() => this.actions$.pipe(
        ofType(ProcessServicesExtActions.navigateToDefaultTaskFilter),
        switchMap(() => this.store.select(getDefaultTaskFilter).pipe(take(1))),
        map((defaultTaskFilter) => {
            if (defaultTaskFilter) {
                void this.router.navigateByUrl(`apps/${ALL_APPS}/tasks/${defaultTaskFilter.id}`);
            }
        })
    ), { dispatch: false });


    showAttacheContentPreview$ = createEffect(() => this.actions$.pipe(
        ofType(ProcessServicesExtActions.showAttachedContentPreviewAction),
        map(() => {
            const previewLocation = `${this.router.url}/view`;
            console.log('previewLocation', previewLocation);
            void this.router.navigateByUrl(`${previewLocation}(overlay:preview/blob)`);
        })
    ), { dispatch: false });

    navigateToTaskDetailsFromContextMenu$ = createEffect(() => this.actions$.pipe(
        ofType(TaskDetailsExtActions.navigateToTaskDetailsFromContextMenu),
        switchMap(() => this.store.select(getSelectedFilter).pipe(take(1))),
        withLatestFrom(this.store.select(getSelectedTask)),
        map(([filter, taskDetails]) => {
            const appId = filter?.appId ? filter.appId : ALL_APPS;
            if (taskDetails) {
                this.store.dispatch(navigateToTaskDetails({ appId: appId, selectedTask: taskDetails }));
            }
        })
    ), { dispatch: false });
}
