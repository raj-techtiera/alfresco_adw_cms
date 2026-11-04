/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ObjectDataRow } from '@alfresco/adf-core';

export interface InfiniteScrollDatatableRowAction {
    title: string;
    icon: string;
    actionType: string;

    isVisible(row: ObjectDataRow, actionType: string): boolean;
}
