/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { SiteGroupEntry, SiteMemberEntry } from '@alfresco/js-api';
import { BehaviorSubject } from 'rxjs';

export enum SiteMembershipType {
    REQUEST = 'request',
    USER = 'user',
    GROUP = 'group'
}

export declare type SiteMemberships = SiteMemberEntry & SiteGroupEntry & {
    type: SiteMembershipType;
    readonly: boolean;
};

export interface Members {
    users: SiteMemberships[];
    groups: SiteMemberships[];
}

export class SiteMemberCollection {
    private members: SiteMemberships[] = [];
    private membersSubject = new BehaviorSubject<SiteMemberships[]>(this.members);

    members$ = this.membersSubject.asObservable();

    addMember(newMember: SiteMemberships | SiteMemberships[]) {
        this.members = this.members.concat(newMember);
        this.membersSubject.next(this.members);
    }

    getAll(): Array<SiteMemberships> {
        return this.members;
    }

    isDuplicateMember(newMember: SiteMemberships): SiteMemberships | undefined {
        return this.members.find((member) => member.entry.id === newMember.entry.id);
    }

    removeMember(memberId: string) {
        const member = this.members.findIndex((user) => user.entry.id === memberId);

        if (member !== -1) {
            this.members.splice(member, 1);
            this.members = [...this.members];
            this.membersSubject.next(this.members);
        }
    }

    updateAllRole(role: string) {
        this.members.filter((member) => !member.readonly).forEach((member) => (member.entry.role = role));
    }

    updateRole(id, role: string) {
        const user = this.members.find((member) => member.entry.id === id);
        if (user) {
            user.entry.role = role;
        }
    }

    isValid() {
        return this.members.filter((member) => !member.readonly).length && this.members.every((group) => group.entry.role);
    }
}
