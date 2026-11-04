/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { map, take } from 'rxjs/operators';
import { BehaviorSubject, catchError, Observable, of, switchMap } from 'rxjs';
import { InfiniteScrollDatasource, NodesApiService } from '@alfresco/adf-content-services';
import { ObjectDataRow } from '@alfresco/adf-core';
import { ContentApiService } from '@alfresco/aca-shared';
import { ContentPagingQuery } from '@alfresco/js-api';

export class ManageHoldsListDataSource extends InfiniteScrollDatasource<ObjectDataRow> {
    legalHoldsLoaded$: Observable<ObjectDataRow[]>;
    loadingError$ = new BehaviorSubject(false);

    private holdContainerId$: Observable<void>;
    private _holdContainerId = '';

    get holdContainerId(): string {
        return this._holdContainerId;
    }

    constructor(
        private readonly nodesService: NodesApiService,
        private readonly contentApiService: ContentApiService
    ) {
        super();
        this.legalHoldsLoaded$ = this.dataStream.asObservable();
        this.batchSize = 20;
        this.holdContainerId$ = this.contentApiService.search({
            query: {
                query: "TYPE:'rma:holdContainer'"
            }
        }).pipe(
            map(response => {
                this._holdContainerId = response.list.entries[0].entry.id;
            }),
            take(1)
        );
    }

    getNextBatch(pagingOptions: ContentPagingQuery): Observable<ObjectDataRow[]> {
        this.loadingError$.next(false);
        return this.holdContainerId$.pipe(
            switchMap(() => this.nodesService.getNodeChildren(this.holdContainerId, { ...pagingOptions, where: "(nodeType='rma:hold')" })),
            take(1),
            map((nodes) => {
                return nodes.list.entries.map(entry => {
                    return new ObjectDataRow({
                        isFolder: entry.entry.isFolder,
                        isFile: entry.entry.isFile,
                        id: entry.entry.id,
                        name: entry.entry.name,
                        createdAt: entry.entry.createdAt,
                        modifiedAt: entry.entry.modifiedAt,
                        reason: entry.entry.properties['rma:holdReason'],
                        path: { name: entry.entry.path.name }
                    });
                });
            }),
            catchError(() => {
                this.loadingError$.next(true);
                return of([]);
            }));
    }
}
