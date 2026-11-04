/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ProcessDefinitionRepresentation } from '@alfresco/js-api';
import { UploadWidgetType } from '../models/process-service.model';

export const fakeProcessDefinition = {
    name: 'fakeProcessDefinitionName',
    id: 'fakeProcessDefinitionId',
} as ProcessDefinitionRepresentation;

const userInfo = {
    displayName: 'root',
    id: 'root',
};

export const selectedNodesMock: any[] = [
    {
        id: 'mockId',
        isFile: true,
        isFolder: false,
        name: 'file',
        nodeType: 'node',
        modifiedAt: new Date(),
        modifiedByUser: userInfo,
        createdAt: new Date(),
        createdByUser: userInfo,
    },
    {
        id: 'mockId2',
        isFile: true,
        isFolder: false,
        name: 'file-2',
        nodeType: 'node',
        modifiedAt: new Date(),
        modifiedByUser: userInfo,
        createdAt: new Date(),
        createdByUser: userInfo,
    },
];

export const singleContentUploadWidgets = <UploadWidgetType[]> [
    {
        id: 'upload-widget-id-1',
        type: 'single',
        link: false,
    },
    {
        id: 'upload-widget-id-2',
        type: 'single',
        link: false,
    },
];

export const multipleContentUploadWidgets = <UploadWidgetType[]> [
    {
        id: 'upload-widget-id-1',
        type: 'multiple',
        link: false,
    },
    {
        id: 'upload-widget-id-2',
        type: 'multiple',
        link: false,
    },
];
