/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogClose, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { TaskCommentsComponent } from '@alfresco/adf-process-services';

export interface AddTaskCommentDialogData {
    id: string;
    taskName: string;
}

@Component({
    standalone: true,
    imports: [TranslatePipe, MatDialogTitle, MatDialogActions, MatButton, MatDialogClose, MatDialogContent, TaskCommentsComponent],
    selector: 'acs-add-task-comment-dialog',
    templateUrl: './add-task-comment-dialog.component.html',
    encapsulation: ViewEncapsulation.None
})
export class AddTaskCommentDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: AddTaskCommentDialogData) {}
}
