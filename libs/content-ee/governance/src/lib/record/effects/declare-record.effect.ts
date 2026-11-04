/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, filter, map, switchMap } from 'rxjs/operators';
import { DECLARE_RECORD_ACTION, DeclareRecordAction } from '../actions/record.action';
import { RecordService } from '../services/record.service';
import { NotificationService, ConfirmDialogComponent } from '@alfresco/adf-core';
import { ReloadDocumentListService } from '../../core/services/reload-document-list.service';
import { Node, NodeEntry } from '@alfresco/js-api';
import { isNodeHavingProp } from '../../core/rules/node.evaluator';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DeclareRecord } from '../models/declare-record.model';
import { BulkRecordService } from '../services/bulk-declare-record.service';
import { Store } from '@ngrx/store';
import { SetSelectedNodesAction } from '@alfresco/aca-shared/store';
import { ContentApiService } from '@alfresco/aca-shared';

@Injectable()
export class DeclareRecordEffects {
    notificationDuration = 3000;
    private actions$ = inject(Actions);
    private recordService = inject(RecordService);
    private reloadService = inject(ReloadDocumentListService);
    private dialog = inject(MatDialog);
    private notificationService = inject(NotificationService);
    private declareRecordService = inject(BulkRecordService);
    private store = inject(Store<any>);
    private contentApiService = inject(ContentApiService);

    declareRecord$ = createEffect(() => this.actions$.pipe(
        ofType<DeclareRecordAction>(DECLARE_RECORD_ACTION),
        map((action) => {
            const nodes = action.payload;
            if (this.isBulkDeclaration(nodes)) {
                this.declareRecordService.declareBulkRecords(nodes);
            } else {
                return this.declareSingleRecord(nodes[0]);
            }
        })
    ), { dispatch: false });

    private isBulkDeclaration(nodes: NodeEntry[]) {
        return nodes.length > 1;
    }

    private isRejectedRecord(node: NodeEntry) {
        return isNodeHavingProp(node, 'aspectNames', 'rma:recordRejectionDetails', 'array');
    }

    declareSingleRecord(node: NodeEntry) {
        this.recordService.declaredSingleRecord$.next(<DeclareRecord> node);
        const rejectedRecord = this.isRejectedRecord(node);
        if (rejectedRecord) {
            this.removeRejectedWarning(node.entry);
        } else {
            this.declareRecord(node.entry);
        }
    }

    private declareRecord(node: Node) {
        const { name: fileName } = node;
        this.recordService
            .declareNodeRecord(node)
            .pipe(switchMap((record) => this.contentApiService.getNode(record.entry.id)))
            .subscribe(
                (recordNode) => {
                    this.notificationService.openSnackMessage('GOVERNANCE.DECLARE-RECORD.SUCCESS', this.notificationDuration, { fileName });
                    this.reloadService.refreshDocumentList.next();
                    this.store.dispatch(new SetSelectedNodesAction([recordNode]));
                },
                () => {
                    const failedRecord = <DeclareRecord> {
                        ...{ entry: node },
                        status: 'failed',
                    };
                    this.recordService.declaredSingleRecord$.next(failedRecord);
                    this.notificationService.openSnackMessage('GOVERNANCE.DECLARE-RECORD.FAIL', this.notificationDuration, { fileName });
                }
            );
    }

    private removeRejectedWarning(node: Node) {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'GOVERNANCE.DECLARE-RECORD.DIALOG.TITLE',
                message: 'GOVERNANCE.DECLARE-RECORD.DIALOG.MESSAGE',
                yesLabel: 'GOVERNANCE.DECLARE-RECORD.DIALOG.YES',
                noLabel: 'GOVERNANCE.DECLARE-RECORD.DIALOG.NO',
            },
        });

        dialogRef
            .afterClosed()
            .pipe(
                filter((result) => !!result),
                switchMap(() => this.recordService.removeNodeRejectedWarning(node)),
                catchError(() => {
                    this.notificationService.openSnackMessage('GOVERNANCE.REJECTED-INFO-RECORD.FAILED-REMOVE', this.notificationDuration);
                    return of(false);
                }),
                filter((valid) => !!valid)
            )
            .subscribe(() => this.declareRecord(node));
    }
}
