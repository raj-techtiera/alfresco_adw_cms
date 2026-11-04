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
import { ProcessServiceExtensionState } from '../../store/reducers/process-services.reducer';
import { BaseFiltersExtComponent } from '../../models/base-filters-ext.component';
import { UserTaskFilterRepresentation } from '@alfresco/js-api';
import { CommonModule } from '@angular/common';
import { TaskFiltersComponent } from '@alfresco/adf-process-services';

@Component({
    selector: 'aps-task-filters-ext',
    standalone: true,
    imports: [CommonModule, TaskFiltersComponent],
    templateUrl: './task-filters-ext.component.html',
    encapsulation: ViewEncapsulation.None
})
export class TaskFiltersExtComponent extends BaseFiltersExtComponent {
    constructor(private store: Store<ProcessServiceExtensionState>) {
        super();
    }

    onTaskFilterClick(selectedFilter: UserTaskFilterRepresentation) {
        this.store.dispatch(
            ProcessServicesExtActions.navigateToTasksAction({
                appId: ALL_APPS,
                filterId: selectedFilter.id
            })
        );
        this.filterSelected.emit(selectedFilter);
    }
}
