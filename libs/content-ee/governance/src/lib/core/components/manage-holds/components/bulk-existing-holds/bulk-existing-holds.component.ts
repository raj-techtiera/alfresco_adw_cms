/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ViewEncapsulation } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AsyncPipe, NgIf } from '@angular/common';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { ExistingHoldsComponent } from '../existing-holds/existing-holds.component';
import { HoldItem } from '../../model/hold-item';
import { MatLineModule } from '@angular/material/core';

@Component({
    selector: 'aga-manage-bulk-existing-holds',
    templateUrl: '../existing-holds/existing-holds.component.html',
    styleUrls: ['../existing-holds/existing-holds.component.scss'],
    encapsulation: ViewEncapsulation.None,
    imports: [
        ScrollingModule,
        ReactiveFormsModule,
        MatProgressSpinnerModule,
        NgIf,
        AsyncPipe,
        MatListModule,
        MatTooltipModule,
        MatIconModule,
        TranslatePipe,
        MatLineModule
    ],
    standalone: true
})
export class BulkExistingHoldsComponent extends ExistingHoldsComponent {
    override toggleSelection(hold: HoldItem) {
        const assignedIds = this.manageHoldsService.assignedHolds.map((h) => h.id);
        if (assignedIds.includes(hold.id)) {
            return;
        }

        this.selectedHolds.forEach((h) => (h.selected = false));
        hold.selected = !hold.selected;
        this.selectedHolds = [hold];
        this.onSelectionChange();
    }
}
