/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, WidgetComponent } from '@alfresco/adf-core';
import { DataColumnComponent, DataColumnListComponent } from '@alfresco/adf-core';
import {
    ContentActionComponent,
    ContentActionListComponent,
    DocumentListComponent,
    UploadButtonComponent
} from '@alfresco/adf-content-services';
import { MatIconModule } from '@angular/material/icon';
import { ArenderRedirectService } from '../../../services/arender-redirect.service';

@Component({
    selector: 'aps-attachment-viewer-widget',
    standalone: true,
    imports: [
        CommonModule,
        DocumentListComponent,
        DataColumnComponent,
        DataColumnListComponent,
        ContentActionComponent,
        ContentActionListComponent,
        UploadButtonComponent,
        MatIconModule
    ],
    templateUrl: './attachment-viewer.component.html',
    styleUrls: ['./attachment-viewer.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AttachmentViewerComponent extends WidgetComponent implements OnInit {
    @ViewChild(DocumentListComponent)
    documentList: DocumentListComponent;

    folderId: string | null = null;

    constructor(
        private readonly arenderRedirect: ArenderRedirectService,
        private readonly notificationService: NotificationService
    ) {
        super();
    }

    ngOnInit(): void {
        this.folderId = this.resolveFolderId();
    }

    private resolveFolderId(): string | null {
        // 1. Direct value from widget params
        if (this.field?.params?.['folderId']) {
            return this.field.params['folderId'];
        }

        // 2. Widget's own field value
        if (this.field?.value) {
            return this.field.value;
        }

        // 3. Configurable: read from a sibling field referenced by params.folderIdField
        if (this.field?.params?.['folderIdField'] && this.field?.form) {
            const siblingField = this.field.form.getFieldById(this.field.params['folderIdField']);
            if (siblingField?.value) {
                return siblingField.value;
            }
        }

        // 4. Fallback: scan sibling fields for one named "folderid" (case-insensitive)
        if (this.field?.form) {
            const allFields = this.field.form.getFormFields();
            const folderField = allFields.find(
                (f) => f.id !== this.field.id && /folder.?id/i.test(f.name || f.id || '')
            );
            if (folderField?.value) {
                return folderField.value;
            }
        }

        return null;
    }

    onNodeClick(event: any): void {
        const entry = event?.value?.entry;
        if (entry && !entry.isFolder) {
            void this.arenderRedirect.openDocument(entry.id).catch(() => {
                this.notificationService.showError('PROCESS-EXTENSION.ERROR.ARENDER_REDIRECT_FAILED');
            });
        }
    }

    onUploadSuccess(): void {
        this.documentList?.reload();
    }

    onDownload(node: any): void {
        window.open(`/alfresco/api/-default-/public/alfresco/versions/1/nodes/${node?.entry?.id}/content?attachment=true`, '_blank');
    }

    onDelete(): void {
        this.documentList?.reload();
    }
}
