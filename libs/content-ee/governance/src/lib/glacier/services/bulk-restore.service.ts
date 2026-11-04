/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { NodeEntry } from '@alfresco/js-api';
import { BulkOperationModel, OperationStatus, OperationIcon } from '../../core/model/bulk-operation.model';
import { BulkOperationDialogService } from '../../core/services/bulk-operation-dialog.service';
import { isFile, isFolder } from '../../core/rules/node.evaluator';
import { isPendingRestore, isRestored, isStoredInGlacier } from '../rules/glacier-evaluator';
import { Observable, of } from 'rxjs';
import { GlacierService } from './glacier.service';
import { AllowableOperationsEnum, ContentService } from '@alfresco/adf-content-services';

@Injectable({
    providedIn: 'root',
})
export class BulkRestoreService {
    constructor(private bulkOperationDialogService: BulkOperationDialogService, private glacierService: GlacierService, private contentService: ContentService) {}

    storeBulkNodes(nodes: NodeEntry[], type: string, days: string | number) {
        const bulkNodes = this.getBulkNodes(nodes, type, days);
        this.bulkOperationDialogService.declareBulkRecords(bulkNodes);
    }

    successHandler(node: NodeEntry, response: boolean): { status: OperationStatus; message: string; icon: OperationIcon } {
        let status = OperationStatus.Complete,
            message = '';
        const icon: OperationIcon = { name: 'restore', isSvg: true };
        if (isRestored(node)) {
            message = 'GOVERNANCE.GLACIER.RESTORE.BULK-OPERATION.ERRORS.RESTORED';
            status = OperationStatus.Complete;
        } else if (isPendingRestore(node)) {
            message = 'GOVERNANCE.GLACIER.RESTORE.BULK-OPERATION.ERRORS.PENDING-RESTORE';
            status = OperationStatus.Complete;
            icon.name = 'autorenew';
            icon.isSvg = false;
        } else if (isFolder(node)) {
            message = 'GOVERNANCE.GLACIER.RESTORE.BULK-OPERATION.ERRORS.FOLDER';
            status = OperationStatus.Error;
        } else if (!isStoredInGlacier(node) || !response) {
            message = 'GOVERNANCE.GLACIER.RESTORE.BULK-OPERATION.ERRORS.NOT-STORED';
            status = OperationStatus.Error;
        } else if (response) {
            icon.name = '';
            message = 'GOVERNANCE.GLACIER.RESTORE.BULK-OPERATION.SUCCESS';
        }

        return { status, message, icon };
    }

    errorHandler(): { status: OperationStatus; message: string } {
        const status = OperationStatus.Error,
            message = 'GOVERNANCE.GLACIER.RESTORE.BULK-OPERATION.ERRORS.FAIL';
        return { status, message };
    }

    private getBulkNodes(nodes: NodeEntry[], type, days): BulkOperationModel[] {
        return nodes.map((node: NodeEntry) => new BulkOperationModel({
            node,
            api: this.getRestoreApi(node, type, days),
            successHandler: this.successHandler.bind(this),
            errorHandler: this.errorHandler.bind(this),
        }));
    }

    private getRestoreApi(node: NodeEntry, type, days): Observable<any> {
        if (this.canRestoreNode(node)) {
            return this.glacierService.restoreRecord(node.entry, type, days);
        }
        return of(node);
    }

    private canRestoreNode(node: NodeEntry): boolean {
        return isStoredInGlacier(node) && isFile(node) && this.contentService.hasAllowableOperations(node.entry, AllowableOperationsEnum.UPDATE);
    }
}
