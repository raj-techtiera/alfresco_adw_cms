/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { of } from 'rxjs';
import { WidgetFilter } from '../../../models/widget-filter.interface';

@Component({
    selector: 'acs-widget-base',
    standalone: true,
    imports: [CommonModule, MatProgressSpinnerModule, TranslatePipe, MatMenuModule, MatIconModule, MatButtonModule, NgOptimizedImage],
    templateUrl: './widget-base.component.html',
    styleUrl: './widget-base.component.scss',
    host: {
        class: 'acs-widget-base'
    },
    encapsulation: ViewEncapsulation.None
})
export class WidgetBaseComponent {
    @Input()
    displayViewAllButton = true;

    @Input()
    emptyStateMessage: string;

    @Input()
    hasContent = false;

    @Input()
    isLoading$ = of(true);

    @Input()
    widgetFilters: WidgetFilter[];

    @Input()
    widgetTitle: string;

    @Output()
    viewAllButtonClicked = new EventEmitter<void>();

    @Output()
    refreshWidget = new EventEmitter<void>();

    @Output()
    filterSelected = new EventEmitter<string>();

    openMatMenu(event: Event, menuTrigger: MatMenuTrigger) {
        event.preventDefault();
        menuTrigger.openMenu();
    }

    widgetFilterSelected(filter: WidgetFilter) {
        this.widgetFilters.forEach((widgetFilter) => {
            widgetFilter.isActive = widgetFilter.id === filter.id;
        });
        this.filterSelected.emit(filter.value);
    }
}
