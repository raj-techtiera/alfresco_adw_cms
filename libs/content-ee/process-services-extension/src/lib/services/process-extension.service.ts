/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {inject, Injectable} from '@angular/core';
import { AppConfigService, AuthenticationService } from '@alfresco/adf-core';
import { DiscoveryApiService, AlfrescoApiService } from '@alfresco/adf-content-services';
import { Observable } from 'rxjs/internal/Observable';
import { map, catchError, filter, tap, switchMap, take } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { BehaviorSubject, of } from 'rxjs';
import { ProcessServicesExtActions } from '../process-services-ext-actions-types';
import {
    ContentActionRef,
    ContentActionType,
    ExtensionService,
    NavigationState,
    ProfileState,
    reduceEmptyMenus,
    reduceSeparators,
    RuleContext,
    RuleEvaluator,
    SelectionState,
    sortByOrder
} from '@alfresco/adf-extensions';
import { getRuleContext } from '@alfresco/aca-shared/store';
import { ProcessInstanceRepresentation, RepositoryInfo, TaskRepresentation } from '@alfresco/js-api';
import { NodePermissionService } from '@alfresco/aca-shared';
import { getProcessServicesSelection } from '../process-services-ext.selector';
import { ProcessService, TaskListService } from '@alfresco/adf-process-services';

@Injectable({
    providedIn: 'root',
})
export class ProcessExtensionService implements RuleContext {
    navigation: NavigationState = {};
    profile: ProfileState;
    repository: RepositoryInfo;
    selection: SelectionState;
    _toolbarActions = new BehaviorSubject<Array<ContentActionRef>>([]);

    auth = inject(AuthenticationService);

    private store = inject(Store);
    private apiService = inject(AlfrescoApiService);
    private discoveryApiService = inject(DiscoveryApiService);
    private extensions = inject(ExtensionService);
    private taskListService = inject(TaskListService);
    private processListService = inject(ProcessService);

    public appConfig = inject(AppConfigService);
    public permissions = inject(NodePermissionService);

    private _processServicesRunning = false;
    get processServicesRunning(): boolean {
        return this._processServicesRunning;
    }

    constructor() {
        this.store.select(getRuleContext).subscribe((result) => {
            this.navigation = result.navigation;
            this.selection = result.selection;
            this.store.select(getProcessServicesSelection).subscribe((selection) => {
                this.selection = { ...this.selection, ...selection } as SelectionState;
                this._toolbarActions.next(this.getToolbarEntries());

            });
            this.repository = result.repository;
            this.profile = result.profile;
            this._toolbarActions.next(this.getToolbarEntries());
        });
    }

    getAllowedToolbarActions(): Observable<Array<ContentActionRef>> {
        return this._toolbarActions.pipe(map((toolbarActions) => this.getAllowedActions(toolbarActions)));
    }

    getEvaluator(key: string): RuleEvaluator {
        return this.extensions.getEvaluator(key);
    }

    getToolbarEntries(): ContentActionRef[] {
        return this.extensions
            .getElements<ContentActionRef>('features.toolbar', [])
            .filter((entry) => this.filterVisible(entry))
            .map((entry) => ({
                ...entry,
                children: (entry.children || [])
                    .filter((child) => this.filterVisible(child)),
            }));

    }

    getTaskListContextMenuEntries(): ContentActionRef[] {
        return this.extensions.getElements<ContentActionRef>('features.taskListContextMenu', []);
    }

    getProcessListContextMenuEntries(): ContentActionRef[] {
        return this.extensions.getElements<ContentActionRef>('features.processListContextMenu', []);
    }

    private filterVisible(entry: ContentActionRef): boolean {
        if (entry?.rules?.visible) {
            return Array.isArray(entry.rules?.visible) ?
                !entry.rules.visible.some((visible) => !this.extensions.evaluateRule(visible, this)) :
                this.extensions.evaluateRule(entry.rules.visible, this);
        }
        return true;
    }

    private getAllowedActions(actions: ContentActionRef[]): ContentActionRef[] {
        return (actions || [])
          .filter((action) => this.filterVisible(action))
          .map((action) => {
            if (action.type === ContentActionType.menu) {
              const copy = this.copyAction(action);
              if (copy.children && copy.children.length > 0) {
                copy.children = copy.children
                  .filter((entry) => !entry.disabled)
                  .filter((childAction) => this.filterVisible(childAction))
                  .sort(sortByOrder)
                  .reduce(reduceSeparators, []);
              }
              return copy;
            }
            return action;
          })
          .map((action) => this.setActionDisabledFromRule(action))
          .reduce(reduceEmptyMenus, [])
          .reduce(reduceSeparators, []);
    }

    private setActionDisabledFromRule(action: ContentActionRef) {
        let disabled = false;

        if (action?.rules?.enabled) {
          disabled = !this.extensions.evaluateRule(action.rules.enabled, this);
        }

        return {
          ...action,
          disabled
        };
    }

    copyAction(action: ContentActionRef): ContentActionRef {
        return {
          ...action,
          children: (action.children || []).map((child) => this.copyAction(child))
        };
    }

    checkBackendHealth(): Observable<boolean> {
        return this.apiService.alfrescoApiInitialized.pipe(
            filter((status) => status),
            filter(() => this.auth.isLoggedIn()),
            take(1),
            switchMap(() => this.discoveryApiService.getBPMSystemProperties()),
            map((response) => !!response),
            tap((health) => {
                this._processServicesRunning = health;
                this.store.dispatch(
                    ProcessServicesExtActions.serviceRunningAction({
                        running: health,
                    })
                );
            }),
            catchError(() => {
                this._processServicesRunning = false;
                return of(false);
            })
        );
    }

    getTaskDetails(taskId: string): Observable<TaskRepresentation> {
        return this.taskListService.getTaskDetails(taskId);
    }

    getProcessDetails(processId: string): Observable<ProcessInstanceRepresentation> {
        return this.processListService.getProcess(processId);
    }
}
