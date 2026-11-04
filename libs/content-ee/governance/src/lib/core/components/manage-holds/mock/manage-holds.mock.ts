/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Hold, HoldBody, HoldBulkStatusEntry, HoldEntry, BulkAssignHoldResponseEntry, SEARCH_LANGUAGE } from '@alfresco/js-api';
import { HoldItem } from '../model/hold-item';
import { ExistingHoldDataToConfirm } from '../model/existing-hold-data-to-confirm.model';

export const mockNodeId = 'mockNodeId';

export const mockHolds: HoldItem[] = Array(3)
.fill(null)
.map((_, i) => ({
    id: `node-${i}`,
    name: `node ${i}`,
    selected: false
}));

export const getMockHolds = (): HoldItem[] => { return JSON.parse(JSON.stringify(mockHolds)); };

export const mockAssignedHold: HoldItem = {
    id: 'foo',
    name: 'Assigned Hold 1'
};

export const holdToCreate: HoldBody = {
    name: 'New Hold',
    reason: 'Hold Reason'
};

export const existingHoldMock: ExistingHoldDataToConfirm = {
    selectedHoldIds: ['hold1'],
    unselectedHoldIds: ['hold2']
};

export const existingHoldsResponseMock: ExistingHoldDataToConfirm & { nodeId: string } = {
    nodeId: mockNodeId,
    ...existingHoldMock
};

export const mockCreateHoldEntry: HoldEntry = { entry: holdToCreate as Hold };

export const mockResponse: BulkAssignHoldResponseEntry = {
    entry: {
        totalItems: 3,
        bulkStatusId: 'bulkStatus'
    }
};

export const mockUserQuery = '(DEMO*)';

export const mockFilterQueries = [
    { query: '+TYPE:\'cm:folder\' OR +TYPE:\'cm:content\'' },
    {
        query: '-TYPE:\'cm:thumbnail\' AND -TYPE:\'cm:failedThumbnail\' AND -TYPE:\'cm:rating\''
    },
    { query: '-cm:creator:System' },
    {
        query: '-TYPE:\'st:site\' AND -ASPECT:\'st:siteContainer\' AND -ASPECT:\'sys:hidden\''
    },
    {
        query: '-TYPE:\'dl:dataList\' AND -TYPE:\'dl:todoList\' AND -TYPE:\'dl:issue\''
    },
    { query: '-TYPE:\'fm:topic\' AND -TYPE:\'fm:post\'' },
    { query: '-TYPE:\'lnk:link\'' },
    { query: '-PATH:\'//cm:wiki/*\'' }
];
// eslint-disable-next-line max-len
export const mockedMappedQuery = `${mockUserQuery} AND ((+TYPE:'cm:folder' OR +TYPE:'cm:content') AND (-TYPE:'cm:thumbnail' AND -TYPE:'cm:failedThumbnail' AND -TYPE:'cm:rating') AND (-cm:creator:System) AND (-TYPE:'st:site' AND -ASPECT:'st:siteContainer' AND -ASPECT:'sys:hidden') AND (-TYPE:'dl:dataList' AND -TYPE:'dl:todoList' AND -TYPE:'dl:issue') AND (-TYPE:'fm:topic' AND -TYPE:'fm:post') AND (-TYPE:'lnk:link') AND (-PATH:'//cm:wiki/*')) AND TYPE:content`;

export const mockBulkStatusEntryResponse: HoldBulkStatusEntry = {
    entry: {
        bulkStatusId: 'bulkStatus',
        status: 'DONE',
        totalItems: 3,
        processedItems: 2,
        errorsCount: 0,
        startTime: new Date('2024'),
        holdBulkOperation: {
            op: 'ADD',
            query: {
                query: 'mockQuery',
                language: SEARCH_LANGUAGE.AFTS
            }
        }
    }
};

export const getMockBulkStatus = (totalItems: number, processedItems: number, errorsCount: number, status?: string) => {
    return {
        entry: {
            ...mockBulkStatusEntryResponse.entry,
            totalItems,
            processedItems,
            errorsCount,
            status
        }
    };
};
