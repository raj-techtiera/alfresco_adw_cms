/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { FavoriteEntry, NodeEntry, ResultSetRowEntry, SharedLinkEntry } from '@alfresco/js-api';

export const mockedNodes: NodeEntry[] = [
    {
        entry: {
            id: '11',
            name: 'personal 1.jpeg',
            modifiedAt: new Date(),
            modifiedByUser: { displayName: 'Test user' },
            content: { mimeType: 'image/jpeg', sizeInBytes: 100000 }
        }
    } as NodeEntry,
    {
        entry: {
            id: '22',
            name: 'personal 2.pdf',
            modifiedAt: new Date(),
            modifiedByUser: { displayName: 'Test user' },
            content: { mimeType: 'application/pdf', sizeInBytes: 2000000 }
        }
    } as NodeEntry
];

export const mockedRecent: ResultSetRowEntry[] = [
    {
        entry: {
            id: '33',
            name: 'recent 1',
            isFile: true,
            isFolder: false,
            modifiedAt: new Date(),
            modifiedByUser: { displayName: 'Test user' },
            content: { mimeType: 'txt' }
        }
    } as ResultSetRowEntry,
    {
        entry: {
            id: '44',
            name: 'recent 2',
            isFile: false,
            isFolder: false,
            modifiedAt: new Date(),
            modifiedByUser: { displayName: 'Test user' },
            content: { mimeType: 'txt' }
        }
    } as ResultSetRowEntry,
    {
        entry: {
            id: '55',
            name: 'recent 3',
            isFile: false,
            isFolder: true,
            modifiedAt: new Date(),
            modifiedByUser: { displayName: 'Test user' },
            content: { mimeType: 'txt' }
        }
    } as ResultSetRowEntry
];

export const mockedShared: SharedLinkEntry[] = [
    {
        entry: {
            id: '55',
            name: 'shared 1',
            modifiedAt: new Date(),
            modifiedByUser: { displayName: 'Test user' },
            content: { mimeType: 'txt' }
        }
    } as SharedLinkEntry,
    {
        entry: {
            id: '66',
            name: 'shared 2',
            modifiedAt: new Date(),
            modifiedByUser: { displayName: 'Test user' },
            content: { mimeType: 'txt' }
        }
    } as SharedLinkEntry
];

export const mockedFavorites: FavoriteEntry[] = [
    {
        entry: {
            id: '77',
            target: 'test',
            targetGuid: 'test',
            name: 'favorites 1',
            modifiedAt: new Date(),
            modifiedByUser: { displayName: 'Test user' },
            content: { mimeType: 'txt' }
        }
    } as FavoriteEntry,
    {
        entry: {
            id: '88',
            target: 'test',
            targetGuid: 'test',
            name: 'favorites 2',
            modifiedAt: new Date(),
            modifiedByUser: { displayName: 'Test user' },
            content: { mimeType: 'txt' }
        }
    } as FavoriteEntry
];
