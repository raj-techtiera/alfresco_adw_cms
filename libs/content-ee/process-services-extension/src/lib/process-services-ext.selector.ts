/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProcessServiceExtensionState } from './store/reducers/process-services.reducer';
import { UserProcessInstanceFilterRepresentation, UserTaskFilterRepresentation } from '@alfresco/js-api';

const defaultTaskFilterName = 'My Tasks';
const defaultProcessFilterName = 'Running';

export const selectProcessServiceExt = createFeatureSelector<ProcessServiceExtensionState>('processServices');

export const isProcessManagementExpanded = createSelector(selectProcessServiceExt, (processServiceExt) => processServiceExt.processManagementExpanded);

export const getSelectedFilter = createSelector(selectProcessServiceExt, (processServiceExt) => processServiceExt.selectedFilter);

export const getAttachedContent = createSelector(selectProcessServiceExt, (processServiceExt) => processServiceExt.attachedContent);

export const getProcessFilters = createSelector(selectProcessServiceExt, (processServiceExt) => processServiceExt.processFilters);

export const getTaskFilters = createSelector(selectProcessServiceExt, (processServiceExt) => processServiceExt.taskFilters);

export const getDefaultTaskFilter = createSelector(getTaskFilters, (taskFiltersState: UserTaskFilterRepresentation[]) => {
    const defaultFilter = taskFiltersState.find((filter) => filter.name === defaultTaskFilterName);
    return defaultFilter ? defaultFilter : taskFiltersState[0];
});

export const getDefaultProcessFilter = createSelector(getProcessFilters, (processFiltersState: UserProcessInstanceFilterRepresentation[]) => {
    const defaultFilter = processFiltersState.find((filter) => filter.name === defaultProcessFilterName);
    return defaultFilter ? defaultFilter : processFiltersState[0];
});

export const getSelectedTask = createSelector(selectProcessServiceExt, (processServiceExt) => processServiceExt.selectedTask);

export const getSelectedProcess = createSelector(selectProcessServiceExt, (processServiceExt) => processServiceExt.selectedProcess);

export const getTaskFilterById = createSelector(getTaskFilters, (taskFiltersState: UserTaskFilterRepresentation[], props: { id: number }) => {
    return taskFiltersState.find((filter) => filter.id === props.id);
});

export const getProcessFilterById = createSelector(getProcessFilters, (processFiltersState: UserProcessInstanceFilterRepresentation[], props: { id: number }) => {
    return processFiltersState.find((filter) => filter.id === props.id);
});

export const isProcessServicesInfoDrawerOpened = createSelector(selectProcessServiceExt, (processServiceExt) => processServiceExt.isProcessServicesInfoDrawerOpened);

export const areInfoDrawerCommentsFocused = createSelector(selectProcessServiceExt, (processServiceExt) => processServiceExt.areInfoDrawerCommentsFocused);

export const getProcessServicesSelection = createSelector(
    getSelectedTask,
    getSelectedProcess,
    (task, process) => ({
        task,
        process
    })
);
