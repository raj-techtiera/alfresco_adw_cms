/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import { ALL_APPS } from '../../models/process-service.model';
import { ProcessServicesExtActions } from '../../process-services-ext-actions-types';
import { UserProcessInstanceFilterRepresentation } from '@alfresco/js-api';
import { ProcessServiceExtensionState } from '../../store/reducers/process-services.reducer';
import { BaseFiltersExtComponent } from '../../models/base-filters-ext.component';
import { CommonModule } from '@angular/common';
import { ProcessFiltersComponent } from '@alfresco/adf-process-services';

@Component({
    selector: 'aps-process-filters-ext',
    standalone: true,
    imports: [CommonModule, ProcessFiltersComponent],
    templateUrl: './process-filters-ext.component.html',
    encapsulation: ViewEncapsulation.None
})
export class ProcessFiltersExtComponent extends BaseFiltersExtComponent {
    constructor(private store: Store<ProcessServiceExtensionState>) {
        super();
    }

    onProcessFilterClick(filter: UserProcessInstanceFilterRepresentation) {
        this.store.dispatch(
            ProcessServicesExtActions.navigateToProcessesAction({
                appId: ALL_APPS,
                filterId: filter.id
            })
        );
        this.filterSelected.emit(filter);
    }
}
