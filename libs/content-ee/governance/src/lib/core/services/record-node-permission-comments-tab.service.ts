/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { ExternalNodePermissionCommentsTabService } from '@alfresco/aca-content';
import { isRecord } from '../../record/rules/record.evaluator';
import { Node } from '@alfresco/js-api';

@Injectable()
export class RecordNodePermissionCommentsTabService extends ExternalNodePermissionCommentsTabService {
    canAddComments(node: Node): boolean {
        return !isRecord({entry: node});
    }
}
