/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const LibrariesWidgetRowActions = {
    JOIN: 'join',
    LEAVE: 'leave'
} as const;

export type LibrariesWidgetRowActions = typeof LibrariesWidgetRowActions[keyof typeof LibrariesWidgetRowActions];
