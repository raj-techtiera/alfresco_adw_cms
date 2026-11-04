/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const TaskFilter = {
    OVERDUE: 'OVERDUE',
    UNASSIGNED: 'UNASSIGNED',
    IN_PROGRESS: 'IN_PROGRESS'
} as const;

export type TaskFilter = typeof TaskFilter[keyof typeof TaskFilter];
