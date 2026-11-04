/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, switchMap, tap, catchError, mergeMap } from 'rxjs/operators';
import { ReloadDocumentListService } from '../../core/services/reload-document-list.service';
import { RecordService } from '../services/record.service';
import { REMOVE_REJECTED_WARNING_ACTION, RemoveRejectedWarningAction } from '../actions/record.action';
import { EMPTY, Observable, of } from 'rxjs';
import { NotificationService, ConfirmDialogComponent } from '@alfresco/adf-core';

@Injectable()
export class RejectRecordEffect {
    notificationDuration = 3000;
    private actions$ = inject(Actions);
    private recordService = inject(RecordService);
    private dialog = inject(MatDialog);
    private reloadService = inject(ReloadDocumentListService);
    private notificationService = inject(NotificationService);

    removeRejectedWarning$ = createEffect(() => this.actions$.pipe(
        ofType<RemoveRejectedWarningAction>(REMOVE_REJECTED_WARNING_ACTION),
        mergeMap((action) => {
            if (action.payload) {
                return this.openRejectedDialog().pipe(
                    filter((result) => !!result),
                    switchMap(() => this.recordService.removeNodeRejectedWarning(action.payload.entry)),
                    tap(() => this.reloadService.emitReloadEffect()),
                    catchError((error: Error) => {
                        this.notificationService.openSnackMessage('GOVERNANCE.REJECTED-INFO-RECORD.FAILED-REMOVE',
                            this.notificationDuration, {
                            nodeName: action.payload.entry.name,
                            errorMessage: error,
                        });
                        return of(error);
                    })
                );
            }
            return EMPTY;
        })
    ), { dispatch: false });

    private openRejectedDialog(): Observable<any> {
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'GOVERNANCE.REJECTED-INFO-RECORD.CONFIRM',
                message: 'GOVERNANCE.REJECTED-INFO-RECORD.WARNING',
            },
            minWidth: '250px',
        });

        return dialogRef.afterClosed();
    }
}
