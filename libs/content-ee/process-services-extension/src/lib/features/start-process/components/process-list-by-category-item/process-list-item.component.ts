/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    HostListener,
    Input,
    Output,
    ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'process-list-item',
    standalone: true,
    imports: [CommonModule, MatIconModule],
    templateUrl: './process-list-item.component.html',
    styleUrls: ['./process-list-item.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProcessListByCategoryItemComponent {
    @Input({ required: true }) process;

    @Output() selectProcess = new EventEmitter();

    @HostListener('keydown.enter', [])
    onProcessListItemKeydown(): void {
        this.selectProcess.emit(this.process);
    }
}
