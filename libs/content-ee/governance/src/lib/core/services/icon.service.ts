/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ThumbnailService } from '@alfresco/adf-core';

@Injectable({
    providedIn: 'root',
})
export class IconService extends ThumbnailService {
    icons = [
        { name: 'record', asset: './assets/images/ic-record-success.svg' },
        { name: 'rejected', asset: './assets/images/ic-record-alert.svg' },
        { name: 'store', asset: './assets/images/archive-icon.svg' },
        {
            name: 'restore',
            asset: './assets/images/restore-from-archive-24px.svg',
        },
        {
            name: 'extend-restore',
            asset: './assets/images/extend-restore-time-24px.svg',
        },
        { name: 'declare-record', asset: './assets/images/ic-record-add.svg' }
    ];

    constructor(private matIconRegistry: MatIconRegistry, private sanitizer: DomSanitizer) {
        super();
    }

    loadIcons() {
        this.addCustomIcons();
        this.registerIcon();
    }

    private addCustomIcons() {
        this.icons.forEach(({ name, asset }) => (this.mimeTypeIcons[name] = asset));
    }

    private registerIcon() {
        Object.keys(this.mimeTypeIcons).forEach((key) => {
            const url = this.sanitizer.bypassSecurityTrustResourceUrl(this.mimeTypeIcons[key]);
            this.matIconRegistry.addSvgIcon(key, url);
            this.matIconRegistry.addSvgIconInNamespace('adf', key, url);
        });
    }
}
