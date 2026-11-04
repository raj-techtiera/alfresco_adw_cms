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
import { isFile, isLocked, isFolder } from '../../core/rules/node.evaluator';
import { isPendingRestore, isRestored, isStoredInGlacier } from '../rules/glacier-evaluator';
import { Observable, of } from 'rxjs';
import { GlacierService } from './glacier.service';
import { AllowableOperationsEnum, ContentService } from '@alfresco/adf-content-services';

@Injectable({
    providedIn: 'root',
})
export class BulkStoreService {
    constructor(private bulkOperationDialogService: BulkOperationDialogService, private glacierService: GlacierService, private contentService: ContentService) {}

    storeBulkNodes(nodes: NodeEntry[]) {
        const bulkNodes = this.getBulkNodes(nodes);
        this.bulkOperationDialogService.declareBulkRecords(bulkNodes);
    }

    successHandler(node: NodeEntry): { status: OperationStatus; message: string; icon: OperationIcon } {
        let status = OperationStatus.Complete,
            message = '';
        const icon: OperationIcon = { name: 'store', isSvg: true };
        if (isStoredInGlacier(node)) {
            message = 'GOVERNANCE.GLACIER.STORE.BULK-OPERATION.ERRORS.EXISTING-STORED-NODE';
            status = OperationStatus.Complete;
        } else if (isPendingRestore(node)) {
            message = 'GOVERNANCE.GLACIER.STORE.BULK-OPERATION.ERRORS.PENDING-RESTORE';
            status = OperationStatus.Complete;
            icon.name = 'autorenew';
            icon.isSvg = false;
        } else if (isRestored(node)) {
            message = 'GOVERNANCE.GLACIER.STORE.BULK-OPERATION.ERRORS.RESTORED';
            status = OperationStatus.Complete;
        } else if (isFolder(node)) {
            message = 'GOVERNANCE.GLACIER.STORE.BULK-OPERATION.ERRORS.FOLDER';
            status = OperationStatus.Error;
        } else {
            icon.name = '';
            message = 'GOVERNANCE.GLACIER.STORE.BULK-OPERATION.SUCCESS';
        }
        return { status, message, icon };
    }

    errorHandler(): { status: OperationStatus; message: string } {
        const status = OperationStatus.Error,
            message = 'GOVERNANCE.GLACIER.STORE.BULK-OPERATION.FAIL';
        return { status, message };
    }

    private getBulkNodes(nodes: NodeEntry[]): BulkOperationModel[] {
        return nodes.map((node: NodeEntry) => new BulkOperationModel({
            node,
            api: this.getStoreAPIOfNode(node),
            successHandler: this.successHandler.bind(this),
            errorHandler: this.errorHandler.bind(this),
        }));
    }

    private getStoreAPIOfNode(node: NodeEntry): Observable<any> {
        if (this.canStoreNode(node)) {
            return this.glacierService.storeRecord(node.entry);
        }
        return of(node);
    }

    private canStoreNode(node: NodeEntry): boolean {
        return (
            !isStoredInGlacier(node) &&
            !isPendingRestore(node) &&
            !isRestored(node) &&
            !isLocked(node) &&
            isFile(node) &&
            this.contentService.hasAllowableOperations(node.entry, AllowableOperationsEnum.UPDATE)
        );
    }
}
