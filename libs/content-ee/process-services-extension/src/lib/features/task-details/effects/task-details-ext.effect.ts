/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { NotificationService } from '@alfresco/adf-core';
import { TaskListService } from '@alfresco/adf-process-services';
import { switchMap, tap, catchError, take, concatMap } from 'rxjs/operators';
import { loadTaskDetails, updateTaskDetails, reloadTaskDetails } from '../../../store/actions/task-details-ext.actions';
import { TaskDetailsExtActions } from '../../../store/task-details-ext-actions-types';
import { Observable, of, throwError } from 'rxjs';
import { ProcessServiceExtensionState } from '../../../store/reducers/process-services.reducer';
import { Action, Store } from '@ngrx/store';
import { getSelectedTask } from '../../../process-services-ext.selector';
import { TaskRepresentation } from '@alfresco/js-api';

@Injectable()
export class TaskDetailsExtEffect {

    private actions$ = inject(Actions);
    private store = inject(Store<ProcessServiceExtensionState>);
    private taskListService = inject(TaskListService);
    private notificationService = inject(NotificationService);

    loadTaskDetails$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(loadTaskDetails),
                tap((action) => {
                    this.store
                        .select(getSelectedTask)
                        .pipe(take(1))
                        .subscribe((taskDetails) => {
                            if (!taskDetails || action.taskId !== taskDetails.id) {
                                this.loadTaskDetails(action.taskId);
                            }
                        });
                })
            ),
        { dispatch: false }
    );

    reloadTaskDetails$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(reloadTaskDetails),
                tap((action) => {
                    this.loadTaskDetails(action.taskId);
                })
            ),
        { dispatch: false }
    );

    updateTaskDetails$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(updateTaskDetails),
                concatMap((action) => this.updateTask(action.taskId, action.taskDetails, action.updatedNotification))
            ),
        { dispatch: true }
    );

    private updateTask(taskId: string, taskDetails: TaskRepresentation, updateNotification: Partial<TaskRepresentation>): Observable<Action> {
        const otherProperties = { ...updateNotification };
        delete otherProperties.assignee;
        let result$: Observable<TaskRepresentation>;
        // eslint-disable-next-line no-prototype-builtins
        if (updateNotification.hasOwnProperty('assignee')) {
            result$ = this.updateTaskAssignee(taskId, updateNotification.assignee.toString()).pipe(
                tap((res) => {
                    updateNotification.assignee = res.assignee;
                }),
                switchMap(() => {
                    if (Object.keys(otherProperties).length > 0) {
                        return this.updateTaskDetails(taskId, otherProperties);
                    } else {
                        return of(null);
                    }
                })
            );
        } else {
            result$ = this.updateTaskDetails(taskId, otherProperties);
        }

        return result$.pipe(
            tap(() => {
                this.notificationService.showInfo('PROCESS-EXTENSION.TASK_DETAILS.UPDATED', null, {
                    property: Object.keys(updateNotification).length > 1 ? '' : Object.keys(updateNotification)[0]
                });
            }),
            switchMap(() => [this.setUpdatedTaskDetails(taskDetails, updateNotification)])
        );
    }

    private loadTaskDetails(taskId: string) {
        this.taskListService.getTaskDetails(taskId).subscribe(
            (taskDetails) => {
                this.store.dispatch(TaskDetailsExtActions.setTaskDetails({ taskDetails }));
            },
            (error: Error) => {
                this.notificationService.showError('PROCESS-EXTENSION.TASK_DETAILS.FAILED_TO_LOAD');
                return throwError(error);
            }
        );
    }

    private updateTaskAssignee(taskId: string, assignee: string): Observable<TaskRepresentation> {
        return this.taskListService.assignTaskByUserId(taskId, assignee).pipe(
            catchError((error: Error) => {
                this.notificationService.showError('PROCESS-EXTENSION.TASK_DETAILS.FAILED_TO_UPDATE', null, {property: 'assignee'});
                return throwError(error);
            })
        );
    }

    private updateTaskDetails(taskId: string, updateNotification: Partial<TaskRepresentation>): Observable<TaskRepresentation> {
        return this.taskListService.updateTask(taskId, updateNotification).pipe(
            catchError((error: Error) => {
                this.notificationService.showError('PROCESS-EXTENSION.TASK_DETAILS.FAILED_TO_UPDATE', null, {
                    property: Object.keys(updateNotification).length > 1 ? '' : Object.keys(updateNotification)[0]
                });
                return throwError(error);
            })
        );
    }

    private setUpdatedTaskDetails(taskDetails: TaskRepresentation, updateNotification: Partial<TaskRepresentation>) {
        const updated = { ...taskDetails, ...updateNotification };
        return TaskDetailsExtActions.setTaskDetails({ taskDetails: updated as TaskRepresentation });
    }
}
