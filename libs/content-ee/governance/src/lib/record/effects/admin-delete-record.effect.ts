/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap, catchError, concatMap } from 'rxjs/operators';
import { ADMIN_DELETE_RECORD, AdminDeleteRecord } from '../actions/record.action';
import { RecordService } from '../services/record.service';
import { ReloadDocumentListService } from '../../core/services/reload-document-list.service';
import { of } from 'rxjs';
import { NotificationService } from '@alfresco/adf-core';

@Injectable()
export class AdminDeleteRecordEffect {
    notificationDuration = 3000;

    private recordService = inject(RecordService);
    private actions$ = inject(Actions);
    private reloadService = inject(ReloadDocumentListService);
    private notificationService = inject(NotificationService);


    recordDialogue$ = createEffect(() => this.actions$.pipe(
        ofType<AdminDeleteRecord>(ADMIN_DELETE_RECORD),
        concatMap((action) => this.recordService.deleteRecord(action.payload).pipe(
            tap(() => {
                this.notificationService.openSnackMessage('GOVERNANCE.DELETE-RECORD.SUCCESS', this.notificationDuration);
                this.reloadService.emitReloadEffect();
            }),
            catchError((error) => {
                this.notificationService.openSnackMessage('GOVERNANCE.DELETE-RECORD.FAIL', this.notificationDuration);
                return of(error);
            })
        ))
    ), { dispatch: false });
}
