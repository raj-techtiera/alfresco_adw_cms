/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { MemberRoleType } from '../../../models/member-role.model';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SiteMembershipType } from '../add-member-dialog/site-member-collection';

@Component({
    standalone: true,
    imports: [CommonModule, TranslatePipe, MatFormFieldModule, MatSelectModule],
    selector: 'adw-role-selector',
    templateUrl: './role-selector.component.html',
    styleUrls: ['./role-selector.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class RoleSelectorComponent implements OnInit {
    @Input()
    value: string;

    @Input()
    disabled = false;

    @Input()
    placeholder: string;

    /** Target type for role selector. Can be set to 'user' or 'group'*/
    @Input()
    targetType = SiteMembershipType.USER;

    @Output()
    memberRoleChanged: EventEmitter<string> = new EventEmitter<string>();

    roles = [
        {
            role: MemberRoleType.SiteManager,
            label: 'ROLES.SITE_MANAGER'
        },
        {
            role: MemberRoleType.SiteContributor,
            label: 'ROLES.SITE_CONTRIBUTOR'
        },
        {
            role: MemberRoleType.SiteConsumer,
            label: 'ROLES.SITE_CONSUMER'
        },
        {
            role: MemberRoleType.SiteCollaborator,
            label: 'ROLES.SITE_COLLABORATOR'
        }
    ];

    ngOnInit() {
        if (this.placeholder === undefined) {
            this.placeholder = this.targetType === SiteMembershipType.GROUP ? 'ROLE_SELECTOR.GROUP_SELECTOR' : 'ROLE_SELECTOR.USER_SELECTOR';
        }
    }

    onMemberRoleChanged(newRole: string) {
        this.value = newRole;
        this.memberRoleChanged.emit(newRole);
    }
}
