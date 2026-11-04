/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, OnChanges, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { SiteMemberEntry, SiteMemberPaging, SiteMembershipBodyUpdate } from '@alfresco/js-api';
import { NotificationService, PaginationComponent } from '@alfresco/adf-core';
import { SitesService } from '@alfresco/adf-content-services';
import { MemberRole } from '../../../models/member-role.model';
import { catchError, filter, switchMap, tap } from 'rxjs/operators';
import { MemberListComponent } from '../member-list/member-list.component';
import { ActionModel } from '../../../models/types';
import { CommonModule } from '@angular/common';
import { PaginationDirective } from '@alfresco/aca-shared';
import { LibraryMemberService } from '../services/library-member.service';
import { LibraryDialogService } from '../services/library-dialog.service';

@Component({
    standalone: true,
    imports: [CommonModule, PaginationDirective, MemberListComponent, PaginationComponent],
    selector: 'adw-users-list',
    templateUrl: './users-list.component.html',
    styleUrls: ['./users-list.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class UsersListComponent implements OnInit, OnChanges {
    @Input()
    siteId: string;

    @ViewChild(MemberListComponent, { static: true })
    memberListComponent: MemberListComponent;

    loading: Observable<boolean>;
    members: Observable<SiteMemberPaging>;
    performAction$ = new Subject();

    constructor(
        private sitesService: SitesService,
        private libraryMemberService: LibraryMemberService,
        private notificationService: NotificationService,
        private dialogService: LibraryDialogService
    ) {
        this.members = this.libraryMemberService.members.asObservable().pipe(
            tap(() => {
                this.memberListComponent.selectedRows = [];
            })
        );
        this.loading = this.libraryMemberService.loading.asObservable();
    }

    ngOnInit(): void {
        this.performAction$.subscribe((action: any) => {
            this.bulkDeleteMember(action['data'].entry.id);
        });
    }

    ngOnChanges(): void {
        if (this.siteId) {
            this.updateSiteMembers();
        }
    }

    updateSiteMembers() {
        this.libraryMemberService.loadMembers(this.siteId);
    }

    onMemberRoleChanged(memberRole: MemberRole) {
        const role = new SiteMembershipBodyUpdate({ role: memberRole.role });
        this.sitesService.updateSiteMembership(this.siteId, memberRole.memberId, role).subscribe(
            () => {
                const message = 'NOTIFICATIONS.USER_ROLE_UPDATED';
                this.notificationService.showInfo(message);
                this.updateSiteMembers();
                this.libraryMemberService.checkIfUserIsAffected(this.siteId, [memberRole.memberId]);
            },
            (error: Error) => {
                const errorCode = this.getErrorCode(error);
                let message = 'ERRORS.GENERIC';

                if (errorCode === 422) {
                    message = 'NOTIFICATIONS.MANAGER_REQUIRED';
                }

                this.notificationService.showError(message);
            }
        );
    }

    bulkDeleteMember(id?: string) {
        const selectedIds = this.memberListComponent.selectedRows.map((row) => row.entry.id);
        const users = id ? [id] : selectedIds;

        this.dialogService
            .openConfirmDialog()
            .pipe(
                filter(Boolean),
                switchMap(() => {
                    const requests = users.map((userId) =>
                        this.sitesService.deleteSiteMembership(this.siteId, userId).pipe(catchError(() => of(false)))
                    );
                    return forkJoin([...requests]);
                })
            )
            .subscribe((results) => {
                this.libraryMemberService.checkIfUserIsAffected(this.siteId, users);
                const total = results.length;
                const skipped = results.filter((result) => result === false).length;
                const success = total - skipped;
                if (total === skipped) {
                    this.notificationService.showError('NOTIFICATIONS.USER_REMOVE_FAILED');
                } else if (total === success) {
                    this.notificationService.showInfo('NOTIFICATIONS.USER_REMOVE_SUCCESS');
                    this.updateSiteMembers();
                } else {
                    const count = total - skipped;
                    this.notificationService.showInfo('NOTIFICATIONS.USER_REMOVE_PARTIAL_SUCCESS', null, { count, skipped });
                    this.updateSiteMembers();
                }
            });
    }

    onShowRowContextMenu(event) {
        event.value.actions = [...this.getActions(event.value.row['obj'])];
    }

    private getActions(siteMember: SiteMemberEntry): ActionModel[] {
        const actions = [];
        if (!siteMember.entry?.isMemberOfGroup) {
            actions.push({
                data: siteMember,
                model: {
                    title: 'Delete',
                    icon: 'delete',
                    visible: true
                },
                subject: this.performAction$
            });
        }

        return actions;
    }

    private getErrorCode(error: Error): number {
        const errorJson = JSON.parse(error.message).error;
        return errorJson.statusCode;
    }

    refresh() {
        this.memberListComponent.reloadMembers();
    }
}
