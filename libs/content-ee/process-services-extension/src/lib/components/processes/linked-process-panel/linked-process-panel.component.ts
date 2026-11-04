/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Node, ProcessInstanceRepresentation } from '@alfresco/js-api';
import { Component, DestroyRef, inject, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProcessInstanceService } from '../../../services/process-instance.service';
import { ProcessDetailsDialogExtComponent } from '../process-details-dialog/process-details-dialog-ext.component';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'aps-linked-process-panel',
    standalone: true,
    imports: [CommonModule, TranslatePipe, MatButtonModule, MatProgressSpinnerModule],
    templateUrl: './linked-process-panel.component.html',
    styleUrls: ['./linked-process-panel.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'aps-linked-process-panel'
    }
})
export class LinkedProcessPanelComponent implements OnInit {
    @Input()
    data: { node: Node };

    runningProcesses: ProcessInstanceRepresentation[] = [];
    isLoading = true;

    private readonly destroyRef = inject(DestroyRef);

    constructor(private processInstanceService: ProcessInstanceService, private dialog: MatDialog) {}

    ngOnInit() {
        this.processInstanceService
            .getRunningProcessesDetails(this.data.node)
            .pipe(
                catchError(() => {
                    this.isLoading = false;
                    return of({ data: [] });
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((processesDetails) => {
                this.runningProcesses = processesDetails.data;
                this.isLoading = false;
            });
    }

    openProcessDetailsDialog(process: ProcessInstanceRepresentation): void {
        this.dialog.open(ProcessDetailsDialogExtComponent, {
            height: '66%',
            minHeight: 300,
            data: process,
            panelClass: 'adw-process-details-dialog'
        });
    }
}
