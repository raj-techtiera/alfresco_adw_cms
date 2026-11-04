/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createReducer, on, Action } from '@ngrx/store';
import { updateProcessServiceHealth } from '../actions/process-services-health.actions';
import { TaskRepresentation, UserProcessInstanceFilterRepresentation, UserTaskFilterRepresentation, ProcessInstanceRepresentation } from '@alfresco/js-api';
import { ContentLinkModel } from '@alfresco/adf-core';
import { ProcessServicesExtActions } from '../../process-services-ext-actions-types';
import { TaskDetailsExtActions } from '../task-details-ext-actions-types';
import { ProcessDetailsExtActions } from '../../process-details-ext-actions-types';

export const featureKey = 'processServices';

export interface ProcessServiceExtensionState {
    health: boolean;
    processManagementExpanded: boolean;
    selectedFilter: UserProcessInstanceFilterRepresentation | UserTaskFilterRepresentation;
    attachedContent: ContentLinkModel;
    processFilters: UserProcessInstanceFilterRepresentation[];
    taskFilters: UserTaskFilterRepresentation[];
    selectedTask: TaskRepresentation;
    selectedProcess: ProcessInstanceRepresentation;
    isProcessServicesInfoDrawerOpened: boolean;
    areInfoDrawerCommentsFocused: boolean;
}

export const processServicesExtensionInitialState: ProcessServiceExtensionState = {
    health: false,
    processManagementExpanded: false,
    selectedFilter: undefined,
    attachedContent: undefined,
    processFilters: [],
    taskFilters: [],
    selectedTask: undefined,
    selectedProcess: undefined,
    isProcessServicesInfoDrawerOpened: false,
    areInfoDrawerCommentsFocused: false
};

const processServicesExtensionReducer = createReducer(
    processServicesExtensionInitialState,
    on(updateProcessServiceHealth, (state, { health }) => ({
        ...state,
        health,
    })),
    on(ProcessServicesExtActions.selectFilterAction, (state, action) => ({
        ...state,
        selectedFilter: action.filter,
    })),
    on(ProcessServicesExtActions.resetSelectedFilterAction, (state) => ({
        ...state,
        selectedFilter: undefined,
    })),
    on(ProcessServicesExtActions.toggleProcessManagement, (state, action) => ({
        ...state,
        processManagementExpanded: action.expanded,
    })),
    on(ProcessServicesExtActions.showAttachedContentPreviewAction, (state, action) => ({
        ...state,
        attachedContent: action.content,
    })),
    on(ProcessServicesExtActions.setProcessFiltersAction, (state, action) => ({
        ...state,
        processFilters: action.filters,
    })),
    on(ProcessServicesExtActions.setTaskFiltersAction, (state, action) => ({
        ...state,
        taskFilters: action.filters,
    })),
    on(TaskDetailsExtActions.setTaskDetails, (state, action) => ({
        ...state,
        selectedTask: new TaskRepresentation(action.taskDetails),
    })),
    on(TaskDetailsExtActions.resetSelectedTask, (state) => ({
        ...state,
        selectedTask: undefined,
    })),
    on(ProcessDetailsExtActions.setSelectedProcess, (state, action) => ({
        ...state,
        selectedProcess: action.processInstance,
    })),
    on(ProcessDetailsExtActions.resetSelectedProcess, (state) => ({
        ...state,
        selectedProcess: undefined,
    })),
    on(ProcessServicesExtActions.toggleProcessServicesInfoDrawerAction, (state) => ({
        ...state,
        isProcessServicesInfoDrawerOpened: !state.isProcessServicesInfoDrawerOpened
    })),
    on(ProcessServicesExtActions.resetProcessServicesInfoDrawerAction, (state) => ({
        ...state,
        isProcessServicesInfoDrawerOpened: false,
        areInfoDrawerCommentsFocused: false
    })),
    on(ProcessServicesExtActions.toggleProcessServicesCommentsAction, (state) => ({
        ...state,
        areInfoDrawerCommentsFocused: true,
        isProcessServicesInfoDrawerOpened: true
    })),
    on(ProcessServicesExtActions.switchProcessServicesInfoDrawerFocusedTabAction, (state, action = null) => ({
        ...state,
        areInfoDrawerCommentsFocused: action.focused === null ? !state.areInfoDrawerCommentsFocused : action.focused
    }))
);

export function reducer(state: ProcessServiceExtensionState | undefined, action: Action) {
    return processServicesExtensionReducer(state, action);
}
