/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { DialogComponent, DialogData, DialogSize } from '@alfresco/adf-core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ManageHoldsComponent } from '../components/manage-holds/manage-holds.component';
import { HoldBody } from '@alfresco/js-api';
import { BulkHoldsWarningComponent } from '../components/bulk-holds-warning/bulk-holds-warning.component';
import { OperationMode } from '../../../model/bulk-operation.model';
import { ExistingHoldDataToConfirm } from '../model/existing-hold-data-to-confirm.model';

@Injectable({
    providedIn: 'root'
})
export class ManageHoldsDialogService {
    readonly isConfirmButtonDisabled$ = new BehaviorSubject(true);
    readonly selectedTabIndex$ = new BehaviorSubject<number>(0);
    readonly dataToConfirm$ = new Subject<ExistingHoldDataToConfirm | HoldBody>();
    readonly allowedToAddToHold$ = new Subject<boolean>();

    constructor(private readonly dialog: MatDialog) {}

    openDialog(operationMode: OperationMode, nodeId?: string): MatDialogRef<DialogComponent, DialogData> {
        return this.dialog.open(DialogComponent, {
            data: {
                title: 'GOVERNANCE.MANAGE_HOLDS.DIALOG_TITLE',
                confirmButtonTitle: 'GOVERNANCE.MANAGE_HOLDS.SAVE',
                isConfirmButtonDisabled$: this.isConfirmButtonDisabled$,
                dialogSize: DialogSize.Large,
                contentComponent: ManageHoldsComponent,
                componentData: {
                    nodeId,
                    operationMode,
                    checkNodeExistence: operationMode === OperationMode.SINGLE || arguments.length > 1
                }
            },
            width: '600px'
        });
    }

    openWarningDialog(): MatDialogRef<DialogComponent, DialogData> {
        return this.dialog.open(DialogComponent, {
            data: {
                title: 'GOVERNANCE.MANAGE_HOLDS.WARNING_DIALOG_TITLE',
                confirmButtonTitle: 'COMMON.CONTINUE',
                dialogSize: DialogSize.Medium,
                contentComponent: BulkHoldsWarningComponent
            }
        });
    }
}
