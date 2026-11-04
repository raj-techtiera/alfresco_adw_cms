/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { InfoDrawerMemberListComponent } from './info-drawer-member-list/info-drawer-member-list.component';
import { LibraryDetailsComponent } from './library-details.component';
import { MemberListComponent } from './member-list/member-list.component';
import { AddMemberDialogComponent } from './add-member-dialog/add-member-dialog.component';
import { SearchMembersComponent } from './add-member-dialog/search-members/search-members.component';
import { PendingRequestsComponent } from './pending-requests/pending-requests.component';
import { UsersListComponent } from './users-list/users-list.component';
import { GroupsListComponent } from './groups-list/groups-list.component';
import { RoleSelectorComponent } from './role-selector/role-selector.component';
import { RejectMemberDialogComponent } from './pending-requests/reject-member-dialog/reject-member-dialog.component';
import { GroupsInfoDialogComponent } from './groups-info-dialog/groups-info-dialog.component';

export const LIBRARY_MANAGEMENT_DIRECTIVES = [
    LibraryDetailsComponent,
    UsersListComponent,
    MemberListComponent,
    RoleSelectorComponent,
    PendingRequestsComponent,
    RejectMemberDialogComponent,
    GroupsListComponent,
    GroupsInfoDialogComponent,
    AddMemberDialogComponent,
    SearchMembersComponent,
    InfoDrawerMemberListComponent
] as const;
