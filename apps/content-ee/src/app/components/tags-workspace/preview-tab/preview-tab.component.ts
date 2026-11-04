/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { AlfrescoViewerComponent } from '@alfresco/adf-content-services';
import { AppExtensionService, ViewerExtensionRef } from '@alfresco/adf-extensions';
import { Node } from '@alfresco/js-api';

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

    private aevExtension: ViewerExtensionRef | undefined;
    private originalFileExtension: string;

    constructor(private appExtensionService: AppExtensionService) {}

    ngOnInit(): void {
        // Temporarily disable the wildcard viewer override so the standard
        // inline ADF viewer is used inside the sidebar preview tab.
        const extensions = this.appExtensionService.getViewerExtensions();
        this.aevExtension = extensions?.find((extension) => extension.fileExtension === '*');
        if (this.aevExtension) {
            this.originalFileExtension = this.aevExtension.fileExtension;
            this.aevExtension.fileExtension = '__disabled__';
        }
    }

    ngOnDestroy(): void {
        if (this.aevExtension) {
            this.aevExtension.fileExtension = this.originalFileExtension;
        }
    }
}
