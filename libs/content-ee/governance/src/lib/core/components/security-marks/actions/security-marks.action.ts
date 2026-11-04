/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Action } from '@ngrx/store';
import { Node } from '@alfresco/js-api';
import { ModalConfiguration } from '@alfresco/aca-shared/store';

export const MANAGE_SECURITY_MARK = 'MANAGE_SECURITY_MARK';

export class ManageSecurityMarksAction implements Action {
    readonly type = MANAGE_SECURITY_MARK;

    constructor(public payload: Node, public configuration?: ModalConfiguration) {}
}
