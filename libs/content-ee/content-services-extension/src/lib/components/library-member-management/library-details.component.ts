/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { SiteEntry } from '@alfresco/js-api';
import { SitesService, VersionCompatibilityModule } from '@alfresco/adf-content-services';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolbarComponent } from '../shared/toolbar.component';
import { AppExtensionService, PageLayoutComponent, ToolbarActionComponent } from '@alfresco/aca-shared';
import { Store } from '@ngrx/store';
import { SetSelectedNodesAction, isAdmin } from '@alfresco/aca-shared/store';
import { ACS_VERSIONS } from '../../models/types';
import { MatTabsModule } from '@angular/material/tabs';
import { UsersListComponent } from './users-list/users-list.component';
import { GroupsListComponent } from './groups-list/groups-list.component';
import { PendingRequestsComponent } from './pending-requests/pending-requests.component';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { TemplateModule } from '@alfresco/adf-core';
import { MatButtonModule } from '@angular/material/button';
import { DynamicTabComponent, ExtensionsModule } from '@alfresco/adf-extensions';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    standalone: true,
    imports: [
        CommonModule,
        TranslatePipe,
        PageLayoutComponent,
        MatIconModule,
        ToolbarActionComponent,
        MatButtonModule,
        MatTabsModule,
        ExtensionsModule,
        MatBadgeModule,
        TemplateModule,
        MatProgressSpinnerModule,
        UsersListComponent,
        PendingRequestsComponent,
        GroupsListComponent,
        VersionCompatibilityModule,
        DynamicTabComponent
    ],
    selector: 'adw-library-details',
    templateUrl: './library-details.component.html',
    styleUrls: ['./library-details.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class LibraryDetailsComponent extends ToolbarComponent implements OnInit, OnDestroy {
    site: SiteEntry;
    notFound = false;
    loading = true;
    ACS_VERSIONS = ACS_VERSIONS;
    pendingRequests = 0;
    isAdmin = false;

    private readonly destroy: DestroyRef = inject(DestroyRef);

    constructor(
        public sitesService: SitesService,
        private route: ActivatedRoute,
        private router: Router,
        private location: Location,
        protected store: Store<any>,
        protected appExtensionService: AppExtensionService
    ) {
        super(store, appExtensionService);
    }

    ngOnInit(): void {
        super.ngOnInit();
        this.store
            .select(isAdmin)
            .pipe(takeUntilDestroyed(this.destroy))
            .subscribe((res) => {
                this.isAdmin = res === true;
            });
        this.route.params.pipe(takeUntilDestroyed(this.destroy)).subscribe(({ siteId }) => {
            this.sitesService.getSite(siteId).subscribe(
                (site: SiteEntry) => {
                    site['isLibrary'] = true;
                    if (site.entry?.role !== 'SiteManager' && !this.isAdmin) {
                        void this.router.navigate(['/']);
                    }
                    this.store.dispatch(new SetSelectedNodesAction([site] as any));
                    this.site = site;
                    this.loading = false;
                },
                () => {
                    this.notFound = true;
                    this.loading = false;
                }
            );
        });
    }

    onClick() {
        this.location.back();
    }

    redirectToLibrary(event: Event) {
        if (event && event.type === 'click') {
            event.preventDefault();
        }
        this.location.back();
    }

    onPendingRequestCounterChange(pendingRequests: number) {
        this.pendingRequests = pendingRequests;
    }
}
