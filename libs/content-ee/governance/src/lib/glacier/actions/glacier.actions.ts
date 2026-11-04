/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Node, NodeEntry } from '@alfresco/js-api';

export const GLACIER_STORE_ACTION = 'GLACIER_STORE_ACTION';
export const GLACIER_RESTORE_ACTION = 'GLACIER_RESTORE_ACTION';
export const GLACIER_EXTEND_RESTORE_ACTION = 'GLACIER_EXTEND_RESTORE_ACTION';

export class GlacierStoreAction {
    readonly type = GLACIER_STORE_ACTION;
    constructor(public payload: NodeEntry[]) {}
}

export class GlacierRestoreAction {
    readonly type = GLACIER_RESTORE_ACTION;
    constructor(public payload: NodeEntry[]) {}
}

export class GlacierExtendRestoreAction {
    readonly type = GLACIER_EXTEND_RESTORE_ACTION;
    constructor(public payload: Node) {}
}
