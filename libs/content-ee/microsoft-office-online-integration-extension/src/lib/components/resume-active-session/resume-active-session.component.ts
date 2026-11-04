/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Node, NodeEntry } from '@alfresco/js-api';
import { NodesApiService } from '@alfresco/adf-content-services';
import { CommonModule } from '@angular/common';
import { IconComponent } from '@alfresco/adf-core';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'ooi-resume-active-session',
    standalone: true,
    imports: [CommonModule, IconComponent, TranslatePipe],
    templateUrl: './resume-active-session.component.html',
    host: { class: 'adw-microsoft-online-resume-session' },
    encapsulation: ViewEncapsulation.None
})
export class ResumeActiveSessionComponent implements OnInit {
    @Input()
    data: { node: NodeEntry };

    private readonly destroyRef = inject(DestroyRef);

    constructor(private nodesService: NodesApiService) {}

    get entry(): Node {
        return this.data?.node?.entry;
    }

    ngOnInit(): void {
        this.nodesService.nodeUpdated.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((node: Node) => {
            const currentId = this.entry.id;
            const updatedId = node.id;

            if (currentId === updatedId) {
                this.data.node.entry = node;
            }
        });
    }

    get isBeingEditedInMicrosoftOffice(): boolean {
        return (
            this.entry?.aspectNames?.indexOf('ooi:editingInMSOffice') !== -1 &&
            this.entry?.properties?.['ooi:sessionNodeId'] === this.entry?.id &&
            this.entry?.properties?.['ooi:acsSessionOwner'] === this.entry?.properties?.['cm:lockOwner']?.id &&
            localStorage.getItem('microsoftOnline') !== null
        );
    }
}
