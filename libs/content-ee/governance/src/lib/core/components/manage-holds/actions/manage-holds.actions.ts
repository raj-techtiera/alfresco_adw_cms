/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Action } from '@ngrx/store';
import { Node, NodeChildAssociationEntry, NodeEntry } from '@alfresco/js-api';
import { ModalConfiguration } from '@alfresco/aca-shared/store';

export const MANAGE_HOLDS = 'MANAGE_HOLDS';
export const MANAGE_SINGLE_HOLDS = 'MANAGE_SINGLE_HOLDS';
export const MANAGE_BULK_HOLDS_TO_FOLDER = 'MANAGE_BULK_HOLDS_TO_FOLDER';
export const MANAGE_BULK_HOLDS_TO_FILES = 'MANAGE_BULK_HOLDS_TO_FILES';
export const BULK_HOLDS_WARNING = 'BULK_HOLDS_WARNING';
export const DELETE_HOLD = 'DELETE_HOLD';
export const REMOVE_FROM_HOLD = 'REMOVE_FROM_HOLD';

export class ManageHoldsAction implements Action {
    readonly type = MANAGE_HOLDS;

    constructor(public payload: Node, public configuration?: ModalConfiguration) {}
}

export class ManageSingleHoldsAction implements Action {
    readonly type = MANAGE_SINGLE_HOLDS;

    constructor(public payload: Node, public configuration?: ModalConfiguration) {}
}

export class ManageBulkHoldsToFolderAction implements Action {
    readonly type = MANAGE_BULK_HOLDS_TO_FOLDER;

    constructor(public folderId: string, public configuration?: ModalConfiguration) {}
}

export class ManageBulkHoldsToFilesAction implements Action {
    readonly type = MANAGE_BULK_HOLDS_TO_FILES;

    constructor(public configuration?: ModalConfiguration) {}
}

export class BulkHoldsWarningAction implements Action {
    readonly type = BULK_HOLDS_WARNING;

    constructor(public configuration?: ModalConfiguration) {}
}

export class DeleteHoldAction implements Action {
    readonly type = DELETE_HOLD;

    constructor(public payload: NodeEntry[] = []) {}
}

export class RemoveFromHoldAction implements Action {
    readonly type = REMOVE_FROM_HOLD;

    constructor(public payload: NodeChildAssociationEntry[] = []) {}
}
