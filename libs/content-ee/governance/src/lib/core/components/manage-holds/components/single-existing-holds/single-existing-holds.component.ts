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

@Component({
    selector: 'aga-manage-single-existing-holds',
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
        TranslatePipe
    ],
    standalone: true
})
export class SingleExistingHoldsComponent extends ExistingHoldsComponent {
    override toggleSelection(hold: HoldItem) {
        if (hold.changed || (hold.selected && this.isRemovalFromHoldAllowed) || (!hold.selected && this.isAdditionToHoldAllowed)) {
            hold.selected = !hold.selected;
            hold.changed = true;
            this.selectedHolds = hold.selected
                ? [...this.selectedHolds, hold]
                : this.selectedHolds.filter((selectedHold) => selectedHold.id !== hold.id);
            const selectedHoldIds = this.selectedHolds.map((selectedHold) => selectedHold.id);
            this.unselectedHoldIds = this.manageHoldsService.assignedHolds
                .map((assignedHold) => assignedHold.id)
                .filter((id) => !selectedHoldIds.includes(id));
            this.onSelectionChange();
        }
    }
}
