/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { IconComponent } from '@alfresco/adf-core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NodeEntry } from '@alfresco/js-api';

@Component({
    selector: 'aga-hold-icon',
    standalone: true,
    template: `
        <adf-icon class="adf-datatable-cell-badge"
                  [title]="tooltip | translate"
                  [value]="'back_hand'" />
    `,
    imports: [IconComponent, TranslatePipe, MatTooltipModule],
    encapsulation: ViewEncapsulation.None
})
export class HoldIconComponent implements OnInit {
    @Input()
    data: { node: NodeEntry };

    tooltip: string;

    ngOnInit() {
        this.tooltip = this.data.node.entry.isFile ? 'GOVERNANCE.MANAGE_HOLDS.DOCUMENT_IN_HOLD' : 'GOVERNANCE.MANAGE_HOLDS.FOLDER_IN_HOLD';
    }
}
