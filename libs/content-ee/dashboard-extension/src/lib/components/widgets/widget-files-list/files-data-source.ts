/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { map, Observable, take } from 'rxjs';
import { ObjectDataRow } from '@alfresco/adf-core';
import { ContentPagingQuery } from '@alfresco/js-api';
import {
    CustomResourcesService,
    InfiniteScrollDatasource,
    NodesApiService
} from '@alfresco/adf-content-services';
import { FilesFilter } from '../../../models/files-filter';

export class FilesDataSource extends InfiniteScrollDatasource<ObjectDataRow> {
    filesFilter: FilesFilter = FilesFilter.RECENT;
    filesFetched: Observable<ObjectDataRow[]>;

    constructor(private nodesApiService: NodesApiService, private customResourcesService: CustomResourcesService) {
        super();
        this.batchSize = 20;
        this.filesFetched = this.dataStream.asObservable();
    }

    getNextBatch(pagingOptions: ContentPagingQuery): Observable<ObjectDataRow[]> {
        switch (this.filesFilter) {
            case FilesFilter.RECENT:
                return this.customResourcesService.getRecentFiles('-me-', pagingOptions).pipe(take(1), map((recentFiles) => {
                    return recentFiles.list.entries.map((recentFile) => {
                        return new ObjectDataRow(recentFile.entry);
                    });
                }));
            case FilesFilter.SHARED:
                return this.customResourcesService.loadSharedLinks(pagingOptions).pipe(take(1), map((sharedLinks) => {
                    return sharedLinks.list.entries.map((sharedLink) => {
                        return new ObjectDataRow(sharedLink.entry);
                    });
                }));
            case FilesFilter.FAVORITES:
                return this.customResourcesService.loadFavorites(pagingOptions).pipe(take(1), map((favorites) => {
                    return favorites.list.entries.map((favorite) => {
                        return new ObjectDataRow(favorite.entry);
                    });
                }));
            case FilesFilter.PERSONAL: {
                const options = {
                    skipCount: pagingOptions.skipCount,
                    maxItems: pagingOptions.maxItems,
                    include: ['aspectNames', 'allowableOperations', 'properties', 'path']
                };
                return this.nodesApiService.getNodeChildren('-my-', options).pipe(take(1),
                    map((filesResponse) => {
                        return filesResponse.list.entries.map((file) => {
                            return new ObjectDataRow(file.entry);
                        });
                    })
                );
            }
        }
    }
}
