/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NodePaging, ResultSetPaging } from '@alfresco/js-api';

export const mockedHoldsList: NodePaging = {
    list: {
        entries: [{
            entry: {
                id: 'hold-id',
                name: 'Hold Name',
                isFolder: true,
                isFile: false,
                createdAt: new Date(2),
                modifiedAt: new Date(3),
                properties: { 'rma:holdReason': 'Test Reason' },
                path: { name: 'Home/Sites/Location' }
            }
        }]
    }
} as NodePaging;

export const mockedHoldsContainerList = {
    list: {
        entries: [{ entry: { id: 'holds-container-id' } }]
    }
} as ResultSetPaging;
