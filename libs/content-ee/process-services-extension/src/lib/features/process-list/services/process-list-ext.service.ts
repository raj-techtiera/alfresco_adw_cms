/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { UserPreferencesService } from '@alfresco/adf-core';
import { Store } from '@ngrx/store';
import { ProcessServiceExtensionState } from '../../../store/reducers/process-services.reducer';
import { ProcessServicesExtActions } from '../../../process-services-ext-actions-types';
import { Observable, of, Subject } from 'rxjs';
import { UserProcessInstanceFilterRepresentation } from '@alfresco/js-api';
import { getProcessFilterById } from '../../../process-services-ext.selector';
import { BaseListService } from '../../../services/base-list.service';
import { ProcessFilterService } from '@alfresco/adf-process-services';
import { switchMap } from 'rxjs/operators';
import { ALL_APPS } from '../../../models/process-service.model';

@Injectable({
    providedIn: 'root'
})
export class ProcessListExtService extends BaseListService {
    readonly reloadListAction$ = new Subject<void>();

    constructor(
        userPreferenceService: UserPreferencesService,
        protected store: Store<ProcessServiceExtensionState>,
        private processFilterService: ProcessFilterService
    ) {
        super(userPreferenceService, store);
    }

    getProcessFilterById(filterId: number): Observable<UserProcessInstanceFilterRepresentation> {
        return this.store
            .select(getProcessFilterById, { id: filterId })
            .pipe(
                switchMap((filter: UserProcessInstanceFilterRepresentation) =>
                    filter ? of(filter) : this.processFilterService.getProcessFilterById(filterId, ALL_APPS)
                )
            );
    }

    navigateToProcessDetails(appId: number, processInstance: any) {
        this.store.dispatch(
            ProcessServicesExtActions.processDetailsAction({
                appId,
                processInstance
            })
        );
    }

    reloadList(): void {
        this.reloadListAction$.next();
    }
}
