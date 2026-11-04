/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AppConfigService, AuthenticationService } from '@alfresco/adf-core';
import { NodesApiService } from '@alfresco/adf-content-services';
import { Node } from '@alfresco/js-api';
import { ViewerExtensionInterface } from '@alfresco/adf-extensions';

@Component({
    standalone: false,
    selector: 'alfresco-enterprise-viewer',
    template: `
        @if (sanitizedAevUrl) {
            <iframe [src]="sanitizedAevUrl" class="alfresco-enterprise-viewer" (load)="contentLoaded.emit()"></iframe>
        }
    `,
    styles: [`
        :host {
            display: block;
            width: 100%;
            height: 100%;
        }
        .alfresco-enterprise-viewer {
            width: 1800px;
            height: 100%;
            border: none;
        }
    `],
    encapsulation: ViewEncapsulation.None
})
export class AlfrescoEnterpriseViewerComponent implements ViewerExtensionInterface, OnInit, OnChanges {
    /** Used by preview tab (receives full Node object) */
    @Input() node: Node;

    /** Used by viewer extension mechanism (receives only the ID string) */
    @Input() nodeId: string;

    @Output() contentLoaded = new EventEmitter<void>();

    /** Required by ViewerExtensionInterface / PreviewExtensionComponent.setInput() */
    @Input() url: string;
    @Input() nameFile: string;

    /** Required by PreviewExtensionComponent.setInput() */
    @Input() extension: string;

    sanitizedAevUrl: SafeResourceUrl;
    aevConfig: any;

    private readonly AEV_APP_CONFIG_KEY = 'alfresco-enterprise-viewer';
    private initialized = false;

    constructor(
        private sanitizer: DomSanitizer,
        private appConfigService: AppConfigService,
        private authService: AuthenticationService,
        private nodesApiService: NodesApiService
    ) {
        this.aevConfig = this.appConfigService.get(this.AEV_APP_CONFIG_KEY);
    }

    ngOnInit(): void {
        if (this.node?.id) {
            this.setViewerUrl(this.node);
            this.initialized = true;
        } else if (this.nodeId) {
            this.nodesApiService.getNode(this.nodeId).subscribe((node) => {
                this.setViewerUrl(node);
            });
            this.initialized = true;
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!this.aevConfig || !this.initialized) {
            return;
        }
        if (changes['node'] && this.node?.id) {
            this.setViewerUrl(this.node);
        } else if (changes['nodeId'] && this.nodeId && !this.node) {
            this.nodesApiService.getNode(this.nodeId).subscribe((node) => {
                this.setViewerUrl(node);
            });
        }
    }

    private setViewerUrl(node: Node): void {
        const supportedDocTypes = this.aevConfig.properties.supportedMimetypes.documents;
        const supportedVideoTypes = this.aevConfig.properties.supportedMimetypes.videos;
        const mimeType = node.content?.mimeType;

        if (supportedVideoTypes.indexOf(mimeType) !== -1) {
            //this.sanitizedAevUrl = this.getAEVUrlForVideo(node);
            this.sanitizedAevUrl = this.getAEVUrl(node);
        } else if (
            supportedDocTypes.indexOf('*') !== -1 ||
            supportedDocTypes.indexOf(mimeType) !== -1
        ) {
            this.sanitizedAevUrl = this.getAEVUrl(node);
        }
    }

    private getAEVUrl(node: Node): SafeResourceUrl {
        const aevDocumentUrl =
            this.aevConfig.aevHost +
            this.aevConfig.properties.endpoints.aev +
            '/login/external.htm?' +
            'docId=' +
            encodeURIComponent(this.aevConfig.properties.alfrescoDocumentStorePrefix + node.id) +
            '&username=' +
            this.authService.getUsername() +
            '&ticket=' +
            this.authService.getToken();

        console.log('AEV URL:', aevDocumentUrl);
        return this.sanitizer.bypassSecurityTrustResourceUrl(aevDocumentUrl);
    }
    /** NOT USED for Video */
    /**private getAEVUrlForVideo(node: Node): SafeResourceUrl {
        const aevDocumentUrl =
            this.aevConfig.aevHost +
            this.aevConfig.properties.endpoints.aevVideo +
            '/#/login?' +
            'docName=' +
            encodeURIComponent(node.name) +
            '&docId=' +
            this.aevConfig.properties.alfrescoDocumentStorePrefix +
            node.id +
            '&username=' +
            this.authService.getUsername() +
            '&ticket=' +
            this.authService.getToken();

        // set ticket cookie for video auth
        document.cookie = 'ticket=' + this.authService.getToken() + ';path=/';

        console.log('AEV Video URL:', aevDocumentUrl);

        return this.sanitizer.bypassSecurityTrustResourceUrl(aevDocumentUrl);
    }**/
}
