/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Action } from '@ngrx/store';
import { SiteEntry, Person } from '@alfresco/js-api';
import { ModalConfiguration } from '@alfresco/aca-shared/store';

export const ADD_MEMBER = 'ADD_MEMBER';
export const NOTIFICATIONS_RELOAD = 'NOTIFICATIONS_RELOAD';
export class AddMemberAction implements Action {
    readonly type = ADD_MEMBER;
    constructor(public payload: SiteEntry, public members?: Person[], public configuration?: ModalConfiguration) {}
}

export const MANAGE_MEMBERS = 'MANAGE_MEMBERS';
export class ManageMembersAction implements Action {
    readonly type = MANAGE_MEMBERS;
    constructor(public payload: SiteEntry) {}
}
export class NotificationsReloadAction implements Action {
    readonly type = NOTIFICATIONS_RELOAD;
}
