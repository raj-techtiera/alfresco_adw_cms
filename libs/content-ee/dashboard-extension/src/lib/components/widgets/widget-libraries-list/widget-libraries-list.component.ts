/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { WidgetBaseComponent } from '../widget-base/widget-base.component';
import { InfiniteScrollDatatableComponent } from '../../infinite-scroll-datatable/infinite-scroll-datatable.component';
import {
    DataColumnComponent,
    DataColumnListComponent,
    NotificationService,
    ObjectDataRow
} from '@alfresco/adf-core';
import { SitesApi } from '@alfresco/js-api';
import {
    AlfrescoApiService,
    CustomResourcesService,
    LibraryRoleColumnComponent,
    LibraryStatusColumnComponent,
    SitesService
} from '@alfresco/adf-content-services';
import { catchError, firstValueFrom, from, of, tap } from 'rxjs';
import { AppHookService, ContentApiService } from '@alfresco/aca-shared';
import { InfiniteScrollDatatableRowAction } from '../../../models/infinite-scroll-datatable-row-action.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { LeaveLibraryAction, NavigateLibraryAction, isAdmin, AppStore } from '@alfresco/aca-shared/store';
import { Router } from '@angular/router';
import { LibraryWidgetFilter } from '../../../models/library-widget-filter';
import { LibrariesDataSource } from './libraries-data-source';
import { LibrariesWidgetRowActions } from '../../../models/libraries-widget-rows-actions';
import { WidgetFilter } from '../../../models/widget-filter.interface';
import { InfiniteScrollDatatableRowEvent } from '../../../models/infinite-scroll-datatable-row-event.interface';

@Component({
    selector: 'acs-widget-libraries-list',
    templateUrl: './widget-libraries-list.component.html',
    styleUrl: './widget-libraries-list.component.scss',
    standalone: true,
    imports: [
        WidgetBaseComponent,
        InfiniteScrollDatatableComponent,
        DataColumnComponent,
        DataColumnListComponent,
        LibraryStatusColumnComponent,
        LibraryRoleColumnComponent
    ],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'acs-widget-libraries-list'
    }
})
export class WidgetLibrariesListComponent implements OnInit {
    infiniteScrollDataSource: LibrariesDataSource;
    isAdmin = false;
    selectedFilter: LibraryWidgetFilter = LibraryWidgetFilter.PERSONAL;
    emptyStateMessage = 'WIDGETS.LIBRARIES_LIST.NO_PERSONAL_LIBRARIES';
    rowActions: InfiniteScrollDatatableRowAction[] = [];
    widgetFilters: WidgetFilter[] = [
        { id: 'personal', isActive: true, displayName: 'WIDGETS.LIBRARIES_LIST.PERSONAL', value: LibraryWidgetFilter.PERSONAL },
        { id: 'all', isActive: false, displayName: 'WIDGETS.LIBRARIES_LIST.ALL', value: LibraryWidgetFilter.ALL},
        { id: 'favourites', isActive: false, displayName: 'WIDGETS.LIBRARIES_LIST.FAVOURITES', value: LibraryWidgetFilter.FAVORITES }
    ];

    private readonly destroyRef = inject(DestroyRef);

    private _sitesApi: SitesApi;
    get sitesApi(): SitesApi {
        this._sitesApi = this._sitesApi ?? new SitesApi(this.alfrescoApiService.getInstance());
        return this._sitesApi;
    }

    constructor(
        private customResourcesService: CustomResourcesService,
        private alfrescoApiService: AlfrescoApiService,
        private sitesService: SitesService,
        private contentApiService: ContentApiService,
        private store: Store<AppStore>,
        private notificationService: NotificationService,
        private appHookService: AppHookService,
        private router: Router
    ) {}

    ngOnInit() {
        this.infiniteScrollDataSource = new LibrariesDataSource(this.customResourcesService, this.contentApiService);
        this.store.select(isAdmin).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(res => {
            this.isAdmin = res === true;
        });

        this.appHookService.libraryLeft.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.infiniteScrollDataSource.reset());
        this.rowActions = [
            {
                actionType: LibrariesWidgetRowActions.JOIN,
                title: 'APP.ACTIONS.JOIN',
                icon: 'library_add',
                isVisible: this.checkRowActionVisibility
            },
            {
                actionType: LibrariesWidgetRowActions.LEAVE,
                title: 'APP.ACTIONS.LEAVE',
                icon: 'exit_to_app',
                isVisible: this.checkRowActionVisibility
            }
        ];
    }

    checkRowActionVisibility(row: ObjectDataRow, actionType: LibrariesWidgetRowActions): boolean {
        const visibility = row.getValue('visibility');
        const role = row.getValue('role');

        switch (actionType) {
            case LibrariesWidgetRowActions.JOIN:
                return (!(visibility === 'PRIVATE') && !role) || (visibility === 'PRIVATE' && !role && this.isAdmin);
            case LibrariesWidgetRowActions.LEAVE:
                return !!role;
        }
    }

    executeRowAction(event: InfiniteScrollDatatableRowEvent) {
        switch (event.actionType) {
            case LibrariesWidgetRowActions.JOIN:
                void this.joinLibrary(event);
                break;

            case LibrariesWidgetRowActions.LEAVE:
                this.store.dispatch(new LeaveLibraryAction(event.row.getValue('id')));
                break;
        }
    }

    onNameClick(row: ObjectDataRow) {
        const route = this.selectedFilter === LibraryWidgetFilter.FAVORITES ? 'favorite/libraries' : undefined;
        this.store.dispatch(new NavigateLibraryAction(row.getSourceObject(), route));
    }

    filterSelected(filterValue: string) {
        switch (filterValue) {
            case LibraryWidgetFilter.ALL:
                this.infiniteScrollDataSource.currentFilter = LibraryWidgetFilter.ALL;
                this.selectedFilter = LibraryWidgetFilter.ALL;
                this.emptyStateMessage = 'WIDGETS.LIBRARIES_LIST.NO_ALL_LIBRARIES';
                break;
            case LibraryWidgetFilter.PERSONAL:
                this.infiniteScrollDataSource.currentFilter = LibraryWidgetFilter.PERSONAL;
                this.selectedFilter = LibraryWidgetFilter.PERSONAL;
                this.emptyStateMessage = 'WIDGETS.LIBRARIES_LIST.NO_PERSONAL_LIBRARIES';
                break;
            case LibraryWidgetFilter.FAVORITES:
                this.infiniteScrollDataSource.currentFilter = LibraryWidgetFilter.FAVORITES;
                this.selectedFilter = LibraryWidgetFilter.FAVORITES;
                this.emptyStateMessage = 'WIDGETS.LIBRARIES_LIST.NO_FAVORITE_LIBRARIES';
                break;
        }
        this.infiniteScrollDataSource.reset();
    }

    onViewAllBtnClick() {
        switch (this.selectedFilter) {
            case LibraryWidgetFilter.ALL:
                void this.router.navigateByUrl('all/libraries');
                break;
            case LibraryWidgetFilter.FAVORITES:
                void this.router.navigateByUrl('favorite/libraries');
                break;
            case LibraryWidgetFilter.PERSONAL:
                void this.router.navigateByUrl('libraries');
                break;
        }
    }

    private async joinLibrary(event: InfiniteScrollDatatableRowEvent): Promise<void> {
        const siteId = event.row.getValue('id');

        if (this.isAdmin) {
            await firstValueFrom(this.sitesService.createSiteMembership(siteId, { role: 'SiteConsumer', id: '-me-' }).pipe(
                tap((createdMembership) => {
                    if (createdMembership.entry?.role) {
                        this.notificationService.showInfo('ADF_LIBRARY_MEMBERSHIP_MESSAGES.INFO.JOINED');
                        this.infiniteScrollDataSource.reset();
                    }
                }),
                catchError(() => {
                    this.notificationService.showInfo('ADF_LIBRARY_MEMBERSHIP_MESSAGES.ERRORS.JOIN_REQUEST_FAILED');
                    return of(null);
                })
            ));
        } else {
            const membershipRequest = {id: siteId};
            await firstValueFrom(from(this.sitesApi.createSiteMembershipRequestForPerson('-me-', membershipRequest)).pipe(
                tap((createdRequest) => {
                    const messageKey = createdRequest.entry?.site?.role
                        ? 'ADF_LIBRARY_MEMBERSHIP_MESSAGES.INFO.JOINED'
                        : 'ADF_LIBRARY_MEMBERSHIP_MESSAGES.INFO.JOIN_REQUESTED';
                    this.notificationService.showInfo(messageKey);
                    this.infiniteScrollDataSource.reset();
                }),
                catchError(() => {
                    this.notificationService.showInfo('ADF_LIBRARY_MEMBERSHIP_MESSAGES.ERRORS.JOIN_REQUEST_FAILED');
                    return of(null);
                })
            ));
        }
    }
}
