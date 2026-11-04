/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Group, GroupEntry, GroupMember, SiteGroup, SiteGroupPaging } from '@alfresco/js-api';

export const groupEntriesMock: GroupEntry[] = [
    {
        entry: {
            id: 'mock-group_1',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_2',
        } as Group,
    },
];

export const longGroupEntriesMock: GroupEntry[] = [
    {
        entry: {
            id: 'mock-group_1',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_2',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_3',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_4',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_5',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_6',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_7',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_8',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_9',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_10',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_11',
        } as Group,
    },
    {
        entry: {
            id: 'mock-group_12',
        } as Group,
    },
];

export const siteGroupsMock: SiteGroupPaging = {
    list: {
        entries: [
            {
                entry: {
                    id: 'mock-group_1',
                    role: 'SiteCollaborator',
                    group: {
                        displayName: 'Group 1',
                    } as GroupMember,
                } as SiteGroup,
            },
            {
                entry: {
                    id: 'mock-group_2',
                    role: 'SiteCollaborator',
                    group: {
                        displayName: 'Group 1',
                    } as GroupMember,
                } as SiteGroup,
            },
        ],
        pagination: {},
    },
};
