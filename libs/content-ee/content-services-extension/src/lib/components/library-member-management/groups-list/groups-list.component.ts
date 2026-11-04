/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, OnChanges, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Group, SiteGroup, SiteGroupPaging, SiteMembershipBodyUpdate } from '@alfresco/js-api';
import {
    CustomEmptyContentTemplateDirective,
    DataColumnComponent,
    DataColumnListComponent,
    EmptyContentComponent,
    NotificationService,
    PaginationComponent,
    PaginationModel,
    ShowHeaderMode
} from '@alfresco/adf-core';
import { SitesService, UserIconColumnComponent, UserNameColumnComponent } from '@alfresco/adf-content-services';
import { catchError, filter, finalize, switchMap } from 'rxjs/operators';
import { forkJoin, of, Subject } from 'rxjs';
import { LibraryDialogService } from '../services/library-dialog.service';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RoleSelectorComponent } from '../role-selector/role-selector.component';
import { PaginationDirective } from '@alfresco/aca-shared';
import { DataTableExtensionComponent } from '../../shared/data-table-extension/data-table-extension.component';
import { LibraryMemberService } from '../services/library-member.service';

@Component({
    standalone: true,
    imports: [
        CommonModule,
        TranslatePipe,
        MatIconModule,
        MatButtonModule,
        RoleSelectorComponent,
        PaginationDirective,
        DataTableExtensionComponent,
        DataColumnComponent,
        DataColumnListComponent,
        UserNameColumnComponent,
        EmptyContentComponent,
        PaginationComponent,
        CustomEmptyContentTemplateDirective,
        UserIconColumnComponent
    ],
    selector: 'adw-groups-list',
    templateUrl: './groups-list.component.html',
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['./groups-list.component.scss']
})
export class GroupsListComponent implements OnChanges, OnDestroy {
    @Input()
    siteId: string;

    loading: boolean;
    groups: SiteGroupPaging;
    selectedRows: SiteGroup[] = [];
    performAction$ = new Subject();
    showHeader: ShowHeaderMode = ShowHeaderMode.Never;

    private pagination: PaginationModel = new PaginationModel();

    constructor(
        private sitesService: SitesService,
        private notificationService: NotificationService,
        private dialogService: LibraryDialogService,
        private libraryMemberService: LibraryMemberService
    ) {
        this.performAction$.subscribe((action: any) => {
            this.bulkDeleteGroup([action['data'].entry.id]);
        });
    }

    ngOnChanges(): void {
        if (this.siteId) {
            this.loadSiteGroups();
        }
    }

    ngOnDestroy(): void {
        this.performAction$.complete();
    }

    onRoleChanged(role, group: Group) {
        const body = new SiteMembershipBodyUpdate({ role });
        this.sitesService.updateSiteGroupMembership(this.siteId, group.id, body).subscribe(() => {
            this.libraryMemberService.checkIfUserGroupIsAffected(this.siteId, [group.id]);
            this.notificationService.showInfo('NOTIFICATIONS.GROUP_ROLE_UPDATED');
            this.loadSiteGroups();
        });
    }

    onGroupRemoved(event: MouseEvent, groupId: string) {
        event.stopPropagation();
        this.bulkDeleteGroup([groupId]);
    }

    setSelectedRows(event: Event) {
        if ((<CustomEvent>event).detail) {
            this.selectedRows = (<CustomEvent>event).detail.selection.map((row) => row['obj']['entry']);
        }
    }

    bulkDelete() {
        const ids = this.selectedRows.map((group) => group.id);
        this.bulkDeleteGroup(ids);
    }

    onShowRowContextMenu(event) {
        event.value.actions = [
            {
                data: event.value.row['obj'],
                model: {
                    title: 'Delete',
                    icon: 'delete',
                    visible: true
                },
                subject: this.performAction$
            }
        ];
    }

    loadSiteGroups({ skipCount = 0, maxItems = 25 } = this.pagination) {
        this.pagination = { skipCount, maxItems };
        this.loading = true;
        this.sitesService
            .listSiteGroups(this.siteId, { skipCount, maxItems })
            .pipe(finalize(() => (this.loading = false)))
            .subscribe((groups: SiteGroupPaging) => {
                this.groups = groups;
            });
    }

    private bulkDeleteGroup(groupsIds: string[]) {
        this.dialogService
            .openConfirmDialog()
            .pipe(
                filter(Boolean),
                switchMap(() => {
                    const requests = groupsIds.map((groupId) =>
                        this.sitesService.deleteSiteGroupMembership(this.siteId, groupId).pipe(catchError(() => of(false)))
                    );
                    return forkJoin([...requests]);
                })
            )
            .subscribe((results) => {
                this.libraryMemberService.checkIfUserGroupIsAffected(this.siteId, groupsIds);
                const total = results.length;
                const skipped = results.filter((result) => result === false).length;
                const success = total - skipped;
                if (total === skipped) {
                    this.notificationService.showError('NOTIFICATIONS.GROUP_REMOVE_FAILED');
                } else if (total === success) {
                    this.notificationService.showInfo('NOTIFICATIONS.GROUP_REMOVE_SUCCESS');
                    this.loadSiteGroups();
                } else {
                    this.notificationService.showInfo('NOTIFICATIONS.GROUP_REMOVE_PARTIAL_SUCCESS', null, { count: success, skipped });
                    this.loadSiteGroups();
                }
            });
    }

    refresh() {
        this.loadSiteGroups();
    }
}
