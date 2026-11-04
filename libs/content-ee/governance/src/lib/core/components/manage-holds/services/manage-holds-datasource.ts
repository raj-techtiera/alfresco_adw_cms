/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { InfiniteScrollDatasource } from '@alfresco/adf-content-services';
import { ContentPagingQuery } from '@alfresco/js-api';
import { ManageHoldsService } from './manage-holds.service';
import { from, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { OperationMode } from '../../../model/bulk-operation.model';
import { HoldItem } from '../model/hold-item';

export class ManageHoldsListDataSource extends InfiniteScrollDatasource<HoldItem> {
    constructor(private readonly manageHoldsService: ManageHoldsService, private nodeId: string, private operationMode: OperationMode) {
        super();
    }

    getNextBatch(pagingOptions: ContentPagingQuery): Observable<HoldItem[]> {
        const isFirstLoad = this.itemsCount === 0;

        return from(this.manageHoldsService.getAllHolds(this.nodeId, isFirstLoad, this.operationMode, pagingOptions)).pipe(take(1));
    }
}
