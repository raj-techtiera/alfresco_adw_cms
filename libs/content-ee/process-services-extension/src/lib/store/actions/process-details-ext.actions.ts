/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createAction, props } from '@ngrx/store';
import { ProcessInstanceRepresentation } from '@alfresco/js-api';


export const SET_SELECTED_PROCESS = 'SET_SELECTED_PROCESS';
export const LOAD_SELECTED_PROCESS = 'LOAD_SELECTED_PROCESS';
export const RESET_SELECTED_PROCESS = 'RESET_SELECTED_PROCESS';
export const NAVIGATE_TO_PROCESS_DETAILS_FROM_CONTEXT_MENU = 'NAVIGATE_TO_PROCESS_DETAILS_FROM_CONTEXT_MENU';

export const setSelectedProcess = createAction(SET_SELECTED_PROCESS, props<{ processInstance: ProcessInstanceRepresentation }>());
export const loadSelectedProcess = createAction(LOAD_SELECTED_PROCESS, props<{ processInstanceId: string }>());
export const resetSelectedProcess = createAction(RESET_SELECTED_PROCESS);
export const navigateToProcessDetailsFromContextMenu = createAction(NAVIGATE_TO_PROCESS_DETAILS_FROM_CONTEXT_MENU);
