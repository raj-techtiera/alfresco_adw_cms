/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, EventEmitter, Input, OnChanges, Output, ViewEncapsulation } from '@angular/core';
import { SiteMembershipRequestWithPerson, SiteMembershipRequestWithPersonPaging } from '@alfresco/js-api';
import {
    CustomEmptyContentTemplateDirective,
    DataColumnComponent,
    DataColumnListComponent,
    EmptyContentComponent,
    InitialUsernamePipe,
    NotificationService,
    PaginationComponent,
    ShowHeaderMode
} from '@alfresco/adf-core';
import { SitesService, PeopleContentService, UserNameColumnComponent } from '@alfresco/adf-content-services';
import { LibraryMemberService } from '../services/library-member.service';
import { LibraryDialogService } from '../services/library-dialog.service';
import { filter, finalize, switchMap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { RoleSelectorComponent } from '../role-selector/role-selector.component';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { DataTableExtensionComponent } from '../../shared/data-table-extension/data-table-extension.component';

@Component({
    standalone: true,
    imports: [
        CommonModule,
        TranslatePipe,
        RoleSelectorComponent,
        MatButtonModule,
        DataTableExtensionComponent,
        DataColumnComponent,
        DataColumnListComponent,
        InitialUsernamePipe,
        UserNameColumnComponent,
        EmptyContentComponent,
        PaginationComponent,
        CustomEmptyContentTemplateDirective
    ],
    selector: 'adw-pending-requests',
    templateUrl: './pending-requests.component.html',
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['./pending-requests.component.scss']
})
export class PendingRequestsComponent implements OnChanges {
    @Input()
    siteId: string;

    @Output()
    pendingRequestsCounter: EventEmitter<number> = new EventEmitter();

    loading: boolean;
    membershipRequests: SiteMembershipRequestWithPersonPaging;
    showHeader: ShowHeaderMode = ShowHeaderMode.Never;

    constructor(
        private sitesService: SitesService,
        private libraryMemberService: LibraryMemberService,
        private notificationService: NotificationService,
        private dialogService: LibraryDialogService,
        private peopleService: PeopleContentService
    ) {}

    ngOnChanges(): void {
        if (this.siteId) {
            this.updateSiteMembershipRequests();
        }
    }

    updateSiteMembershipRequests(skipCount = 0, maxItems = 25) {
        const options = {
            where: `(siteId='${this.siteId}')`,
            skipCount,
            maxItems
        };
        this.loading = true;
        this.sitesService
            .getSiteMembershipRequests(options)
            .pipe(finalize(() => (this.loading = false)))
            .subscribe((siteEntry: SiteMembershipRequestWithPersonPaging) => {
                if (siteEntry) {
                    this.membershipRequests = siteEntry;
                    this.emitPendingRequestCounter();
                }
            });
    }

    approveMembershipRequest(membershipRequest: SiteMembershipRequestWithPerson, role: string) {
        const options = { siteMembershipApprovalBody: { role } };
        this.sitesService.approveSiteMembershipRequest(this.siteId, membershipRequest.person.id, options).subscribe(() => {
            this.libraryMemberService.loadMembers(this.siteId);
            this.notificationService.showInfo('NOTIFICATIONS.MEMBERSHIP_ACCEPTED');
            this.updateSiteMembershipRequests();
        });
    }

    rejectMembershipRequest(membershipRequest: SiteMembershipRequestWithPerson) {
        this.dialogService
            .openRejectMemberDialog()
            .pipe(
                filter((action) => action !== false),
                switchMap(({ comment = '' }) => {
                    const opts = { siteMembershipRejectionBody: { comment } };
                    return this.sitesService.rejectSiteMembershipRequest(this.siteId, membershipRequest.person.id, opts);
                })
            )
            .subscribe(() => {
                this.notificationService.showInfo('NOTIFICATIONS.MEMBERSHIP_REJECTED');
                this.updateSiteMembershipRequests();
            });
    }

    onChange({ skipCount, maxItems }) {
        this.updateSiteMembershipRequests(skipCount, maxItems);
    }

    getEcmAvatar(avatarId: string) {
        return this.peopleService.getUserProfileImage(avatarId);
    }

    emitPendingRequestCounter() {
        if (this.membershipRequests?.list?.entries) {
            this.pendingRequestsCounter.emit(this.membershipRequests.list.entries.length);
        }
    }

    refresh() {
        this.updateSiteMembershipRequests();
    }
}
