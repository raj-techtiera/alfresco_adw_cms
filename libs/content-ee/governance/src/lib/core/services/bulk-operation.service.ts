/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { queueScheduler, Subject } from 'rxjs';
import { BulkOperationModel, OperationStatus } from '../model/bulk-operation.model';
import { debounceTime } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class BulkOperationService {
    private queue: BulkOperationModel[] = [];

    queuedOperations = new Subject<BulkOperationModel[]>();
    operationStarted = new Subject<BulkOperationModel>();
    operationCompleted = new Subject<BulkOperationModel>();

    addToQueue(nodes: BulkOperationModel[]) {
        nodes.map((operation: BulkOperationModel) => {
            this.showElementOnDialog(operation);
            queueScheduler.schedule(() => this.executeOperationInTheQueue(operation), 100);
        });
    }

    private showElementOnDialog(record: BulkOperationModel) {
        this.queue.push(record);
        this.queuedOperations.next(this.queue);
    }

    clearQueue() {
        this.queue = [];
        this.queuedOperations.next(this.queue);
    }

    private executeOperationInTheQueue(operation: BulkOperationModel) {
        if (operation.status === OperationStatus.Pending) {
            operation.status = OperationStatus.Starting;
            this.operationStarted.next(operation);
            operation.api.pipe(debounceTime(100)).subscribe(
                (response) => {
                    this.getSuccessOperationStatus(operation, response);
                    this.operationCompleted.next(operation);
                },
                () => {
                    this.getFailedOperationStatus(operation);
                    this.operationCompleted.next(operation);
                }
            );
        }
    }

    private getSuccessOperationStatus(file: BulkOperationModel, response: any): BulkOperationModel {
        if (file.successHandler) {
            const { message, status, icon } = file.successHandler(file.node, response);
            file.message = message;
            file.status = status;
            file.icon = icon;
        } else {
            file.message = '';
            file.status = OperationStatus.Complete;
        }
        return file;
    }

    private getFailedOperationStatus(file: BulkOperationModel): BulkOperationModel {
        if (file.errorHandler) {
            const { message, status } = file.errorHandler();
            file.message = message;
            file.status = status;
        } else {
            file.message = 'GOVERNANCE.BULK-OPERATION.FAIL';
            file.status = OperationStatus.Error;
        }
        return file;
    }
}
