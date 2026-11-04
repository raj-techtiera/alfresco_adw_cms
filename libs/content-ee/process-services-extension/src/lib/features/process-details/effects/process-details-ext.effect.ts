/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { take, tap } from 'rxjs/operators';
import { ProcessService } from '@alfresco/adf-process-services';
import { ProcessDetailsExtActions } from '../../../process-details-ext-actions-types';
import { loadSelectedProcess } from '../../../store/actions/process-details-ext.actions';
import { ProcessServiceExtensionState } from '../../../store/reducers/process-services.reducer';
import { Store } from '@ngrx/store';
import { getSelectedProcess } from '../../../process-services-ext.selector';

@Injectable()
export class ProcessDetailsExtEffect {

    private actions = inject(Actions);
    private processService = inject(ProcessService);
    private store = inject(Store<ProcessServiceExtensionState>);

    getSelectedProcess$ = createEffect(
        () =>
            this.actions.pipe(
                ofType(loadSelectedProcess),
                tap((action) => {
                    this.store
                        .select(getSelectedProcess)
                        .pipe(take(1))
                        .subscribe((processInstance) => {
                            if (!processInstance || action.processInstanceId !== processInstance.id) {
                                this.loadProcess(action.processInstanceId);
                            }
                        });
                })
            ),
        { dispatch: false }
    );

    private loadProcess(processInstanceId: string) {
        return this.processService
            .getProcess(processInstanceId)
            .subscribe((process) => this.store.dispatch(ProcessDetailsExtActions.setSelectedProcess({ processInstance: process })));
    }
}
