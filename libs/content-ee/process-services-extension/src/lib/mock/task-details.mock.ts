/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { TaskRepresentation } from '@alfresco/js-api';

export const taskDetailsMock = new TaskRepresentation({
    id: '91',
    name: 'Request translation',
    description: 'mock description',
    category: null,
    assignee: {
        id: 1001,
        firstName: 'Wilbur',
        lastName: 'Adams',
        email: 'wilbur@app.activiti.com',
    },
    created: new Date('2016-11-03T15:25:42.749+0000'),
    dueDate: null,
    endDate: null,
    duration: null,
    priority: 50,
    parentTaskId: null,
    parentTaskName: null,
    processInstanceId: '86',
    processInstanceName: null,
    processDefinitionId: 'TranslationProcess:2:8',
    processDefinitionName: 'Translation Process',
    processDefinitionDescription: null,
    processDefinitionKey: 'TranslationProcess',
    processDefinitionCategory: 'http://www.activiti.org/processdef',
    processDefinitionVersion: 2,
    processDefinitionDeploymentId: '5',
    formKey: '4',
    processInstanceStartUserId: '1001',
    initiatorCanCompleteTask: false,
    adhocTaskCanBeReassigned: false,
    taskDefinitionKey: 'sid-DDECD9E4-0299-433F-9193-C3D905C3EEBE',
    executionId: '86',
    involvedGroups: [],
    involvedPeople: [],
    memberOfCandidateUsers: false,
    managerOfCandidateGroup: false,
    memberOfCandidateGroup: false,
});

export const claimedTaskDetailsMock = new TaskRepresentation({
    id: '91',
    name: 'Request translation',
    description: null,
    category: null,
    assignee: {
        id: 1001,
        firstName: 'Wilbur',
        lastName: 'Adams',
        email: 'wilbur@app.activiti.com',
    },
    created: new Date('2016-11-03T15:25:42.749+0000'),
    dueDate: null,
    endDate: null,
    duration: null,
    priority: 50,
    formKey: '4',
    parentTaskId: null,
    parentTaskName: null,
    processInstanceId: '86',
    processInstanceName: null,
    processInstanceStartUserId: '1002',
    initiatorCanCompleteTask: false,
    processDefinitionId: 'TranslationProcess:2:8',
    processDefinitionName: 'Translation Process',
    involvedGroups: [
        {
            id: 7007,
            name: 'group1',
            externalId: null,
            status: 'active',
            groups: null,
        },
    ],
    involvedPeople: [
        {
            id: 1001,
            firstName: 'Wilbur',
            lastName: 'Adams',
            email: 'wilbur@app.activiti.com',
        },
        {
            id: 111,
            firstName: 'fake-first-name',
            lastName: 'fake-last-name',
            email: 'fake@app.activiti.com',
        },
    ],
    managerOfCandidateGroup: true,
    memberOfCandidateGroup: true,
    memberOfCandidateUsers: true,
});
