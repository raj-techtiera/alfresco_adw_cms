/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { CustomResourcesService, InfiniteScrollDatasource } from '@alfresco/adf-content-services';
import { ObjectDataRow } from '@alfresco/adf-core';
import { map, Observable, take } from 'rxjs';
import { LibraryWidgetFilter } from '../../../models/library-widget-filter';
import { ContentApiService } from '@alfresco/aca-shared';
import { ContentPagingQuery } from '@alfresco/js-api';

export class LibrariesDataSource extends InfiniteScrollDatasource<ObjectDataRow> {
    librariesLoaded$: Observable<ObjectDataRow[]>;
    currentFilter: LibraryWidgetFilter = LibraryWidgetFilter.PERSONAL;

    constructor(private customResourcesService: CustomResourcesService, private contentApiService: ContentApiService) {
        super();
        this.batchSize = 20;
        this.librariesLoaded$ = this.dataStream.asObservable();
    }

    getNextBatch(pagingOptions: ContentPagingQuery): Observable<ObjectDataRow[]> {
        switch (this.currentFilter) {
            case LibraryWidgetFilter.PERSONAL:
                return this.customResourcesService.loadMemberSites(pagingOptions).pipe(
                    take(1),
                    map((sitesResponse) => {
                        return sitesResponse.list.entries.map((site) => {
                            return new ObjectDataRow(site.entry);
                        });
                    })
                );
            case LibraryWidgetFilter.ALL:
                return this.customResourcesService
                    .loadSites(pagingOptions).pipe(take(1),
                        map((sites) => {
                            return sites.list.entries.map((site) => {
                                return new ObjectDataRow(site.entry);
                            });
                        })
                    );
            case LibraryWidgetFilter.FAVORITES:
                return this.contentApiService.getFavoriteLibraries('-me-', pagingOptions).pipe(
                    take(1),
                    map((favouriteLibs) => {
                        return favouriteLibs.list.entries.map((favouriteLib) => {
                            return new ObjectDataRow(favouriteLib.entry);
                        });
                    })
                );
        }
    }
}
