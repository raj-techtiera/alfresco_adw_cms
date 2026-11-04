/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ProcessService } from '@alfresco/adf-process-services';
import { Store } from '@ngrx/store';
import { getAppSelection } from '@alfresco/aca-shared/store';
import { NodeEntry, ProcessDefinitionRepresentation } from '@alfresco/js-api';
import { ALL_APPS } from '../../../../models/process-service.model';
import { startProcessAction, StartProcessPayload } from '../../actions/start-process.actions';
import { StartProcessExtService } from '../../services/start-process-ext.service';
import { MatListModule } from '@angular/material/list';
import { MatLineModule, MatRippleModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'aps-process-definitions-ext',
    standalone: true,
    imports: [CommonModule, MatListModule, MatRippleModule, MatIconModule, MatLineModule, TranslatePipe],
    templateUrl: './process-definitions-ext.component.html',
    styleUrls: ['./process-definitions-ext.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ProcessDefinitionsExtComponent implements OnInit {
    selectedNodes: NodeEntry[] = [];

    processDefinitions: ProcessDefinitionRepresentation[];
    totalQuickStartProcessDefinitions: number;

    constructor(private store: Store<any>, private processService: ProcessService, private startProcessExtService: StartProcessExtService) {}

    ngOnInit() {
        this.totalQuickStartProcessDefinitions = this.startProcessExtService.getTotalQuickStartProcessDefinitions();
        this.getSelectedNode();
        this.getProcessDefinitionsByAppId();
    }

    getSelectedNode() {
        this.store.select(getAppSelection).subscribe((res: any) => (this.selectedNodes = res.nodes));
    }

    private hasContentAttachment(): boolean {
        return this.selectedNodes && this.selectedNodes.length > 0;
    }

    getProcessDefinitionsByAppId(appId: number = ALL_APPS) {
        this.processService.getProcessDefinitions(appId).subscribe((processDefinitions) => {
            this.processDefinitions = processDefinitions;
        });
    }

    onProcessDefinitionClick(processDefinition: ProcessDefinitionRepresentation) {
        const startProcess: StartProcessPayload = {
            payload: {
                processDefinition: processDefinition
            }
        };
        if (this.hasContentAttachment()) {
            startProcess.payload.selectedNodes = this.selectedNodes;
        }
        this.store.dispatch(startProcessAction(startProcess));
    }

    onMoreClick() {
        this.onProcessDefinitionClick({});
    }

    getQuickStartProcessDefinitions(): ProcessDefinitionRepresentation[] {
        if (this.processDefinitions?.length > this.totalQuickStartProcessDefinitions) {
            return this.processDefinitions.slice(0, this.totalQuickStartProcessDefinitions);
        } else {
            return this.processDefinitions;
        }
    }
}
