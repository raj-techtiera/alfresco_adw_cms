/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, inject, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Node, NodeEntry } from '@alfresco/js-api';
import { isLocked } from '../../rules/node.evaluator';
import { ThumbnailService } from '@alfresco/adf-core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'aga-icon',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './icon.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None
})
export class IconComponent implements OnInit {
    private thumbnailService = inject(ThumbnailService);

    @Input({ required: true })
    node: NodeEntry;

    icon: string;
    isIconAvailable = false;

    ngOnInit() {
        const iconType = this.getIcon(this.node);
        this.isIconAvailable = iconType.type !== 'image';
        this.icon = iconType.icon;
    }

    getIcon(node: NodeEntry): { type: 'record' | 'existing' | 'image'; icon: string } {
        if (isLocked(node)) {
            return {
                type: 'image',
                icon: 'assets/images/baseline-lock-24px.svg'
            };
        }

        const mimeType = this.getMime(node.entry);
        const mimeIconUrl = this.thumbnailService.getMimeTypeIcon(mimeType);
        const defaultIconUrl = this.thumbnailService.getDefaultMimeTypeIcon();
        if (mimeIconUrl !== defaultIconUrl) {
            return { type: 'existing', icon: `adf:${mimeType}` };
        }
        return { type: 'image', icon: defaultIconUrl };
    }

    private getMime(node: Node): string {
        if (node.isFile) {
            return node.content && node.content.mimeType;
        }
        return 'folder';
    }
}
