/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NodeEntry } from '@alfresco/js-api';
import { Observable, of } from 'rxjs';

export enum OperationMode {
    BULK = 'bulk',
    SINGLE = 'single',
}

export enum OperationStatus {
    Pending = 0,
    Complete = 1,
    Starting = 2,
    Error = 3,
}

export interface OperationIcon {
    name: string;
    isSvg: boolean;
}

export class BulkOperationModel {
    node: NodeEntry;
    status: OperationStatus;
    message: string;
    api: Observable<any>;
    successHandler: (node: NodeEntry, response: any) => { status: OperationStatus; message: string; icon: OperationIcon };
    errorHandler: () => { status: OperationStatus; message: string };
    icon: OperationIcon;

    constructor(obj) {
        this.node = obj.node || null;
        this.message = obj.message || 'pending';
        this.status = obj.status || OperationStatus.Pending;
        this.api = obj.api || of();
        this.successHandler = obj.successHandler;
        this.errorHandler = obj.errorHandler;
        this.icon = obj.icon;
    }
}
