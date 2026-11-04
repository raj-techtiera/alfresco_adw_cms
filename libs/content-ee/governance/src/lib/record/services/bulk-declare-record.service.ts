/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { BulkOperationModel, OperationIcon, OperationStatus } from '../../core/model/bulk-operation.model';
import { BulkOperationDialogService } from '../../core/services/bulk-operation-dialog.service';
import { NodeEntry, RecordEntry } from '@alfresco/js-api';
import { isFolder, isLocked, isNodeHavingProp } from '../../core/rules/node.evaluator';
import { AllowableOperationsEnum, ContentService } from '@alfresco/adf-content-services';
import { Observable, of } from 'rxjs';
import { RecordService } from './record.service';
import { isRecord } from '../rules/record.evaluator';

@Injectable({
    providedIn: 'root',
})
export class BulkRecordService {
    constructor(private bulkOperationDialogService: BulkOperationDialogService, private recordService: RecordService, private contentService: ContentService) {}

    declareBulkRecords(nodes: NodeEntry[]) {
        const bulkNodes = this.getBulkNodes(nodes);
        this.bulkOperationDialogService.declareBulkRecords(bulkNodes);
    }

    successHandler(node: NodeEntry): { status: OperationStatus; message: string; icon: OperationIcon } {
        let status = OperationStatus.Complete,
            message = '';
        const icon: OperationIcon = { name: 'record', isSvg: true };
        if (isRecord(node)) {
            message = 'GOVERNANCE.DECLARE-RECORD.BULK-OPERATION.ERRORS.EXISTING-RECORD';
            status = OperationStatus.Complete;
        } else if (isFolder(node)) {
            message = 'GOVERNANCE.DECLARE-RECORD.BULK-OPERATION.ERRORS.FOLDER';
            status = OperationStatus.Error;
        } else {
            icon.name = '';
            message = 'GOVERNANCE.DECLARE-RECORD.BULK-OPERATION.SUCCESS';
        }
        return { status, message, icon };
    }

    errorHandler(): { status: OperationStatus; message: string } {
        const status = OperationStatus.Error,
            message = 'GOVERNANCE.DECLARE-RECORD.BULK-OPERATION.ERRORS.FAILED';
        return { status, message };
    }

    private getBulkNodes(nodes: NodeEntry[]): BulkOperationModel[] {
        return nodes.map((node: NodeEntry) => new BulkOperationModel({
            node,
            api: this.getRecordObservable(node),
            successHandler: this.successHandler.bind(this),
            errorHandler: this.errorHandler.bind(this),
        }));
    }

    private getRecordObservable(node: NodeEntry): Observable<RecordEntry | NodeEntry> {
        if (this.canDeclareNodeAsRecord(node)) {
            if (this.isRejectedRecord(node)) {
                return this.recordService.declareRejectedRecord(node.entry);
            }
            return this.recordService.declareNodeRecord(node.entry);
        }
        return of(node);
    }

    private canDeclareNodeAsRecord(node: NodeEntry): boolean {
        return node.entry.isFile && !isRecord(node) && !isLocked(node) && this.contentService.hasAllowableOperations(node.entry, AllowableOperationsEnum.UPDATE);
    }

    private isRejectedRecord(node: NodeEntry) {
        return isNodeHavingProp(node, 'aspectNames', 'rma:recordRejectionDetails', 'array');
    }
}
