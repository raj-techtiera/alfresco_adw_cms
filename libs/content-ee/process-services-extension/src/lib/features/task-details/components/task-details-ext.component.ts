/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { TaskFormComponent } from '@alfresco/adf-process-services';
import { Store } from '@ngrx/store';
import { ProcessServicesExtActions } from '../../../process-services-ext-actions-types';
import {
    ContainerModel,
    ContentLinkModel,
    FormFieldModel,
    FormFieldTypes,
    FormModel,
    FormOutcomeEvent,
    IconComponent,
    NotificationService,
    TabModel,
    ToolbarComponent,
    ToolbarTitleComponent
} from '@alfresco/adf-core';
import { Observable } from 'rxjs';
import { getSelectedTask } from '../../../process-services-ext.selector';
import { TaskDetailsExtActions } from '../../../store/task-details-ext-actions-types';
import { ProcessServiceExtensionState } from '../../../store/reducers/process-services.reducer';
import { TaskRepresentation } from '@alfresco/js-api';
import { PageLayoutComponent, PageLayoutContentComponent, PageLayoutHeaderComponent } from '@alfresco/aca-shared';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ArenderRedirectService } from '../../../services/arender-redirect.service';
import { CAD_VIEWER_OPENER, CadViewerOpener } from '../../../services/cad-viewer-opener';

@Component({
    selector: 'aps-task-details-ext',
    standalone: true,
    imports: [
        CommonModule,
        PageLayoutHeaderComponent,
        PageLayoutComponent,
        PageLayoutContentComponent,
        TranslatePipe,
        MatIconModule,
        ToolbarTitleComponent,
        IconComponent,
        MatButtonModule,
        TaskFormComponent,
        ToolbarComponent
    ],
    templateUrl: './task-details-ext.component.html',
    styleUrls: ['./task-details-ext.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class TaskDetailsExtComponent implements OnInit, OnDestroy {
    static SAVE_OUTCOME_ID = '$save';

    @ViewChild('adfTaskForm', { static: true })
    adfTaskForm: TaskFormComponent;

    appId = null;
    taskId: string;
    taskDetails$: Observable<TaskRepresentation>;
    private readonly cadViewer: CadViewerOpener | null = inject(CAD_VIEWER_OPENER, { optional: true });

    constructor(
        private route: ActivatedRoute,
        private location: Location,
        private store: Store<ProcessServiceExtensionState>,
        private readonly notificationService: NotificationService,
        private readonly arenderRedirect: ArenderRedirectService
    ) {}

    ngOnInit() {
        this.route.params.subscribe((params) => {
            this.appId = +params['appId'];
            this.taskId = params['taskId'];
            if (this.taskId) {
                this.loadTaskDetails(this.taskId);
            }
            this.taskDetails$ = this.store.select(getSelectedTask);
        });
    }

    loadTaskDetails(taskId: string) {
        this.store.dispatch(TaskDetailsExtActions.loadTaskDetails({ taskId: taskId }));
    }

    onFormLoaded(form: FormModel) {
        this.splitFormIntoTabs(form);
        if (this.adfTaskForm.isReadOnlyForm() && !this.adfTaskForm.isCompletedTask() && !this.adfTaskForm.isTaskClaimable()) {
            this.notificationService.showWarning('PROCESS-EXTENSION.ERROR.TASK_ACCESS_WARNING');
        }
    }

    /**
     * Splits a flat form into two tabs: document-related sections (attachments,
     * document links) go to the "Documents" tab, everything else (e.g. Document
     * Details, General Approver) goes to the "Details" tab.
     */
    private splitFormIntoTabs(form: FormModel): void {
        if (!form || form.hasTabs() || !form.fields?.length) {
            return;
        }

        const detailsTab = new TabModel(form, { id: 'taskDetailsTab', title: 'PROCESS-EXTENSION.TASK_FORM.TABS.DETAILS' });
        const documentsTab = new TabModel(form, { id: 'taskDocumentsTab', title: 'PROCESS-EXTENSION.TASK_FORM.TABS.DOCUMENTS' });

        form.fields.forEach((rootField) => {
            const targetTab = this.isDocumentsSection(rootField) ? documentsTab : detailsTab;
            targetTab.fields.push(rootField);
        });

        if (detailsTab.hasContent() && documentsTab.hasContent()) {
            form.tabs = [detailsTab, documentsTab];
        }
    }

    private isDocumentsSection(rootField: ContainerModel | FormFieldModel): boolean {
        const documentFieldTypes = [FormFieldTypes.UPLOAD, FormFieldTypes.DOCUMENT, FormFieldTypes.HYPERLINK, FormFieldTypes.ALFRESCO_FILE_VIEWER];
        return (rootField.columns || []).some((column) => (column.fields || []).some((field) => documentFieldTypes.includes(field.type)));
    }

    onFormCompleted() {
        this.notificationService.showInfo('PROCESS-EXTENSION.TASK_FORM.FORM_COMPLETED');
        this.navigateToDefaultTaskFilter();
    }

    onFormOutcomeExecute(outcome: FormOutcomeEvent) {
        if (outcome.outcome.id === TaskDetailsExtComponent.SAVE_OUTCOME_ID) {
            this.notificationService.showInfo('PROCESS-EXTENSION.TASK_FORM.FORM_SAVED');
        }
    }

    onCompleteTaskForm() {
        this.notificationService.showInfo('PROCESS-EXTENSION.TASK_FORM.FORM_COMPLETED');
        this.navigateToDefaultTaskFilter();
    }

    onContentClick(content: ContentLinkModel): void {
        if (content.sourceId) {
            if (this.isDwgDocument(content.name, content.mimeType)) {
                void this.openDwgInMlight(content);
                return;
            }
            void this.arenderRedirect.openDocument(content.sourceId).catch(() => {
                this.notificationService.showError('PROCESS-EXTENSION.ERROR.ARENDER_REDIRECT_FAILED');
            });
            return;
        }

        // Activiti `/content/{id}/raw` Office binaries cannot be previewed (hex dump / X-Frame-Options: DENY).
        if (this.isUnsupportedPreviewContent(content)) {
            this.notificationService.showError('PROCESS-EXTENSION.ERROR.PREVIEW_UNSUPPORTED');
            return;
        }

        this.store.dispatch(
            ProcessServicesExtActions.showAttachedContentPreviewAction({
                content
            })
        );
    }

    private isDwgDocument(name?: string | null, mimeType?: string | null): boolean {
        if (/\.dwg$/i.test(String(name ?? '').trim())) {
            return true;
        }
        const mime = String(mimeType ?? '')
            .split(';')[0]
            .trim()
            .toLowerCase();
        return mime.includes('dwg');
    }

    private async openDwgInMlight(content: ContentLinkModel): Promise<void> {
        if (!this.cadViewer) {
            this.notificationService.showError('PROCESS-EXTENSION.ERROR.MLIGHT_OPEN_FAILED');
            return;
        }
        try {
            await this.cadViewer.openDocument(content.sourceId, {
                name: content.name,
                mimeType: content.mimeType
            });
        } catch {
            this.notificationService.showError('PROCESS-EXTENSION.ERROR.MLIGHT_OPEN_FAILED');
        }
    }

    /** Office / non-image-or-pdf Activiti attachments that the in-app viewer cannot render. */
    private isUnsupportedPreviewContent(content: ContentLinkModel): boolean {
        if (!content) {
            return false;
        }

        const simpleType = (content.simpleType || '').toLowerCase();
        if (['word', 'excel', 'powerpoint'].includes(simpleType)) {
            return true;
        }

        const mime = (content.mimeType || content.contentBlob?.type || '').toLowerCase();
        if (
            mime.includes('officedocument') ||
            mime.includes('msword') ||
            mime.includes('ms-excel') ||
            mime.includes('ms-powerpoint')
        ) {
            return true;
        }

        if (/\.(docx?|xlsx?|pptx?)$/i.test(content.name || '')) {
            return true;
        }

        if (content.contentBlob) {
            if (typeof content.isTypeImage === 'function' && content.isTypeImage()) {
                return false;
            }
            if (typeof content.isTypePdf === 'function' && content.isTypePdf()) {
                return false;
            }
            if (simpleType === 'image' || simpleType === 'pdf') {
                return false;
            }
            const blobType = (content.contentBlob.type || '').toLowerCase();
            if (blobType.startsWith('image/') || blobType === 'application/pdf') {
                return false;
            }
            return true;
        }

        return false;
    }

    onCloseForm() {
        this.location.back();
    }

    onClaim() {
        this.adfTaskForm.loadTask(this.taskId);
        this.store.dispatch(TaskDetailsExtActions.reloadTaskDetails({ taskId: this.taskId }));
        this.notificationService.showInfo('PROCESS-EXTENSION.TASK_FORM.CLAIM_TASK');
    }

    onUnClaim() {
        this.navigateToDefaultTaskFilter();
        this.notificationService.showInfo('PROCESS-EXTENSION.TASK_FORM.UNCLAIM_TASK');
    }

    onError() {
        this.notificationService.showError('PROCESS-EXTENSION.TASK_FORM.CLAIM_FAILED');
    }

    navigateToDefaultTaskFilter(): void {
        this.store.dispatch(ProcessServicesExtActions.navigateToDefaultTaskFilter({}));
    }

    ngOnDestroy() {
        this.store.dispatch(TaskDetailsExtActions.resetSelectedTask());
    }
}
