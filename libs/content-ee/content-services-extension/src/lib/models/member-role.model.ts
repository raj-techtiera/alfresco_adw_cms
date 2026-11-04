/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export interface MemberRole {
    memberId: string;
    role: string;
}

export enum MemberRoleType {
    SiteCollaborator = 'SiteCollaborator',
    SiteConsumer = 'SiteConsumer',
    SiteContributor = 'SiteContributor',
    SiteManager = 'SiteManager',
}

export const ACS_ROLES = {
    [MemberRoleType.SiteManager]: 'Manager',
    [MemberRoleType.SiteContributor]: 'Contributor',
    [MemberRoleType.SiteConsumer]: 'Consumer',
    [MemberRoleType.SiteCollaborator]: 'Collaborator',
};
