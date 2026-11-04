/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, EventEmitter, Input, OnDestroy, Output, ViewEncapsulation } from '@angular/core';
import { SiteMember, SiteMemberEntry, SiteMemberPaging } from '@alfresco/js-api';
import {
    CustomEmptyContentTemplateDirective,
    DataColumnComponent,
    DataColumnListComponent,
    EmptyContentComponent,
    PaginatedComponent,
    PaginationModel,
    RequestPaginationModel,
    ShowHeaderMode
} from '@alfresco/adf-core';
import { LibraryMemberService } from '../services/library-member.service';
import { ACS_ROLES, MemberRole } from '../../../models/member-role.model';
import { GroupsInfoDialogData } from '../../../models/types';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { GroupsInfoDialogComponent } from '../groups-info-dialog/groups-info-dialog.component';
import { PeopleContentService, UserIconColumnComponent, UserNameColumnComponent } from '@alfresco/adf-content-services';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { RoleSelectorComponent } from '../role-selector/role-selector.component';
import { DataTableExtensionComponent } from '../../shared/data-table-extension/data-table-extension.component';
import { SiteMembershipType } from '../add-member-dialog/site-member-collection';
import { UserProfileService } from '@alfresco/aca-shared';

@Component({
    standalone: true,
    imports: [
        CommonModule,
        TranslatePipe,
        MatIconModule,
        MatButtonModule,
        MatChipsModule,
        RoleSelectorComponent,
        DataTableExtensionComponent,
        DataColumnComponent,
        DataColumnListComponent,
        UserIconColumnComponent,
        UserNameColumnComponent,
        EmptyContentComponent,
        CustomEmptyContentTemplateDirective
    ],
    selector: 'adw-member-list',
    templateUrl: './member-list.component.html',
    styleUrls: ['./member-list.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class MemberListComponent implements PaginatedComponent, OnDestroy {
    protected readonly ACS_ROLES = ACS_ROLES;
    protected readonly SiteMembershipType = SiteMembershipType;

    @Input()
    members: SiteMemberPaging;

    @Input()
    collapsedView = false;

    @Input()
    loading = false;

    @Input()
    selectionMode: 'multiple' | 'none' = 'multiple';

    @Input()
    siteId: string = null;

    @Input()
    showTotal = true;

    @Input()
    multiSelect = false;

    @Input()
    infinitePagination = false;

    @Input()
    showActions = false;

    @Output()
    memberRemoved: EventEmitter<string> = new EventEmitter<string>();

    @Output()
    memberRoleChanged: EventEmitter<MemberRole> = new EventEmitter<MemberRole>();

    @Output()
    memberRejected: EventEmitter<string> = new EventEmitter<string>();

    @Output()
    showRowContextMenu = new EventEmitter();

    @Output()
    bulkDelete = new EventEmitter();

    pagination: BehaviorSubject<PaginationModel>;
    selectedRows: SiteMemberEntry[] = [];
    updatedPagination: PaginationModel;
    showHeader: ShowHeaderMode = ShowHeaderMode.Never;

    constructor(
        private libraryMemberService: LibraryMemberService,
        private peopleService: PeopleContentService,
        public dialog: MatDialog,
        public readonly userProfileService: UserProfileService
    ) {
        this.pagination = this.libraryMemberService.pagination;
    }

    onMemberRoleChanged(newRole: string, member: SiteMember) {
        this.memberRoleChanged.emit(<MemberRole>{
            memberId: member.id,
            role: newRole
        });
    }

    removeMember(event: MouseEvent | KeyboardEvent, memberId: string) {
        event.stopPropagation();
        this.memberRemoved.emit(memberId);
    }

    rejectMember(event: MouseEvent | KeyboardEvent, memberId: string) {
        event.stopPropagation();
        this.memberRejected.emit(memberId);
    }

    setSelectedRows(event: Event) {
        if ((event as CustomEvent).detail) {
            this.selectedRows = (event as CustomEvent).detail.selection
                .map((row) => row['obj'])
                .filter((member: SiteMemberEntry) => !member.entry?.isMemberOfGroup);
        }
    }

    getEcmAvatar(avatarId: string) {
        return this.peopleService.getUserProfileImage(avatarId);
    }

    updatePagination(requestPaginationModel: RequestPaginationModel): void {
        this.updatedPagination = requestPaginationModel;
        if (this.infinitePagination) {
            this.libraryMemberService.loadMembers(this.siteId, requestPaginationModel, false);
        } else {
            this.libraryMemberService.loadMembers(this.siteId, requestPaginationModel);
        }
    }

    reloadMembers() {
        this.libraryMemberService.loadMembers(this.siteId, this.updatedPagination);
    }

    openGroupsInfoDialog(member: SiteMember) {
        this.dialog.open(GroupsInfoDialogComponent, {
            width: '600px',
            data: {
                memberId: member.id,
                siteId: this.siteId
            } as GroupsInfoDialogData
        });
    }

    ngOnDestroy(): void {
        this.pagination = null;
    }
}
