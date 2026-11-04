/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, map, switchMap, take, tap, withLatestFrom } from 'rxjs/operators';
import { Router } from '@angular/router';
import { ProcessServicesExtActions } from '../../../process-services-ext-actions-types';
import { ProcessServiceExtensionState } from '../../../store/reducers/process-services.reducer';
import { Store } from '@ngrx/store';
import { resetSelectedProcess, setSelectedProcess } from '../../../store/actions/process-details-ext.actions';
import { MatDialog } from '@angular/material/dialog';
import { ProcessInstanceService } from '../../../services/process-instance.service';
import { DialogComponent, DialogSize, NotificationService } from '@alfresco/adf-core';
import { ProcessListExtService } from '../services/process-list-ext.service';
import { ProcessDetailsExtActions } from '../../../process-details-ext-actions-types';
import { getSelectedFilter, getSelectedProcess } from '../../../process-services-ext.selector';
import { ALL_APPS } from '../../../models/process-service.model';
import { processDetailsAction, resetProcessServicesInfoDrawerAction } from '../../../actions/process-services-ext.actions';

@Injectable()
export class ProcessListExtEffect {
    constructor(
        private readonly actions$: Actions,
        private readonly router: Router,
        private readonly store: Store<ProcessServiceExtensionState>,
        private readonly dialog: MatDialog,
        private readonly processInstanceService: ProcessInstanceService,
        private readonly processListExtService: ProcessListExtService,
        private readonly notificationService: NotificationService
    ) {}

    navigateToProcesses$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(ProcessServicesExtActions.navigateToProcessesAction),
                tap((action) => {
                    void this.router.navigateByUrl(`/apps/${action.appId}/processes/${action.filterId}`);
                })
            ),
        { dispatch: false }
    );

    processDetails$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(ProcessServicesExtActions.processDetailsAction),
                tap((action) => {
                    this.store.dispatch(setSelectedProcess({ processInstance: action.processInstance }));
                    void this.router.navigateByUrl(`/apps/${action.appId}/process-details/${action.processInstance.id}`);
                })
            ),
        { dispatch: false }
    );

    cancelProcess$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(ProcessServicesExtActions.cancelProcessAction),
                tap((action) => {
                    this.dialog
                        .open(DialogComponent, {
                            data: {
                                title: 'ADF_PROCESS_LIST.CANCEL_PROCESS.DIALOG.TITLE',
                                description: 'ADF_PROCESS_LIST.CANCEL_PROCESS.DIALOG.DESCRIPTION',
                                dialogSize: DialogSize.Alert,
                                confirmButtonTitle: 'ADF_PROCESS_LIST.CANCEL_PROCESS.DIALOG.CONFIRM_BTN'
                            }
                        })
                        .afterClosed()
                        .pipe(
                            filter(Boolean),
                            switchMap(() => this.store.select(getSelectedProcess).pipe(take(1))),
                            map((process) => {
                                action.processName = process.name;
                                return process.id;
                            }),
                            switchMap((processId) => this.processInstanceService.cancelProcess(processId))
                        )
                        .subscribe({
                            next: () => {
                                this.processListExtService.reloadList();
                                this.notificationService.showInfo('ADF_PROCESS_LIST.CANCEL_PROCESS.NOTIFICATIONS.SUCCESS', null, {
                                    processName: action.processName
                                });
                                this.store.dispatch(resetSelectedProcess());
                                this.store.dispatch(resetProcessServicesInfoDrawerAction());
                            },
                            error: (error) => {
                                this.notificationService.showError('ADF_PROCESS_LIST.CANCEL_PROCESS.NOTIFICATIONS.FAIL', null, {
                                    message: JSON.parse(error.message).message
                                });
                                this.store.dispatch(resetSelectedProcess());
                                this.store.dispatch(resetProcessServicesInfoDrawerAction());
                            }
                        });
                })
            ),
        { dispatch: false }
    );

    navigateToProcessDetailsFromContextMenu$ = createEffect(() => this.actions$.pipe(
        ofType(ProcessDetailsExtActions.navigateToProcessDetailsFromContextMenu),
        switchMap(() => this.store.select(getSelectedFilter).pipe(take(1))),
        withLatestFrom(this.store.select(getSelectedProcess)),
        map(([processFilter, processDetails]) => {
            const appId = processFilter?.appId ? processFilter.appId : ALL_APPS;
            if (processDetails) {
                this.store.dispatch(processDetailsAction({ appId: appId, processInstance: processDetails }));
            }
        })
    ), { dispatch: false });
}
