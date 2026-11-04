/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { SharedLink } from '@alfresco/js-api';

export const startFormWithContentUploadWidgets = {
    id: 4,
    name: 'Translation request',
    processDefinitionId: 'mock-process-definition-is',
    fields: [
        {
            fieldType: 'ContainerRepresentation',
            id: '1582747048995',
            name: 'Label',
            type: 'container',
            fields: {
                '1': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'singleContentUpload',
                        name: 'singleContentUpload',
                        type: 'upload',
                        params: {
                            existingColspan: 1,
                            maxColspan: 2,
                            fileSource: { serviceId: 'local-file' },
                        },
                    },
                ],
                '2': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'text2',
                        name: 'Text2',
                        type: 'text',
                        params: { existingColspan: 1, maxColspan: 1 },
                        visibilityCondition: null,
                    },
                ],
            },
        },
        {
            fieldType: 'ContainerRepresentation',
            id: '1582747052793',
            name: 'Label',
            type: 'container',
            numberOfColumns: 2,
            fields: {
                '1': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'singleContentUpload',
                        name: 'singleContentUpload',
                        type: 'upload',
                        params: {
                            existingColspan: 1,
                            maxColspan: 2,
                            fileSource: { serviceId: 'alfresco-content' },
                        },
                    },
                ],
                '2': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'multipleContentUpload',
                        name: 'multipleContentUpload',
                        type: 'upload',
                        params: {
                            existingColspan: 1,
                            maxColspan: 1,
                            multiple: true,
                            fileSource: { serviceId: 'alfresco-content' },
                        },
                        visibilityCondition: null,
                    },
                ],
            },
        },
    ],
    outcomes: [],
    globalDateFormat: 'D-M-YYYY',
};

export const startFormWithOnlyLocalUploadWidgets = {
    id: 4,
    name: 'Translation request',
    processDefinitionId: 'mock-process-definition-is',
    fields: [
        {
            fieldType: 'ContainerRepresentation',
            id: '1582747048995',
            name: 'Label',
            type: 'container',
            fields: {
                '1': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'singleContentUpload',
                        name: 'singleContentUpload',
                        type: 'upload',
                        params: {
                            existingColspan: 1,
                            maxColspan: 2,
                            fileSource: { serviceId: 'local-file' },
                        },
                    },
                ],
                '2': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'text2',
                        name: 'Text2',
                        type: 'text',
                        params: { existingColspan: 1, maxColspan: 1 },
                        visibilityCondition: null,
                    },
                ],
            },
        },
        {
            fieldType: 'ContainerRepresentation',
            id: '1582747052793',
            name: 'Label',
            type: 'container',
            numberOfColumns: 2,
            fields: {
                '1': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'singleContentUpload',
                        name: 'singleContentUpload',
                        type: 'upload',
                        params: {
                            existingColspan: 1,
                            maxColspan: 2,
                            fileSource: { serviceId: 'local-file' },
                        },
                    },
                ],
                '2': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'multipleContentUpload',
                        name: 'multipleContentUpload',
                        type: 'upload',
                        params: {
                            existingColspan: 1,
                            maxColspan: 1,
                            multiple: true,
                            fileSource: { serviceId: 'local-file' },
                        },
                        visibilityCondition: null,
                    },
                ],
            },
        },
    ],
    outcomes: [],
    globalDateFormat: 'D-M-YYYY',
};

export const startFormWithLocalAndContentUploadWidgets = {
    id: 4,
    name: 'Translation request',
    processDefinitionId: 'mock-process-definition-is',
    fields: [
        {
            fieldType: 'ContainerRepresentation',
            id: '1582747048995',
            name: 'Label',
            type: 'container',
            fields: {
                '1': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'text1',
                        name: 'Text1',
                        type: 'text',
                        params: { existingColspan: 1, maxColspan: 2 },
                        visibilityCondition: null,
                    },
                ],
                '2': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'multipleContentUpload',
                        name: 'multipleContentUpload',
                        type: 'upload',
                        params: {
                            existingColspan: 1,
                            maxColspan: 1,
                            multiple: true,
                            fileSource: { serviceId: 'alfresco-content' },
                        },
                        visibilityCondition: null,
                    },
                ],
            },
        },
        {
            fieldType: 'ContainerRepresentation',
            id: '1582747052793',
            name: 'Label',
            type: 'container',
            numberOfColumns: 2,
            fields: {
                '1': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'singleContentUpload',
                        name: 'singleContentUpload',
                        type: 'upload',
                        params: {
                            existingColspan: 1,
                            maxColspan: 2,
                            fileSource: { serviceId: 'local-file' },
                        },
                    },
                ],
                '2': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'multipleContentUpload',
                        name: 'multipleContentUpload',
                        type: 'upload',
                        params: {
                            existingColspan: 1,
                            maxColspan: 1,
                            fileSource: { serviceId: 'local-file' },
                        },
                        visibilityCondition: null,
                    },
                ],
            },
        },
    ],
    outcomes: [],
    globalDateFormat: 'D-M-YYYY',
};

export const startFormWithNoUploadWidgets = {
    id: 4,
    name: 'Translation request',
    processDefinitionId: 'mock-process-definition-is',
    fields: [
        {
            fieldType: 'ContainerRepresentation',
            id: '1582747048995',
            name: 'Label',
            type: 'container',
            fields: {
                '1': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'text1',
                        name: 'Text1',
                        type: 'text',
                        params: { existingColspan: 1, maxColspan: 2 },
                        visibilityCondition: null,
                    },
                ],
                '2': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'text2',
                        name: 'Text2',
                        type: 'text',
                        params: { existingColspan: 1, maxColspan: 1 },
                        visibilityCondition: null,
                    },
                ],
            },
        },
    ],
    outcomes: [],
    globalDateFormat: 'D-M-YYYY',
};

export const startFormWithNoFields = {
    id: 17124,
    processDefinitionId: 'processWithStartFormWithOutFields:1:148036',
    processDefinitionName: 'processWithStartFormWithOutFields',
    processDefinitionKey: 'processWithStartFormWithOutFields',
    tabs: [],
    fields: [],
    outcomes: [],
    javascriptEvents: [],
    className: '',
    style: '',
    customFieldTemplates: {},
    metadata: {},
    variables: [],
    customFieldsValueInfo: {},
    gridsterForm: false,
    globalDateFormat: 'D-M-YYYY',
};

export const mockSharedFileEntry: SharedLink = new SharedLink({
    name: 'fake-name',
    id: 'fake-id',
    nodeId: 'fake-node-id',
});

export const mockSharedSelectionState = {
    selection: {
        nodes: [
            {
                entry: mockSharedFileEntry,
            },
        ],
    },
};

export const startFormWithVisibilityCondition = {
    id: 1031,
    processDefinitionId: 'sample:1:2881',
    processDefinitionName: 'sample',
    processDefinitionKey: 'sample',
    tabs: [],
    fields: [
        {
            fieldType: 'ContainerRepresentation',
            id: '1588165141180',
            name: 'Label',
            type: 'container',
            value: null,
            required: false,
            readOnly: false,
            overrideId: false,
            colspan: 1,
            placeholder: null,
            minLength: 0,
            maxLength: 0,
            sizeX: 2,
            sizeY: 1,
            row: -1,
            col: -1,
            visibilityCondition: null,
            numberOfColumns: 2,
            fields: {
                '1': [
                    {
                        fieldType: 'FormFieldRepresentation',
                        id: 'mockCheck',
                        name: 'Mock Check',
                        type: 'boolean',
                        value: null,
                        required: false,
                        readOnly: false,
                        overrideId: false,
                        colspan: 1,
                        placeholder: null,
                        minLength: 0,
                        maxLength: 0,
                        tab: null,
                        className: null,
                        params: { existingColspan: 1, maxColspan: 2 },
                        dateDisplayFormat: null,
                        layout: { row: -1, column: -1, colspan: 1 },
                        sizeX: 1,
                        sizeY: 1,
                        row: -1,
                        col: -1,
                        visibilityCondition: null,
                    },
                ],
                '2': [
                    {
                        fieldType: 'AttachFileFieldRepresentation',
                        id: 'uploadWidget',
                        name: 'UploadWidget',
                        type: 'upload',
                        value: null,
                        required: false,
                        readOnly: false,
                        overrideId: false,
                        colspan: 1,
                        placeholder: null,
                        params: {
                            existingColspan: 1,
                            maxColspan: 1,
                            fileSource: {
                                serviceId: 'all-file-sources',
                                name: 'All file sources',
                            },
                        },
                        dateDisplayFormat: null,
                        layout: { row: -1, column: -1, colspan: 1 },
                        sizeX: 1,
                        sizeY: 1,
                        row: -1,
                        col: -1,
                        visibilityCondition: {
                            leftFormFieldId: 'mockCheck',
                            leftRestResponseId: null,
                            operator: '==',
                            rightValue: 'true',
                            rightType: null,
                            rightFormFieldId: '',
                            rightRestResponseId: '',
                            nextConditionOperator: '',
                            nextCondition: null,
                        },
                        metaDataColumnDefinitions: null,
                    },
                ],
            },
        },
    ],
    outcomes: [],
    javascriptEvents: [],
    className: '',
    style: '',
    customFieldTemplates: {},
    metadata: {},
    variables: [],
    customFieldsValueInfo: {},
    gridsterForm: false,
    globalDateFormat: 'D-M-YYYY',
};
