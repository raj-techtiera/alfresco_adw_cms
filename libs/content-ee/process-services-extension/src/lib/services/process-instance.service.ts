/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { SitesService, AlfrescoApiService } from '@alfresco/adf-content-services';
import { ActivitiContentService, ProcessContentService } from '@alfresco/adf-process-services';
import {
    HistoricProcessInstanceQueryRepresentation,
    Node,
    ProcessInstancesApi,
    ResultListDataRepresentationProcessInstanceRepresentation,
    SharedLink
} from '@alfresco/js-api';
import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { concatMap } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ProcessInstanceService {
    private _processInstancesApi: ProcessInstancesApi;

    get processInstancesApi(): ProcessInstancesApi {
        this._processInstancesApi = this._processInstancesApi ?? new ProcessInstancesApi(this.alfrescoApiService.getInstance());
        return this._processInstancesApi;
    }

    constructor(
        private alfrescoApiService: AlfrescoApiService,
        private sitesService: SitesService,
        private activitiContentService: ActivitiContentService,
        private processContentService: ProcessContentService
    ) {}

    cancelProcess(processInstanceId: string): Observable<void> {
        return from(this.processInstancesApi.deleteProcessInstance(processInstanceId));
    }

    getRunningProcessesDetails(node: Node): Observable<ResultListDataRepresentationProcessInstanceRepresentation> {
        const nodeId = node instanceof SharedLink ? (node as SharedLink).nodeId : node.id;
        const currentSideId = this.sitesService.getSiteNameFromNodePath(node);
        const versionLabel: string = node.properties?.['cm:versionLabel'] ?? '';
        const sourceId = nodeId + ';' + versionLabel + '@' + currentSideId;
        return this.activitiContentService.getAlfrescoRepositories().pipe(
            concatMap((repoList) => {
                let alfrescoRepositoryName = '';
                if (repoList?.[0]) {
                    alfrescoRepositoryName = `alfresco-${repoList[0].id}-${repoList[0].name}`;
                }
                alfrescoRepositoryName += 'Alfresco';
                return this.processContentService.getProcessesAndTasksOnContent(sourceId, alfrescoRepositoryName);
            }),
            concatMap((processes) => {
                if (processes.data.length > 0) {
                    const queryRequest: HistoricProcessInstanceQueryRepresentation = {
                        processInstanceIds: processes.data.map((process) => process.processId),
                        finished: false
                    };
                    return from(this.processInstancesApi.getHistoricProcessInstances(queryRequest));
                }
                return of({ data: [], size: 0, start: 0, total: 0 });
            })
        );
    }
}
