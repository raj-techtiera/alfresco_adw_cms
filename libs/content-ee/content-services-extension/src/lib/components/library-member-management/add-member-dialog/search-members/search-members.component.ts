/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, EventEmitter, Output, ViewEncapsulation } from '@angular/core';
import { NodeEntry, SiteGroupEntry, SiteMemberEntry } from '@alfresco/js-api';
import { PermissionManagerModule, SEARCH_QUERY_TOKEN } from '@alfresco/adf-content-services';
import { SearchQueryFactory } from './search-query.factory';
import { CommonModule } from '@angular/common';
import { SiteMembershipType } from '../site-member-collection';

@Component({
    standalone: true,
    imports: [CommonModule, PermissionManagerModule],
    selector: 'adw-search-members',
    templateUrl: './search-members.component.html',
    providers: [SearchQueryFactory, { provide: SEARCH_QUERY_TOKEN, useClass: SearchQueryFactory }],
    encapsulation: ViewEncapsulation.None
})
export class SearchMembersComponent {
    @Output()
    selectMembers: EventEmitter<any> = new EventEmitter();

    currentSelection: NodeEntry[] = [];

    onSelect(items: NodeEntry[]) {
        if (Array.isArray(items)) {
            this.currentSelection = items;
        }
    }

    onAddClicked() {
        const users = this.currentSelection
            .filter((item) => item.entry.nodeType === 'cm:person')
            .map((user) => ({
                type: SiteMembershipType.USER,
                entry: {
                    ...user.entry,
                    id: user.entry.properties['cm:userName'],
                    person: {
                        firstName: user.entry.properties['cm:firstName'],
                        lastName: user.entry.properties['cm:lastName'],
                        email: user.entry.properties['cm:email'],
                        id: user.entry.properties['cm:userName']
                    }
                }
            }))
            .map((user: any) => new SiteMemberEntry(user));

        const groups = this.currentSelection
            .filter((item) => item.entry.nodeType === 'cm:authorityContainer')
            .map((user) => ({
                type: SiteMembershipType.GROUP,
                entry: {
                    ...user.entry,
                    id: user.entry.properties['cm:authorityName'],
                    group: {
                        displayName: user.entry.properties['cm:authorityDisplayName'],
                        id: user.entry.properties['cm:authorityName']
                    }
                }
            }))
            .map((group: any) => new SiteGroupEntry(group));
        this.selectMembers.emit({ users, groups });
    }
}
