/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, filter, switchMap, tap } from 'rxjs/operators';
import { DELETE_RECORD, DeleteRecordAction } from '../actions/record.action';
import { Node, NodePaging } from '@alfresco/js-api';
import { EMPTY, Observable, of } from 'rxjs';
import { RecordService } from '../services/record.service';
import { ReloadDocumentListService } from '../../core/services/reload-document-list.service';
import { NotificationService, TranslationService, ConfirmDialogComponent } from '@alfresco/adf-core';
import { MatDialog } from '@angular/material/dialog';
import { trimRecordId } from '../rules/record.evaluator';
import { ClosePreviewAction } from '@alfresco/aca-shared/store';
import { Store } from '@ngrx/store';

@Injectable()
export class DeleteRecordEffect {
    notificationDuration = 3000;
    private actions$ = inject(Actions);
    private recordService = inject(RecordService);
    private reloadService = inject(ReloadDocumentListService);
    private dialog = inject(MatDialog);
    private translationService = inject(TranslationService);
    private notificationService = inject(NotificationService);
    private store = inject(Store<any>);

    deleteRecord$ = createEffect(() => this.actions$.pipe(
        ofType<DeleteRecordAction>(DELETE_RECORD),
        concatMap((action) => {
            if (action.payload) {
                return this.deleteRecord(action.payload);
            }
            return EMPTY;
        })
    ), { dispatch: false });

    private deleteRecord(node: Node): Observable<NodePaging | Error> {
        const { name } = node;
        const deleteMessage = this.translationService.instant('GOVERNANCE.DELETE-RECORD.DIALOG.MESSAGE.DELETE', { name });
        const additionalMessage = this.translationService.instant('GOVERNANCE.DELETE-RECORD.DIALOG.MESSAGE.ADDITIONAL', { name });
        const dialogReference = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'GOVERNANCE.DELETE-RECORD.DIALOG.TITLE',
                htmlContent: ` <p> ${deleteMessage}</p>
                           <p> ${additionalMessage}</p>`,
                yesLabel: 'GOVERNANCE.DELETE-RECORD.DIALOG.YES',
                noLabel: 'GOVERNANCE.DELETE-RECORD.DIALOG.NO',
            },
            width: '50%',
        });

        return dialogReference.afterClosed().pipe(
            filter((result) => !!result),
            switchMap(() => this.recordService.hideRecord(node)),
            tap(() => {
                this.notificationService.openSnackMessage('GOVERNANCE.DELETE-RECORD.SUCCESS', this.notificationDuration, { name: trimRecordId(node) });
                this.store.dispatch(new ClosePreviewAction());
                this.reloadService.refreshDocumentList.next();
            }),
            catchError((err: Error) => {
                this.notificationService.openSnackMessage('GOVERNANCE.DELETE-RECORD.FAIL', this.notificationDuration, { recordId: node.id });
                return of(err);
            })
        );
    }
}
