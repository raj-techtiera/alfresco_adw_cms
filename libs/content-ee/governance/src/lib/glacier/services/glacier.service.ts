/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { RecordService } from '../../record/services/record.service';
import { ActionExecResultEntry, Node } from '@alfresco/js-api';
import { Observable, of } from 'rxjs';
import { StorageService } from '@alfresco/adf-core';
import { NodesApiService } from '@alfresco/adf-content-services';
import { concatMap, map, switchMap, tap } from 'rxjs/operators';
import { ActionPollService } from '../../record/services/action-poll.service';
import { isPendingRestore } from '../rules/glacier-evaluator';

@Injectable({
    providedIn: 'root'
})
export class GlacierService {
    constructor(
        private recordService: RecordService,
        private nodesApiService: NodesApiService,
        private actionPollService: ActionPollService,
        private storageService: StorageService
    ) {}

    storeRecord(targetNode: Node): Observable<any> {
        const storeActionBody = {
            actionDefinitionId: 'archive',
            targetId: targetNode.id
        };
        return this.recordService.executeAction(storeActionBody);
    }

    restoreRecord(node: Node, type: string, days: string | number): Observable<boolean> {
        return this.recordService.executeAction(this.getRestoreActionsBody(node.id, days, type)).pipe(
            tap(() => this.updateCache(node.id, days, type)),
            switchMap(() => this.nodesApiService.getNodeContent(node.id)),
            switchMap(() => this.nodesApiService.getNode(node.id)),
            concatMap((recordNode: Node) =>
                isPendingRestore({ entry: recordNode })
                    ? of(recordNode)
                    : this.actionPollService.checkNodeWithProperty(recordNode.id, 'gl:contentState', 'PENDING_RESTORE')
            ),
            map(recordNode => isPendingRestore({ entry: recordNode }))
        );
    }

    extendRestore(node: Node, type: string, days: string | number): Observable<ActionExecResultEntry> {
        return this.recordService
            .executeAction(this.getRestoreActionsBody(node.id, days, type))
            .pipe(tap(() => this.updateCache(node.id, days, type)));
    }

    public getRestoreCache(id: string): any {
        return JSON.parse(this.storageService.getItem(`${id}__restore_info`));
    }

    public updateCache(id: string, days: string | number, type: string) {
        const existingCache = this.getRestoreCache(id);
        const newCache = {
            type,
            days: (existingCache ? existingCache.days : 0) + days,
            initiated: existingCache ? existingCache.initiated : Date.now()
        };
        this.storageService.setItem(`${id}__restore_info`, JSON.stringify(newCache));
    }

    private getRestoreActionsBody(id, days, type) {
        return {
            actionDefinitionId: 'restore',
            targetId: id,
            params: {
                'expiration-days': days,
                tier: type
            }
        };
    }
}
