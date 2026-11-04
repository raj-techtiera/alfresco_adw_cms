/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { SortByCategoryMapperService, ItemsByCategory } from '@alfresco/adf-core';
import { ProcessDefinitionRepresentation } from '@alfresco/js-api';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProcessListByCategoryItemComponent } from '../process-list-by-category-item/process-list-item.component';

const DEFAULT_CATEGORIES = ['', 'http://bpmn.io/schema/bpmn', 'http://www.activiti.org/processdef', 'http://www.activiti.org/test'];

@Component({
    selector: 'process-list-by-category',
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule,
        TranslatePipe,
        MatFormFieldModule,
        MatInputModule,
        ReactiveFormsModule,
        MatProgressSpinnerModule,
        ProcessListByCategoryItemComponent
    ],
    templateUrl: './process-list-by-category.component.html',
    styleUrls: ['./process-list-by-category.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcessListByCategoryComponent implements OnInit, OnChanges {
    @Input() processes: ProcessDefinitionRepresentation[] = [];
    @Input() recentDefinitionKeys: string[] = [];
    @Input() showLoadingSpinner = false;

    @Output() selectProcess = new EventEmitter<ProcessDefinitionRepresentation>();

    searchProcessText = new UntypedFormControl('');
    filteredProcesses: ItemsByCategory<ProcessDefinitionRepresentation>[] = [];
    recentProcesses: ProcessDefinitionRepresentation[] = [];

    constructor(private categoryMapper: SortByCategoryMapperService<ProcessDefinitionRepresentation>) {}

    ngOnInit(): void {
        this.searchProcessText.valueChanges.subscribe(() => {
            this.setFilteredProcesses(this.processes);
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        const processesChanges = changes['processes'];
        const recentProcesses = changes['recentDefinitionKeys'];

        if (processesChanges?.currentValue !== processesChanges?.previousValue) {
            const newProcesses = processesChanges.currentValue ?? [];

            this.setFilteredProcesses(newProcesses);
            this.setRecentProcessDefinitions(newProcesses, this.recentDefinitionKeys);
        }

        if (recentProcesses?.currentValue !== recentProcesses?.previousValue) {
            this.setRecentProcessDefinitions(this.processes, recentProcesses.currentValue ?? []);
        }
    }

    onSelectProcess(process: ProcessDefinitionRepresentation): void {
        this.selectProcess.emit(process);
    }

    private setFilteredProcesses(processes: ProcessDefinitionRepresentation[]): void {
        const filteredProcesses = this.filterProcessesBySearchText(processes, this.searchProcessText.value);

        this.filteredProcesses = this.categoryMapper.mapItems(filteredProcesses, DEFAULT_CATEGORIES);
    }

    private filterProcessesBySearchText(processes: ProcessDefinitionRepresentation[], searchValue: string): ProcessDefinitionRepresentation[] {
        return processes.filter((process) => process.name.toLocaleLowerCase().indexOf(searchValue.toLocaleLowerCase()) > -1);
    }

    private setRecentProcessDefinitions(processes: ProcessDefinitionRepresentation[] = [], recentProcessesKeys: string[] = []): void {
        this.recentProcesses = recentProcessesKeys
            .map((recentKey) => processes.find((process) => process.key === recentKey))
            .filter((recentProcess) => !!recentProcess);
    }
}
