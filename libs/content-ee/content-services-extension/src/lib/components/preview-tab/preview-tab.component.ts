/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { Node } from '@alfresco/js-api';
import { AlfrescoViewerComponent } from '@alfresco/adf-content-services';
import { AppExtensionService, ViewerExtensionRef } from '@alfresco/adf-extensions';
import { normalizeAlfrescoNodeId } from '../../utils/normalize-alfresco-node-id';

@Component({
    standalone: true,
    imports: [AlfrescoViewerComponent],
    selector: 'adw-preview-tab',
    templateUrl: './preview-tab.component.html',
    styleUrls: ['./preview-tab.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: { class: 'adw-preview-tab' }
})
export class PreviewTabComponent implements OnInit, OnDestroy {
    @Input() node: Node;

    /** ACS GET /nodes/{id} expects a UUID; strip `uuid@tenant` when present. */
    get viewerNodeId(): string {
        return normalizeAlfrescoNodeId(this.node?.id);
    }

    private aevExtension: ViewerExtensionRef | undefined;
    private originalFileExtension: string;

    constructor(private appExtensionService: AppExtensionService) {}

    ngOnInit(): void {
        // Temporarily disable the AEV wildcard viewer extension so the
        // standard ADF viewer is used in the preview tab.
        const extensions = this.appExtensionService.getViewerExtensions();
        this.aevExtension = extensions?.find(ext => ext.fileExtension === '*');
        if (this.aevExtension) {
            this.originalFileExtension = this.aevExtension.fileExtension;
            this.aevExtension.fileExtension = '__disabled__';
        }
    }

    ngOnDestroy(): void {
        // Restore the AEV extension so the full-page viewer still uses it.
        if (this.aevExtension) {
            this.aevExtension.fileExtension = this.originalFileExtension;
        }
    }
}
