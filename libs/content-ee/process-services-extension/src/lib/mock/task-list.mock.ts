/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const fakeTaskList = {
    size: 2,
    start: 0,
    total: 2,
    data: [
        {
            id: 14,
            name: 'nameFake1',
            description: 'descriptionFake1',
            category: 'categoryFake1',
            assignee: {
                id: 2,
                firstName: 'firstNameFake1',
                lastName: 'lastNameFake1',
                email: 'emailFake1',
            },
            created: '2017-03-01T12:25:17.189+0000',
            dueDate: '2017-04-02T12:25:17.189+0000',
            endDate: '2017-05-03T12:25:31.129+0000',
            duration: 13940,
            priority: 50,
            parentTaskId: 1,
            parentTaskName: 'parentTaskNameFake',
            processInstanceId: 2511,
            processInstanceName: 'processInstanceNameFake',
            processDefinitionId: 'process:1:4',
            processDefinitionName: 'processDefinitionNameFake',
            processDefinitionDescription: 'processDefinitionDescriptionFake',
            processDefinitionKey: 'process',
            processDefinitionCategory: 'http://www.activiti.org/processdef',
            processDefinitionVersion: 1,
            processDefinitionDeploymentId: '1',
            formKey: 1,
            processInstanceStartUserId: null,
            initiatorCanCompleteTask: false,
            adhocTaskCanBeReassigned: false,
            taskDefinitionKey: 'sid-B6813AF5-8ACD-4481-A4D5-8BAAD1CB1416',
            executionId: 2511,
            memberOfCandidateGroup: false,
            memberOfCandidateUsers: false,
            managerOfCandidateGroup: false,
        },

        {
            id: 2,
            name: 'nameFake2',
            description: 'descriptionFake2',
            category: null,
            assignee: {
                id: 1,
                firstName: 'fistNameFake2',
                lastName: 'Administrator2',
                email: 'admin',
            },
            created: '2017-03-01T12:25:17.189+0000',
            dueDate: '2017-04-02T12:25:17.189+0000',
            endDate: null,
        },
    ],
} as any;

export const fakeTaskListDatatableSchema = {
    'adf-task-list': {
        presets: {
            'aps-task-list': [
                {
                    key: 'name',
                    type: 'text',
                    title: 'ADF_TASK_LIST.PROPERTIES.NAME',
                    cssClass: 'dw-dt-col-4 ellipsis-cell',
                    sortable: true,
                },
            ],
        },
    },
} as any;
