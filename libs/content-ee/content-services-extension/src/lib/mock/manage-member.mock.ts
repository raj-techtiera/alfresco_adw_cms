/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NodeEntry, SiteGroupPaging, SiteMember, SiteMemberPaging } from '@alfresco/js-api';
import { SiteMemberships } from '../models/types';
import { SiteMembershipType } from '../components/library-member-management/add-member-dialog/site-member-collection';

export const mockSite = {
    entry: {
        role: 'SiteManager',
        visibility: 'PUBLIC',
        guid: '82054409-5cea-4dcf-a0fa-401f57d1a37b',
        id: 'mock-site',
        preset: 'site-dashboard',
        title: 'mock-site'
    }
};

export const mockListSiteMemberships: SiteMemberPaging = {
    list: {
        pagination: { count: 3, hasMoreItems: false, skipCount: 0, maxItems: 25, totalItems: 3 },
        entries: [{
            entry: {
                role: 'SiteManager',
                person: {
                    firstName: 'one',
                    lastName: 'user',
                    id: 'one',
                    enabled: true,
                    email: 'one@alfresco.com'
                },
                id: 'one'
            } as SiteMember
        }, {
            entry: {
                role: 'SiteManager',
                person: {
                    firstName: 'two',
                    lastName: 'user',
                    enabled: true,
                    id: 'two',
                    email: 'two@alfresco.com'
                },
                id: 'two',
                isMemberOfGroup: false
            } as SiteMember
        }, {
            entry: {
                role: 'SiteManager',
                person: {
                    firstName: 'three',
                    lastName: 'user',
                    enabled: true,
                    id: 'three',
                    email: 'three@alfresco.com'
                },
                id: 'three',
                isMemberOfGroup: true
            } as SiteMember
        }]
    }
} as SiteMemberPaging;

export const mockSiteMemberOne = {
    type: SiteMembershipType.USER,
    entry: {
        id: 'selectedUserId',
        person: {
            id: 'selectedUserName',
            firstName: 'firstName',
            enabled: true,
            email: 'email'
        },
        role: 'SiteCollaborator',
        isMemberOfGroup: false
    }
} as SiteMemberships;

export const mockSiteMemberTwo = {
    entry: {
        id: 'selectedUserId - 2',
        person: {
            id: 'otherSelectedUserName',
            email: 'email'
        }
    }
} as SiteMemberships;

export const mockSiteMemberThree = {
    entry: {
        id: 'hrUser',
        person: {
            id: 'hrUser',
            email: 'hruser@gmail.com'
        }
    }
} as SiteMemberships;

export const mockSearchUser = {
    entry: {
        id: 'id',
        nodeType: 'cm:person',
        properties: {
            'cm:userName': 'id',
            'cm:firstName': 'mock first name',
            'cm:lastName': 'mock last name',
            'cm:email': 'mock@email.com'
        }
    }
} as NodeEntry;

export const mockSearchGroup = {
    entry: {
        id: 'mock id',
        nodeType: 'cm:authorityContainer',
        properties: {
            'cm:authorityDisplayName': 'mock authority',
            'cm:authorityName': 'mock id'
        }
    }
} as NodeEntry;

export const mockEmptySiteMember = {
    relations: {
        members: {
            list: {
                entries: []
            }
        }
    }
};

export const mockEmptySiteGroups = {
    list: {
        entries: [],
        pagination: {}
    }
};

export const mockGroups: SiteGroupPaging = {
    list: {
        pagination: { count: 4, hasMoreItems: false, totalItems: 4, skipCount: 0, maxItems: 25 },
        entries: [{
            entry: {
                role: 'SiteContributor',
                id: 'GROUP_0E0V6C',
                group: { displayName: '0E0V6C', id: 'GROUP_0E0V6C' }
            }
        }, {
            entry: {
                role: 'SiteContributor',
                id: 'GROUP_three',
                group: { displayName: 'three', id: 'GROUP_three' }
            }
        }, {
            entry: {
                role: 'SiteContributor',
                id: 'GROUP_AR0o0z',
                group: { displayName: 'AR0o0z', id: 'GROUP_AR0o0z' }
            }
        }, {
            entry: {
                role: 'SiteContributor',
                id: 'GROUP_0yE6qr',
                group: { displayName: '0yE6qr', id: 'GROUP_0yE6qr' }
            }
        }]
    }
} as SiteGroupPaging;

export const mockEmptyGroups: SiteGroupPaging = {
    list: {
        pagination: { count: 0, hasMoreItems: false, totalItems: 0, skipCount: 0, maxItems: 0 },
        entries: []
    }
} as SiteGroupPaging;

export const mockGroupsNext: SiteGroupPaging = {
    list: {
        pagination: { count: 3, hasMoreItems: false, totalItems: 3, skipCount: 0, maxItems: 25 },
        entries: [{
            entry: {
                role: 'SiteContributor',
                id: 'GROUP_three',
                group: { displayName: 'three', id: 'GROUP_three' }
            }
        }, {
            entry: {
                role: 'SiteContributor',
                id: 'GROUP_AR0o0z',
                group: { displayName: 'AR0o0z', id: 'GROUP_AR0o0z' }
            }
        }, {
            entry: {
                role: 'SiteContributor',
                id: 'GROUP_0yE6qr',
                group: { displayName: '0yE6qr', id: 'GROUP_0yE6qr' }
            }
        }]
    }
} as SiteGroupPaging;
