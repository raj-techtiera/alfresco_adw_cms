/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectorRef, Component, DestroyRef, inject, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Store } from '@ngrx/store';
import { ProcessServiceExtensionState } from '../../store/reducers/process-services.reducer';
import { getSelectedFilter, getTaskFilters } from '../../process-services-ext.selector';
import { ProcessServicesExtActions } from '../../process-services-ext-actions-types';
import { UserProcessInstanceFilterRepresentation, UserTaskFilterRepresentation } from '@alfresco/js-api';
import { NavigationStart, Router } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { TaskFiltersExtComponent } from '../tasks';
import { TranslatePipe } from '@ngx-translate/core';
import { ProcessFiltersExtComponent } from '../processes';
import { MatMenuModule } from '@angular/material/menu';
import { IconComponent } from '@alfresco/adf-core';
import { MatButtonModule } from '@angular/material/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'aps-sidenav-ext',
    standalone: true,
    imports: [
        CommonModule,
        MatExpansionModule,
        TaskFiltersExtComponent,
        TranslatePipe,
        ProcessFiltersExtComponent,
        MatMenuModule,
        IconComponent,
        MatButtonModule
    ],
    templateUrl: './sidenav-ext.component.html',
    styleUrls: ['./sidenav-ext.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class SidenavExtComponent implements OnInit {
    @Input()
    data: any;

    initialExpandedState = false;

    currentFilter: UserProcessInstanceFilterRepresentation | UserTaskFilterRepresentation;

    private readonly destroyRef = inject(DestroyRef);

    constructor(private store: Store<ProcessServiceExtensionState>, private router: Router, private changeDetectorRef: ChangeDetectorRef) {}

    ngOnInit(): void {
        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationStart),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((navigationStart: NavigationStart) => {
                if (this.isNotProcessServicesUrl(navigationStart.url)) {
                    this.resetProcessManagement();
                }
            });

        this.loadFilters();

        this.store
            .select(getSelectedFilter)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((selectedFilter) => {
                this.currentFilter = selectedFilter;
                this.changeDetectorRef.detectChanges();
            });
    }

    private isNotProcessServicesUrl(url: string): boolean {
        return !url.includes('process') && !url.includes('task');
    }

    toggleProcessManagement(expanded: boolean) {
        this.store.dispatch(
            ProcessServicesExtActions.toggleProcessManagement({
                expanded
            })
        );
        if (expanded && !this.currentFilter) {
            if (this.initialExpandedState) {
                this.navigateToDefaultTaskFilter();
            }
            this.initialExpandedState = true;
        }
    }

    processFilterSelected(selectedFilter: UserProcessInstanceFilterRepresentation) {
        this.dispatchSelectFilterAction(selectedFilter);
    }

    taskFilterSelected(selectedFilter: UserProcessInstanceFilterRepresentation | UserTaskFilterRepresentation) {
        this.dispatchSelectFilterAction(selectedFilter);
    }

    dispatchSelectFilterAction(selectedFilter: UserProcessInstanceFilterRepresentation | UserTaskFilterRepresentation) {
        this.store.dispatch(
            ProcessServicesExtActions.selectFilterAction({
                filter: selectedFilter
            })
        );
    }

    private navigateToDefaultTaskFilter() {
        this.store
            .select(getTaskFilters)
            .pipe(
                filter((filters) => !!filters.length),
                take(1)
            )
            .subscribe((taskFilters) => {
                if (taskFilters) {
                    this.store.dispatch(ProcessServicesExtActions.navigateToDefaultTaskFilter({}));
                }
            });
    }

    private resetProcessManagement() {
        this.toggleProcessManagement(false);
        this.dispatchSelectFilterAction(undefined);
    }

    loadFilters() {
        this.store.dispatch(ProcessServicesExtActions.loadFiltersAction({}));
    }
}
