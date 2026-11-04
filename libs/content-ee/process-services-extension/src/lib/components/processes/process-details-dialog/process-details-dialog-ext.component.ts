/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ProcessInstanceRepresentation } from '@alfresco/js-api';
import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProcessDetailsExtComponent } from '../../../features/process-details/components/process-details/process-details-ext.component';

@Component({
    selector: 'aps-process-details-dialog-ext',
    standalone: true,
    imports: [CommonModule, MatDialogModule, TranslatePipe, MatButtonModule, MatIconModule, ProcessDetailsExtComponent],
    templateUrl: './process-details-dialog-ext.component.html',
    styleUrls: ['./process-details-dialog-ext.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ProcessDetailsDialogExtComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: ProcessInstanceRepresentation) {}
}
