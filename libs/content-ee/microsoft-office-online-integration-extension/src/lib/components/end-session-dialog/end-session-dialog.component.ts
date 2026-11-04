/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NodeChildAssociationEntry } from '@alfresco/js-api';
import { Store } from '@ngrx/store';
import { AppStore } from '@alfresco/aca-shared/store';
import { CancelSessionOfficeAction, EndSessionOfficeAction } from '../../store/extension.actions';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatRadioModule } from '@angular/material/radio';
import { FormsModule } from '@angular/forms';
import { VersionUploadComponent } from '@alfresco/adf-content-services';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'ooi-end-session-dialog',
    standalone: true,
    imports: [CommonModule, TranslatePipe, MatDialogModule, MatRadioModule, FormsModule, VersionUploadComponent, MatButtonModule],
    templateUrl: './end-session-dialog.component.html',
    styleUrls: ['./end-session-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class EndSessionDialogComponent {
    node: NodeChildAssociationEntry;
    endingMethod = 'end';
    isMajorVersion = false;
    comment: string;

    constructor(@Inject(MAT_DIALOG_DATA) data: any, private dialogRef: MatDialogRef<EndSessionDialogComponent>, private store: Store<AppStore>) {
        this.node = data.node;
    }

    handleVersionChange(isMajor: boolean) {
        this.isMajorVersion = isMajor;
    }

    handleCommentChange(comment: string) {
        this.comment = comment;
    }

    submitSession() {
        if (this.endingMethod === 'end') {
            this.store.dispatch(new EndSessionOfficeAction({ node: this.node, isMajor: this.isMajorVersion, comment: this.comment }));
        } else {
            this.store.dispatch(new CancelSessionOfficeAction(this.node));
        }
        this.dialogRef.close();
    }
}
