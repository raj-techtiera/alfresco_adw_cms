/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createAction, props } from '@ngrx/store';
import { TaskRepresentation } from '@alfresco/js-api';

export const SET_SELECTED_TASK = 'SET_SELECTED_TASK';
export const GET_TASK_DETAILS = 'GET_TASK_DETAILS';
export const LOAD_TASK_DETAILS = 'LOAD_TASK_DETAILS';
export const RELOAD_TASK_DETAILS = 'RELOAD_TASK_DETAILS';
export const UPDATE_TASK_DETAILS = 'UPDATE_TASK_DETAILS';
export const RESET_TASK_DETAILS = 'RESET_TASK_DETAILS';
export const NAVIGATE_TO_TASK_DETAILS = 'NAVIGATE_TO_TASK_DETAILS';
export const NAVIGATE_TO_TASK_DETAILS_FROM_CONTEXT_MENU = 'NAVIGATE_TO_TASK_DETAILS_FROM_CONTEXT_MENU';

export const updateTaskDetails = createAction(UPDATE_TASK_DETAILS, props<{ taskId: string; taskDetails: TaskRepresentation; updatedNotification: Partial<TaskRepresentation> }>());
export const loadTaskDetails = createAction(LOAD_TASK_DETAILS, props<{ taskId: string }>());
export const reloadTaskDetails = createAction(RELOAD_TASK_DETAILS, props<{ taskId: string }>());
export const getTaskDetails = createAction(GET_TASK_DETAILS);
export const setTaskDetails = createAction(SET_SELECTED_TASK, props<{ taskDetails: TaskRepresentation }>());
export const resetSelectedTask = createAction(RESET_TASK_DETAILS);
export const navigateToTaskDetails = createAction(NAVIGATE_TO_TASK_DETAILS, props<{ appId: number; selectedTask: TaskRepresentation }>());
export const navigateToTaskDetailsFromContextMenu = createAction(NAVIGATE_TO_TASK_DETAILS_FROM_CONTEXT_MENU);
