/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, Inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Site, SiteGroupEntry, SiteMemberEntry, SiteMembershipRequestWithPersonPaging } from '@alfresco/js-api';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { forkJoin, Observable, of } from 'rxjs';
import { NotificationService } from '@alfresco/adf-core';
import { SitesService, VersionCompatibilityService } from '@alfresco/adf-content-services';
import { LibraryMemberService } from '../services/library-member.service';
import { Store } from '@ngrx/store';
import { AppStore } from '@alfresco/aca-shared/store';
import { NotificationsReloadAction } from '../../../store/extension.actions';
import { SearchMembersComponent } from './search-members/search-members.component';
import { catchError, mapTo } from 'rxjs/operators';
import { Members, SiteMemberCollection, SiteMemberships, SiteMembershipType } from './site-member-collection';
import { ACS_VERSIONS, AddMemberDialogData } from '../../../models/types';
import { MemberRole } from '../../../models/member-role.model';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { RoleSelectorComponent } from '../role-selector/role-selector.component';
import { MemberListComponent } from '../member-list/member-list.component';
import { A11yModule } from '@angular/cdk/a11y';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    standalone: true,
    imports: [
        CommonModule,
        TranslatePipe,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        RoleSelectorComponent,
        MemberListComponent,
        A11yModule,
        SearchMembersComponent
    ],
    selector: 'adw-add-member',
    templateUrl: './add-member-dialog.component.html',
    styleUrls: ['./add-member-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AddMemberDialogComponent implements OnInit {
    membersToBeAdded = new SiteMemberCollection();
    members: SiteMemberships[] = [];
    isSearchActive = true;
    libraryMembers = new SiteMemberCollection();

    @ViewChild(SearchMembersComponent)
    searchMembersComponent: SearchMembersComponent;

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        @Inject(MAT_DIALOG_DATA) private data: AddMemberDialogData,
        private sitesService: SitesService,
        private libraryMemberService: LibraryMemberService,
        private notificationService: NotificationService,
        private dialogRef: MatDialogRef<AddMemberDialogComponent>,
        private store: Store<AppStore>,
        private versionCompatibilityService: VersionCompatibilityService
    ) {}

    get libraryName(): string {
        return this.data.site.entry.title || '';
    }

    ngOnInit() {
        if (this.data && this.data.members) {
            this.disableSearch();
            this.data.members.forEach((member) => {
                const group: any = {
                    type: SiteMembershipType.REQUEST,
                    entry: {
                        id: member.id,
                        person: { ...member }
                    }
                };

                this.membersToBeAdded.addMember(new SiteMemberEntry(group) as SiteMemberships);
            });
        }

        this.sitesService.getSiteMembers(this.data.site.entry.id).subscribe((members: any) => {
            this.libraryMembers.addMember(members.relations.members.list.entries);
        });

        if (this.versionCompatibilityService.isVersionSupported(ACS_VERSIONS['7'])) {
            this.sitesService.listSiteGroups(this.data.site.entry.id, { maxCount: 1000 }).subscribe((groups) => {
                this.libraryMembers.addMember(groups.list.entries as SiteMemberships[]);
            });
        }

        this.membersToBeAdded.members$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((members) => (this.members = members));
    }

    onMembersSelected(selectedMembers: Members) {
        this.disableSearch();
        const addedUsers = selectedMembers.users.filter((member) => !this.membersToBeAdded.isDuplicateMember(member));
        const addedGroups = selectedMembers.groups.filter((member) => !this.membersToBeAdded.isDuplicateMember(member));
        addedUsers.forEach((member) => {
            const existingMember = this.libraryMembers.isDuplicateMember(member);
            if (existingMember) {
                member.readonly = true;
                member.entry.role = existingMember.entry.role;
            }
        });
        addedGroups.forEach((member) => {
            const existingMember = this.libraryMembers.isDuplicateMember(member);
            if (existingMember) {
                member.readonly = true;
                member.entry.role = existingMember.entry.role;
            }
        });

        this.membersToBeAdded.addMember([...addedUsers, ...addedGroups]);
    }

    onMemberRemoved(memberId: string) {
        this.membersToBeAdded.removeMember(memberId);
    }

    onAdd() {
        const site = this.data.site.entry;
        const memberships = this.getMembershipsGroups();
        const invitations = this.approveSiteMembership(site, memberships.invitations);
        const users = this.createUserMembership(site, memberships.users);
        const groups = this.createGroupMembership(site, memberships.groups);

        forkJoin([...users, ...groups, ...invitations]).subscribe((members: any[]) => {
            const failed = members.filter((item) => item.error);
            const succeededMembers: SiteMemberEntry[] = members.filter((item) => item.entry && !this.isGroupEntry(item));
            const succeededGroups = members.filter((item) => item.entry && this.isGroupEntry(item));

            this.notifyResult(failed, succeededMembers, succeededGroups);
            succeededMembers.forEach((member) => this.onMemberRemoved(member.entry.id));

            if (succeededMembers.length || succeededGroups.length) {
                this.libraryMemberService.loadMembers(site.id);
                this.store.dispatch(new NotificationsReloadAction());
            }

            if (!failed.length) {
                this.dialogRef.close();
            }
        });
    }

    bulkRoleUpdate(newRole: string) {
        this.membersToBeAdded.updateAllRole(newRole);
    }

    onMemberRoleChanged(roleChange: MemberRole) {
        this.membersToBeAdded.updateRole(roleChange.memberId, roleChange.role);
    }

    onMemberRejected(memberId: string) {
        this.sitesService.rejectSiteMembershipRequest(this.data.site.entry.id, memberId).subscribe(
            () => {
                this.notificationService.showInfo('NOTIFICATIONS.MEMBERSHIP_REJECTED');
                this.onMemberRemoved(memberId);
                this.store.dispatch(new NotificationsReloadAction());
            },
            (error: Error) => {
                const errorJson = JSON.parse(error.message).error;
                let message = 'ERRORS.GENERIC';

                if (errorJson.statusCode === 403) {
                    message = 'ERRORS.PERMISSION_DENIED';
                }

                this.notificationService.showError(message);
            }
        );
    }

    enableSearch() {
        this.isSearchActive = true;
    }

    disableSearch() {
        this.isSearchActive = false;
    }

    onCancel() {
        if (this.membersToBeAdded.getAll().length) {
            this.disableSearch();
        } else {
            this.dialogRef.close();
        }
    }

    private notifyResult(failed, succeededMembers, succeededGroups) {
        if (failed.length === 1) {
            let message = 'NOTIFICATIONS.ADD_MEMBER_FAILED';
            if (failed[0].errorCode === 403) {
                message = 'ERRORS.PERMISSION_DENIED';
            }

            if (failed[0].errorCode === 409) {
                message = 'NOTIFICATIONS.MEMBER_EXISTS';
            }

            this.notificationService.showError(message);
        }

        const total = succeededMembers.length + succeededGroups.length + failed.length;
        const skipped = total - succeededMembers.length - succeededGroups.length;

        switch (total) {
            case succeededMembers.length:
                this.notificationService.showInfo('NOTIFICATIONS.ADD_USERS_SUCCESS', 'NOTIFICATIONS.ACTIONS.CLOSE', {
                    userCount: succeededMembers.length
                });
                break;
            case succeededGroups.length:
                this.notificationService.showInfo('NOTIFICATIONS.ADD_GROUPS_SUCCESS', 'NOTIFICATIONS.ACTIONS.CLOSE', {
                    groupCount: succeededGroups.length
                });
                break;
            case succeededMembers.length + succeededGroups.length:
                this.notificationService.showInfo('NOTIFICATIONS.ADD_MEMBERS_SUCCESS', 'NOTIFICATIONS.ACTIONS.CLOSE', {
                    userCount: succeededMembers.length,
                    groupCount: succeededGroups.length
                });
                break;
            case failed.length:
                this.notificationService.showError('NOTIFICATIONS.ADD_MEMBERS_FAILED', null, { count: total });
                break;
            default:
                this.notificationService.showWarning('NOTIFICATIONS.ADD_MEMBERS_PARTIAL_SUCCESS', null, {
                    count: succeededMembers.length + succeededGroups.length,
                    skipped
                });
        }
    }

    private getMembershipsGroups() {
        return this.membersToBeAdded
            .getAll()
            .filter((member) => !member.readonly)
            .reduce(
                (accumulator: any, element: SiteMemberships) => {
                    if (element.type === SiteMembershipType.REQUEST) {
                        accumulator.invitations.push(element);
                    } else if (element.type === SiteMembershipType.USER) {
                        accumulator.users.push(element);
                    } else if (element.type === SiteMembershipType.GROUP) {
                        accumulator.groups.push(element);
                    }

                    accumulator.count = accumulator.users.length + accumulator.groups.length + accumulator.invitations.length;
                    return accumulator;
                },
                { users: [], groups: [], invitations: [], count: 0 }
            );
    }

    private approveSiteMembership(site: Site, invitations: SiteMemberEntry[]): Observable<any | SiteMembershipRequestWithPersonPaging>[] {
        return invitations.map((request: SiteMemberEntry) => {
            const options = {
                siteMembershipApprovalBody: { role: request.entry.role }
            };
            return this.sitesService.approveSiteMembershipRequest(site.id, request.entry.person.id, options).pipe(
                mapTo(request),
                catchError((error: Error) =>
                    of({
                        error,
                        errorCode: this.getErrorCode(error),
                        member: request
                    })
                )
            );
        });
    }

    private createUserMembership(site: Site, users: SiteMemberEntry[]): Observable<any | SiteMemberEntry>[] {
        return users.map((member: SiteMemberEntry) => {
            const siteMembership = {
                id: member.entry.id,
                role: member.entry.role
            };
            return this.sitesService.createSiteMembership(site.id, siteMembership).pipe(
                catchError((error: Error) =>
                    of({
                        error,
                        errorCode: this.getErrorCode(error),
                        member
                    })
                )
            );
        });
    }

    private createGroupMembership(site: Site, groups: SiteGroupEntry[]): Observable<any | SiteGroupEntry>[] {
        return groups.map((member: SiteGroupEntry) => {
            const siteMembership = {
                id: member.entry.id,
                role: member.entry.role
            };
            return this.sitesService.createSiteGroupMembership(site.id, siteMembership).pipe(
                catchError((error: Error) =>
                    of({
                        error,
                        errorCode: this.getErrorCode(error),
                        member
                    })
                )
            );
        });
    }

    private getErrorCode(error: Error): number {
        const errorJson = JSON.parse(error.message).error;
        return errorJson.statusCode;
    }

    isGroupEntry(memberEntry: SiteMemberEntry): boolean {
        return memberEntry instanceof SiteGroupEntry;
    }
}
