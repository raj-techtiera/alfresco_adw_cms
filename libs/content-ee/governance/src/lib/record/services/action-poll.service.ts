/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { interval, Observable, of } from 'rxjs';
import { filter, take, concatMap, single, takeWhile, tap } from 'rxjs/operators';
import { NodesApiService } from '@alfresco/adf-content-services';
import { nodeHasProperty } from '../../core/rules/node.evaluator';
import { NodeEntry, NodePaging, Node } from '@alfresco/js-api';

@Injectable({
    providedIn: 'root',
})
export class ActionPollService {
    constructor(private nodeApiService: NodesApiService) {}

    checkNodeDeletedFromFolder(nodeId: string, folderId: string): Observable<NodePaging> {
        return interval(1000).pipe(
            concatMap(() => this.nodeApiService.getNodeChildren(folderId)),
            filter((nodePage: NodePaging) => nodePage.list.entries.find((node: NodeEntry) => node.entry.id === nodeId) === undefined),
            take(1)
        );
    }

    checkNodeInFolder(nodeId: string, folderId: string): Observable<NodePaging> {
        return interval(1000).pipe(
            concatMap(() => this.nodeApiService.getNodeChildren(folderId)),
            filter((nodePage: NodePaging) => !!nodePage.list.entries.find((node: NodeEntry) => node.entry.id === nodeId)),
            take(1)
        );
    }

    checkNodeWithProperty(nodeId: string, property: string, value: string, retry: number = 5): Observable<Node> {
        let isValidRetry = true;
        return interval(1000).pipe(
            concatMap(() => (isValidRetry ? this.nodeApiService.getNode(nodeId) : of(null))),
            take(retry),
            takeWhile(() => isValidRetry),
            tap((node: Node) => (isValidRetry = !nodeHasProperty(node, property, value))),
            single((node) => nodeHasProperty(node, property, value))
        );
    }
}
