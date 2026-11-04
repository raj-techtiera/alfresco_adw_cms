/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { UserProcessInstanceFilterRepresentation } from '@alfresco/js-api';

export const mockProcessFilter = {
    name: 'Running',
    appId: 22,
    id: 333,
    recent: true,
    icon: 'glyphicon-random',
    filter: { sort: 'created-desc', name: '', state: 'running' },
} as UserProcessInstanceFilterRepresentation;

export const fakeProcessFilters: UserProcessInstanceFilterRepresentation[] = [
    {
        name: 'FakeRunningProcess',
        icon: 'glyphicon-align-left',
        id: 10,
        filter: { sort: 'created-desc', name: '', state: 'running' },
    },
    {
        name: 'FakeCompletedProcess',
        icon: 'glyphicon-ok-sign',
        id: 11,
        filter: { sort: 'created-desc', name: '', state: 'completed' },
    },
    {
        name: 'FakeAllProcess',
        icon: 'glyphicon-inbox',
        id: 12,
        filter: { sort: 'created-desc', name: '', state: 'all' },
    },
];

export const fakeEditProcessFilter = {
    'adf-edit-task-filter': {
        filterProperties: ['status', 'sort', 'order', 'processName', 'processDefinitionName', 'completedDateRange', 'startedDateRange'],
        sortProperties: ['name', 'status', 'startDate', 'initiator', 'processDefinitionName'],
        actions: ['save', 'saveAs', 'delete'],
    },
};
