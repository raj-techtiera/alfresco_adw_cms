/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, concatMap, filter, mergeMap, tap } from 'rxjs/operators';
import { ReloadDocumentListService } from '../../core/services/reload-document-list.service';
import { GLACIER_STORE_ACTION, GlacierStoreAction } from '../actions/glacier.actions';
import { GlacierService } from '../services/glacier.service';
import { NotificationService, ConfirmDialogComponent } from '@alfresco/adf-core';
import { EMPTY, Observable, of } from 'rxjs';
import { NodeEntry } from '@alfresco/js-api';
import { BulkStoreService } from '../services/bulk-store.service';
import { MatDialog } from '@angular/material/dialog';

@Injectable()
export class GlacierStoreEffect {
    notificationDuration = 3000;

    private actions$ = inject(Actions);
    private glacierService = inject(GlacierService);
    private reloadService = inject(ReloadDocumentListService);
    private bulkStoreService = inject(BulkStoreService);
    private notificationService = inject(NotificationService);
    private dialog = inject(MatDialog);

    storeRecord$ = createEffect(() => this.actions$.pipe(
        ofType<GlacierStoreAction>(GLACIER_STORE_ACTION),
        mergeMap((action) => this.openStoreDialog().pipe(
            filter((response) => response),
            concatMap(() => {
                if (action.payload.length) {
                    if (this.isBulkProcess(action.payload)) {
                        this.bulkStoreService.storeBulkNodes(action.payload);
                        return of(true);
                    }
                    return this.storeSingleRecord(action.payload[0]);
                }
                return EMPTY;
            })
        ))
    ), { dispatch: false });

    private isBulkProcess(nodes: NodeEntry[]) {
        return nodes.length > 1;
    }

    private storeSingleRecord(node: NodeEntry): Observable<any> {
        const {
            entry: { name },
        } = node;
        return this.glacierService.storeRecord(node.entry).pipe(
            tap(() => {
                this.notificationService.openSnackMessage('GOVERNANCE.GLACIER.STORE.SUCCESS', this.notificationDuration, { name });
                this.reloadService.refreshDocumentList.next();
            }),
            catchError((error: Error) => {
                this.notificationService.openSnackMessage('GOVERNANCE.GLACIER.STORE.FAIL', this.notificationDuration, { name });
                return of(error);
            })
        );
    }

    private openStoreDialog(): Observable<boolean> {
        const dialogReference = this.dialog.open(ConfirmDialogComponent, {
            data: {
                title: 'GOVERNANCE.GLACIER.STORE.DIALOG.TITLE',
                message: 'GOVERNANCE.GLACIER.STORE.DIALOG.MESSAGE',
                yesLabel: 'GOVERNANCE.GLACIER.STORE.DIALOG.YES',
                noLabel: 'GOVERNANCE.GLACIER.STORE.DIALOG.NO',
            },
            width: '35%',
        });
        return dialogReference.afterClosed();
    }
}
