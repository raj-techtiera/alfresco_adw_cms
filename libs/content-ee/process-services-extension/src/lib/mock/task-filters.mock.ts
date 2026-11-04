/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { UserTaskFilterRepresentation } from '@alfresco/js-api';

export const fakeFilterParamRepresentationModel = {
    processDefinitionId: 'fake-processDefinitionId',
    processDefinitionKey: 'fake-processDefinitionKey',
    name: 'fake-name',
    state: 'fake-state',
    sort: 'fake-sort',
    assignment: 'fake-assignment',
    dueAfter: null,
    dueBefore: null,
} as any;

export const mockTaskFilter = new UserTaskFilterRepresentation({
    id: 1,
    appId: 101,
    name: 'fake-name',
    recent: true,
    icon: 'fake-icon',
    filter: fakeFilterParamRepresentationModel,
    index: 1,
});

export const fakeTaskFilters = [
    new UserTaskFilterRepresentation({
        name: 'FakeInvolvedTasks',
        icon: 'glyphicon-align-left',
        id: 10,
        filter: { state: 'open', assignment: 'fake-involved' },
    }),
    new UserTaskFilterRepresentation({
        name: 'FakeMyTasks1',
        icon: 'glyphicon-ok-sign',
        id: 11,
        filter: { state: 'open', assignment: 'fake-assignee' },
    }),
    new UserTaskFilterRepresentation({
        name: 'FakeMyTasks2',
        icon: 'glyphicon-inbox',
        id: 12,
        filter: { state: 'open', assignment: 'fake-assignee' },
    }),
] as any;
