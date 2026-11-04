/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppsProcessService, ProcessService } from '@alfresco/adf-process-services';
import { AppDefinitionRepresentation, ProcessDefinitionRepresentation } from '@alfresco/js-api';

import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ProcessListByCategoryComponent } from '../process-list-by-category/process-list-by-category.component';

export interface StartProcessDialogOnCloseData {
    process: ProcessDefinitionRepresentation;
    application: AppDefinitionRepresentation;
}

@Component({
    selector: 'aps-start-process-dialog',
    standalone: true,
    imports: [
        CommonModule,
        TranslatePipe,
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatFormFieldModule,
        MatSelectModule,
        ReactiveFormsModule,
        ProcessListByCategoryComponent
    ],
    templateUrl: './start-process-dialog.component.html',
    styleUrls: ['./start-process-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class StartProcessDialogComponent implements OnInit {
    constructor(
        private processService: ProcessService,
        private dialog: MatDialogRef<StartProcessDialogComponent, StartProcessDialogOnCloseData>,
        private appsProcessService: AppsProcessService
    ) {}

    loadingProcesses = false;
    showLoadingProcessesError = false;
    applications$: Observable<AppDefinitionRepresentation[]>;
    allProcesses$: Observable<ProcessDefinitionRepresentation[]> = of([]);
    selectApplicationControl = new UntypedFormControl({ value: null, disabled: true });

    ngOnInit(): void {
        this.applications$ = this.appsProcessService.getDeployedApplications().pipe(
            map(this.removeDefaultApplications),
            catchError(() => [])
        );

        this.selectApplicationControl.valueChanges.subscribe((selectedApplication) => {
            if (selectedApplication) {
                this.loadingProcesses = true;

                this.allProcesses$ = this.processService
                    .getProcessDefinitions(selectedApplication.id)
                    .pipe(tap(() => (this.loadingProcesses = false)));
            }
        });

        this.applications$.subscribe((applications) => {
            if (applications.length === 0) {
                this.showLoadingProcessesError = true;
            }

            if (applications.length > 0 && this.selectApplicationControl.disabled) {
                this.selectApplicationControl.enable();
            }

            if (applications.length === 1) {
                this.selectApplicationControl.setValue(applications[0]);
            }
        });
    }

    onSelectProcess(process: ProcessDefinitionRepresentation): void {
        this.dialog.close({
            process,
            application: this.selectApplicationControl.value
        });
    }

    selectApplicationComparator(application: AppDefinitionRepresentation, selectedApplication: AppDefinitionRepresentation | null): boolean {
        return application.id === selectedApplication?.id;
    }

    private removeDefaultApplications(appDefinitions: AppDefinitionRepresentation[]): AppDefinitionRepresentation[] {
        return appDefinitions.filter((application) => !!application.id);
    }
}
