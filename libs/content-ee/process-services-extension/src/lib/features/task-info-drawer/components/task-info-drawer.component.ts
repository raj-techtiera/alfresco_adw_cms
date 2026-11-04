/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { AuthenticationService, CardViewUpdateService, InfoDrawerComponent, InfoDrawerTabComponent, NotificationService } from '@alfresco/adf-core';
import { AlfrescoApiService } from '@alfresco/adf-content-services';
import { ProcessServiceExtensionState } from '../../../store/reducers/process-services.reducer';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, from, Subject, switchMap } from 'rxjs';
import { TaskDetailsExtActions } from '../../../store/task-details-ext-actions-types';
import { LightUserRepresentation, RestVariable, TaskRepresentation, TaskVariablesApi } from '@alfresco/js-api';
import { CommonModule, NgIf } from '@angular/common';
import {
    PeopleProcessService,
    TaskCommentsComponent,
    TaskHeaderComponent,
    TaskListService
} from '@alfresco/adf-process-services';
import { areInfoDrawerCommentsFocused, getSelectedTask } from '../../../process-services-ext.selector';
import { resetProcessServicesInfoDrawerAction, switchProcessServicesInfoDrawerFocusedTabAction } from '../../../actions/process-services-ext.actions';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
    selector: 'aps-task-info-drawer',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        InfoDrawerComponent,
        InfoDrawerTabComponent,
        TaskHeaderComponent,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatProgressSpinnerModule,
        NgIf,
        TranslatePipe,
        MatProgressBarModule,
        TaskCommentsComponent
    ],
    templateUrl: './task-info-drawer.component.html',
    styleUrls: ['./task-info-drawer.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: { class: 'aps-task-info-drawer' }
})
export class TaskInfoDrawerComponent implements OnInit, OnChanges, OnDestroy {
    @Input()
    taskDetails: TaskRepresentation;

    @Input()
    isLoading: boolean;

    /** Optional explicit task id (e.g. selected row id) when taskDetails is still loading. */
    @Input()
    taskId: string | null = null;

    editMode = false;
    changedProperties: Partial<TaskRepresentation> = {};
    hasMetadataChanged = false;
    resetChangesEvent = new Subject<void>();

    /** Users from Activiti `/api/enterprise/users`. */
    reassignUsers: LightUserRepresentation[] = [];
    /** Preselected / chosen assignee id for the Reassign dropdown. */
    selectedAssigneeId: number | string | null = null;
    /** Filters options inside the assignee select panel. */
    assigneeSearch = '';
    /** Reason required before reassignment. */
    reassignReason = '';
    loadingUsers = false;
    reassignSubmitting = false;

    /** 0 = Details, 1 = Comments, 2 = Reassign */
    protected selectedTabIndex = 0;

    private readonly destroyRef = inject(DestroyRef);
    private usersLoadedForTaskId: string | null = null;
    private taskVariablesApi: TaskVariablesApi | null = null;
    private selectedTaskFromStore: TaskRepresentation | null = null;

    constructor(
        private store: Store<ProcessServiceExtensionState>,
        private cardViewUpdateService: CardViewUpdateService,
        private peopleProcessService: PeopleProcessService,
        private taskListService: TaskListService,
        private notificationService: NotificationService,
        private alfrescoApiService: AlfrescoApiService,
        private authService: AuthenticationService,
        private route: ActivatedRoute,
        private router: Router
    ) {
        this.store
            .select(areInfoDrawerCommentsFocused)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((focused) => {
                // Store only tracks Details vs Comments; keep Reassign selected unless comments are forced open.
                if (focused) {
                    this.selectedTabIndex = 1;
                } else if (this.selectedTabIndex !== 2) {
                    this.selectedTabIndex = 0;
                }
            });

        this.store
            .select(getSelectedTask)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((task) => {
                this.selectedTaskFromStore = task ?? null;
            });
    }

    ngOnInit(): void {
        this.cardViewUpdateService.itemUpdated$.pipe(debounceTime(500), takeUntilDestroyed(this.destroyRef)).subscribe((res) => {
            this.changedProperties = { ...this.changedProperties, ...res.changed };
            this.hasMetadataChanged = true;
        });
        this.syncSelectedAssigneeFromTask();
        this.loadReassignUsers();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['taskDetails']) {
            this.syncSelectedAssigneeFromTask();
            this.loadReassignUsers(true);
        }
    }

    get hasMatchingAssignees(): boolean {
        return this.reassignUsers.some((user) => this.matchesAssigneeSearch(user));
    }

    get canSubmitReassign(): boolean {
        if (this.reassignSubmitting || !!this.taskDetails?.endDate) {
            return false;
        }
        if (!this.reassignReason.trim()) {
            return false;
        }
        if (this.selectedAssigneeId == null || this.selectedAssigneeId === '') {
            return false;
        }
        const currentId = this.taskDetails?.assignee?.id;
        if (currentId == null) {
            return true;
        }
        return String(this.selectedAssigneeId) !== String(currentId);
    }

    formatUserName(user: LightUserRepresentation | null | undefined): string {
        if (!user) {
            return '';
        }
        const name = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
        if (name) {
            return name;
        }
        if (user.email) {
            return String(user.email);
        }
        return user.id != null ? String(user.id) : '';
    }

    matchesAssigneeSearch(user: LightUserRepresentation | null | undefined): boolean {
        if (!user) {
            return false;
        }
        const q = this.assigneeSearch.trim().toLowerCase();
        if (!q) {
            return true;
        }
        const haystack = [
            this.formatUserName(user),
            user.email,
            this.resolveAssigneeName(user),
            user.id != null ? String(user.id) : ''
        ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
        return haystack.includes(q);
    }

    onAssigneeSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement | null;
        this.assigneeSearch = target?.value ?? '';
    }

    onAssigneeSelectOpened(opened: boolean, searchInput?: HTMLInputElement): void {
        if (!opened) {
            this.assigneeSearch = '';
            return;
        }
        this.assigneeSearch = '';
        setTimeout(() => {
            searchInput?.focus();
            searchInput?.select?.();
        }, 0);
    }

    toggleEditing() {
        this.editMode = true;
    }

    onTabChange(event: number) {
        this.selectedTabIndex = event;
        if (event === 0 || event === 1) {
            this.store.dispatch(switchProcessServicesInfoDrawerFocusedTabAction({ focused: event === 1 }));
        }
        if (event === 2) {
            this.loadReassignUsers();
        }
    }

    saveChanges() {
        this.updateTaskDetails(this.changedProperties);
        this.editMode = false;
        this.hasMetadataChanged = false;
        this.changedProperties = {};
    }

    resetChanges() {
        this.resetChangesEvent.next();
        this.editMode = false;
        this.hasMetadataChanged = false;
        this.changedProperties = {};
    }

    submitReassign(): void {
        const taskId = this.resolveCurrentTaskId();
        if (!taskId || !this.canSubmitReassign) {
            if (!this.reassignReason.trim()) {
                this.notificationService.showInfo('PROCESS-EXTENSION.TASK_DETAILS.REASSIGN.REASON_REQUIRED');
            } else if (!this.canSubmitReassign && this.selectedAssigneeId != null) {
                this.notificationService.showInfo('PROCESS-EXTENSION.TASK_DETAILS.REASSIGN.NO_CHANGE');
            }
            return;
        }

        const previousAssignee = this.resolveAssigneeName(this.taskDetails?.assignee as LightUserRepresentation | undefined);
        const nextUser = this.reassignUsers.find((u) => String(u.id) === String(this.selectedAssigneeId));
        const reassignedAssignee = this.resolveAssigneeName(nextUser);
        const initiatedBy = this.authService.getUsername()?.trim() || '';

        if (!previousAssignee || !reassignedAssignee || !initiatedBy) {
            this.notificationService.showError('PROCESS-EXTENSION.TASK_DETAILS.REASSIGN.FAILED');
            return;
        }

        const variables = this.buildReassignVariables(
            this.reassignReason.trim(),
            initiatedBy,
            previousAssignee,
            reassignedAssignee
        );

        this.reassignSubmitting = true;
        // POST /api/enterprise/tasks/{currentTaskId}/variables then assign
        from(this.getTaskVariablesApi().createTaskVariable(taskId, variables as unknown as RestVariable))
            .pipe(switchMap(() => this.taskListService.assignTaskByUserId(taskId, String(this.selectedAssigneeId))))
            .subscribe({
                next: () => {
                    this.reassignSubmitting = false;
                    this.reassignReason = '';
                    this.notificationService.showInfo('PROCESS-EXTENSION.TASK_DETAILS.REASSIGN.SUCCESS');
                    window.location.reload();
                },
                error: () => {
                    this.reassignSubmitting = false;
                    this.notificationService.showError('PROCESS-EXTENSION.TASK_DETAILS.REASSIGN.FAILED');
                }
            });
    }

    /**
     * Resolve the live task id for API calls (never a hardcoded sample id).
     * Prefer selected task details, then explicit input, route `/task-details/:taskId`, store, URL.
     */
    private resolveCurrentTaskId(): string {
        const candidates = [
            this.taskDetails?.id,
            this.taskId,
            this.selectedTaskFromStore?.id,
            this.route.snapshot.paramMap.get('taskId'),
            this.findParamInRouteTree('taskId'),
            this.parseIdFromRouterUrl('task-details')
        ];

        for (const candidate of candidates) {
            const id = candidate != null ? String(candidate).trim() : '';
            if (id) {
                return id;
            }
        }
        return '';
    }

    private findParamInRouteTree(paramName: string): string | null {
        let current: ActivatedRoute | null = this.route;
        while (current) {
            const value = current.snapshot.paramMap.get(paramName);
            if (value) {
                return value;
            }
            current = current.parent;
        }
        return null;
    }

    private parseIdFromRouterUrl(segment: string): string | null {
        const url = this.router.url || '';
        const match = url.match(new RegExp(`/${segment}/([^/?#]+)`));
        return match?.[1] ? decodeURIComponent(match[1]) : null;
    }

    private buildReassignVariables(
        reason: string,
        initiatedBy: string,
        previousAssignee: string,
        reassignedAssignee: string
    ): RestVariable[] {
        return [
            { name: 'reassignReason', value: reason, type: 'string', scope: 'global' },
            { name: 'reassignInitiatedBy', value: initiatedBy, type: 'string', scope: 'global' },
            { name: 'isForceReassignment', value: true, type: 'boolean', scope: 'global' },
            { name: 'previousAssignee', value: previousAssignee, type: 'string', scope: 'global' },
            { name: 'reassignedAssignee', value: reassignedAssignee, type: 'string', scope: 'global' }
        ];
    }

    /** Display/login name for reassign variables (never full email). */
    private resolveAssigneeName(user: LightUserRepresentation | null | undefined): string {
        if (!user) {
            return '';
        }
        const displayName = this.formatUserName(user);
        if (displayName && !displayName.includes('@')) {
            return displayName;
        }
        const anyUser = user as LightUserRepresentation & { username?: string; userName?: string };
        const login = String(anyUser.username || anyUser.userName || '').trim();
        if (login) {
            return login;
        }
        const email = String(user.email || '').trim();
        if (email.includes('@')) {
            return email.split('@')[0];
        }
        return email || displayName;
    }

    private getTaskVariablesApi(): TaskVariablesApi {
        this.taskVariablesApi = this.taskVariablesApi ?? new TaskVariablesApi(this.alfrescoApiService.getInstance());
        return this.taskVariablesApi;
    }

    private syncSelectedAssigneeFromTask(task: TaskRepresentation = this.taskDetails): void {
        const id = task?.assignee?.id;
        this.selectedAssigneeId = id != null ? id : null;
    }

    private loadReassignUsers(force = false): void {
        const taskId = this.resolveCurrentTaskId();
        if (!taskId) {
            return;
        }
        if (!force && this.usersLoadedForTaskId === taskId && this.reassignUsers.length > 0) {
            this.ensureCurrentAssigneeInList();
            return;
        }

        this.loadingUsers = true;
        // GET /activiti-app/api/enterprise/users (via ADF UsersApi).
        this.peopleProcessService.getWorkflowUsers(undefined, undefined).subscribe({
            next: (users) => {
                this.loadingUsers = false;
                this.reassignUsers = Array.isArray(users) ? [...users] : [];
                this.usersLoadedForTaskId = taskId;
                this.ensureCurrentAssigneeInList();
                this.syncSelectedAssigneeFromTask();
            },
            error: () => {
                this.loadingUsers = false;
                this.notificationService.showError('PROCESS-EXTENSION.TASK_DETAILS.REASSIGN.FAILED_USERS');
            }
        });
    }

    /** Keep the current assignee visible/selectable even if missing from the users page. */
    private ensureCurrentAssigneeInList(): void {
        this.ensureCurrentAssigneeInListFor(this.taskDetails);
    }

    private ensureCurrentAssigneeInListFor(task: TaskRepresentation | undefined): void {
        const current = task?.assignee as LightUserRepresentation | undefined;
        if (!current?.id) {
            return;
        }
        const exists = this.reassignUsers.some((u) => String(u.id) === String(current.id));
        if (!exists) {
            this.reassignUsers = [current, ...this.reassignUsers];
        }
    }

    private updateTaskDetails(updatedNotification: Partial<TaskRepresentation>) {
        this.store.dispatch(
            TaskDetailsExtActions.updateTaskDetails({
                taskId: this.taskDetails.id,
                taskDetails: this.taskDetails,
                updatedNotification: updatedNotification
            })
        );
    }

    ngOnDestroy(): void {
        this.store.dispatch(resetProcessServicesInfoDrawerAction());
    }
}
