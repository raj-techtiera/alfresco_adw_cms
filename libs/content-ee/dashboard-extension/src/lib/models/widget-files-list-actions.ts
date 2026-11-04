/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const WidgetFilesListActions = {
    VIEW: 'view',
    DOWNLOAD: 'download',
    SHARE: 'share',
    SHARED_LINK_SETTING: 'shared link settings',
    FOLDER_INFORMATION: 'folder information'
} as const;

export type WidgetFilesListActions = typeof WidgetFilesListActions[keyof typeof WidgetFilesListActions];
