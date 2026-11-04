/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NodeEntry } from '@alfresco/js-api';

export const fakeNode: NodeEntry = <NodeEntry> {
    entry: {
        name: 'Node Action',
        id: 'fake-id',
        isFile: true,
        aspectNames: [],
        allowableOperations: [],
        properties: {},
    },
};
export const fakeRecord: NodeEntry = <NodeEntry> {
    entry: {
        name: 'Node Action',
        id: 'fake-id',
        isFile: true,
        aspectNames: ['rma:record'],
        properties: {},
        allowableOperations: [],
    },
};
