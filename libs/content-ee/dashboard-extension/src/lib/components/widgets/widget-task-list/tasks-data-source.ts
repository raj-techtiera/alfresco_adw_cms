/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { map, Observable, take } from 'rxjs';
import { ObjectDataRow } from '@alfresco/adf-core';
import { TaskListService } from '@alfresco/adf-process-services';
import { ContentPagingQuery, TaskQueryRepresentation } from '@alfresco/js-api';
import { InfiniteScrollDatasource } from '@alfresco/adf-content-services';

export class TasksDataSource extends InfiniteScrollDatasource<ObjectDataRow> {
    taskQuery: TaskQueryRepresentation;
    tasksFetched: Observable<ObjectDataRow[]>;

    constructor(private taskListService: TaskListService, initialTaskQuery: TaskQueryRepresentation) {
        super();
        this.taskQuery = initialTaskQuery;
        this.batchSize = 20;
        this.tasksFetched = this.dataStream.asObservable();
    }

    getNextBatch(pagingOptions: ContentPagingQuery): Observable<ObjectDataRow[]> {
        this.taskQuery.size = pagingOptions.maxItems;
        this.taskQuery.page = pagingOptions.skipCount / this.batchSize;
        return this.taskListService.findTasksByState(this.taskQuery).pipe(
            take(1),
            map((taskListResponse) => {
                return taskListResponse.data.map((task) => {
                    if (!task.name) {
                        task.name = 'No name';
                    }
                    return new ObjectDataRow(task);
                });
            })
        );
    }
}
