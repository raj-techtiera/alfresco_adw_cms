/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

export const fakeProcessListDatatableSchema = {
    'adf-process-list': {
        presets: {
            running: [
                {
                    key: 'name',
                    type: 'text',
                    title: 'ADF_PROCESS_LIST.PROPERTIES.NAME',
                    cssClass: 'dw-dt-col-4 ellipsis-cell',
                    sortable: true,
                },
            ],
        },
    },
};

export const fakeProcessTaskListDatatableSchema = {
    'adf-task-list': {
        presets: {
            'aps-process-task-list': [
                {
                    key: 'name',
                    type: 'text',
                    title: 'ADF_TASK_LIST.PROPERTIES.TASK_NAME',
                    cssClass: 'adf-data-table-cell--ellipsis',
                    sortable: true,
                },
            ],
        },
    },
};
