/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { EMPTY } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatMap } from 'rxjs/operators';
import { MANAGE_SECURITY_MARK, ManageSecurityMarksAction } from '../actions/security-marks.action';
import {
    SecurityMarksDialogComponent,
    SecurityMarksDialogData
} from '../components/security-marks-dialog/security-marks.dialog';
import { MatDialog } from '@angular/material/dialog';

@Injectable()
export class EditSecurityMarkEffect {

    private actions$ = inject(Actions);
    private dialog = inject(MatDialog);

    manageSecurityMarks$ = createEffect(() => this.actions$.pipe(
        ofType<ManageSecurityMarksAction>(MANAGE_SECURITY_MARK),
        concatMap((action) => {
            if (action?.payload) {
                this.dialog.open(SecurityMarksDialogComponent, {
                    data: {
                        title: 'GOVERNANCE.SECURITY_MARKS.DIALOG_TITLE',
                        nodeId: action.payload.id,
                        isMarksDialogEnabled: true,
                        isHelpDialogEnabled: false
                    } as SecurityMarksDialogData,
                    panelClass: 'adf-security-marks-manager-dialog-panel',
                    width: '600px',
                    height: '650px'
                }).afterClosed().subscribe(() => this.focusAfterClose(action?.configuration?.focusedElementOnCloseSelector));
            }
            return EMPTY;
        })
    ), { dispatch: false });

    private focusAfterClose(focusedElementSelector: string): void {
        if (focusedElementSelector) {
            document.querySelector<HTMLElement>(focusedElementSelector).focus();
        }
    }
}
