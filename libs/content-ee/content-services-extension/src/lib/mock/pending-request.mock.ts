/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const mockPendingRequest = {
    list: {
        pagination: { count: 3, hasMoreItems: false, totalItems: 3, skipCount: 0, maxItems: 25 },
        entries: [
            {
                entry: {
                    person: {
                        firstName: 'one@alfresco.com',
                        displayName: 'one@alfresco.com',
                        id: 'one@alfresco.com',
                    },
                    id: 'moderated-lib',
                },
            },
            {
                entry: {
                    person: {
                        firstName: 'sample@gmail.com',
                        displayName: 'sample@gmail.com',
                        id: 'sample@gmail.com',
                    },
                },
                id: 'moderated-lib',
            },
            {
                entry: {
                    person: {
                        firstName: 'two@alfresco.com',
                        displayName: 'two@alfresco.com',
                        id: 'two@alfresco.com',
                    },
                    id: 'moderated-lib',
                },
            },
        ],
    },
};

export const mockEmptyPendingRequest = {
    list: {
        pagination: { count: 0, hasMoreItems: false, totalItems: 0, skipCount: 0, maxItems: 25 },
        entries: [],
    },
};
