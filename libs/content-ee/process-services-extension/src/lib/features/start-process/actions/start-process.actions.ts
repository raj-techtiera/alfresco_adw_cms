/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createAction, props } from '@ngrx/store';
import { NodeEntry, ProcessDefinitionRepresentation, ProcessInstanceRepresentation } from '@alfresco/js-api';
import { ModalConfiguration } from '@alfresco/aca-shared/store';

export const START_PROCESS = 'START_PROCESS';
export const SHOW_NOTIFICATION_ON_START_PROCESS = 'SHOW_NOTIFICATION_ON_START_PROCESS';

export interface StartProcessPayload {
    payload: {
        processDefinition: ProcessDefinitionRepresentation;
        selectedNodes?: NodeEntry[];
    };
    configuration?: ModalConfiguration;
}

export interface NotificationPayload {
    appId: number;
    processInstanceName: string;
    processInstance: ProcessInstanceRepresentation;
}

export const startProcessAction = createAction(START_PROCESS, props<StartProcessPayload>());

export const showNotificationOnStartProcessAction = createAction(SHOW_NOTIFICATION_ON_START_PROCESS, props<NotificationPayload>());
