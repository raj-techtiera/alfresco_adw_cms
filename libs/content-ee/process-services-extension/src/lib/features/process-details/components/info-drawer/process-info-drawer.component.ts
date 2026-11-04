/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, OnDestroy, ViewEncapsulation } from '@angular/core';
import { ProcessInstanceRepresentation } from '@alfresco/js-api';
import { CommonModule } from '@angular/common';
import { InfoDrawerComponent, InfoDrawerTabComponent } from '@alfresco/adf-core';
import { ProcessCommentsComponent, ProcessInstanceHeaderComponent } from '@alfresco/adf-process-services';
import { TranslatePipe } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { ProcessServiceExtensionState } from '../../../../store/reducers/process-services.reducer';
import {
    resetProcessServicesInfoDrawerAction,
    switchProcessServicesInfoDrawerFocusedTabAction
} from '../../../../actions/process-services-ext.actions';
import { areInfoDrawerCommentsFocused } from '../../../../process-services-ext.selector';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'aps-process-info-drawer',
    standalone: true,
    imports: [
        CommonModule,
        InfoDrawerComponent,
        InfoDrawerTabComponent,
        MatProgressBarModule,
        ProcessCommentsComponent,
        ProcessInstanceHeaderComponent,
        TranslatePipe
    ],
    templateUrl: './process-info-drawer.component.html',
    styleUrls: ['./process-info-drawer.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: { class: 'aps-process-info-drawer' }
})
export class ProcessInfoDrawerComponent implements OnDestroy {
    @Input({ required: true })
    processInstanceDetails: ProcessInstanceRepresentation;

    @Input()
    isLoading: boolean;

    focusedTab: number;

    constructor(private store: Store<ProcessServiceExtensionState>) {
        this.store
            .select(areInfoDrawerCommentsFocused)
            .pipe(takeUntilDestroyed())
            .subscribe((focused) => {
                this.focusedTab = focused ? 1 : 0;
            });
    }

    onTabChange(tabIndex: number): void {
        if (this.focusedTab !== tabIndex) {
            this.store.dispatch(switchProcessServicesInfoDrawerFocusedTabAction({}));
        }
    }

    ngOnDestroy(): void {
        this.store.dispatch(resetProcessServicesInfoDrawerAction());
    }
}
