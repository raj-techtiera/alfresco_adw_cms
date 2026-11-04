/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    AfterContentInit,
    AfterViewInit,
    Component,
    ContentChild,
    EventEmitter,
    HostListener,
    Input,
    OnInit,
    Output,
    QueryList,
    ViewChild,
    ViewChildren,
    ViewEncapsulation
} from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { CdkFixedSizeVirtualScroll, CdkVirtualForOf, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { InfiniteScrollDatasource } from '@alfresco/adf-content-services';
import {
    DataColumn,
    DataColumnListComponent,
    DataTableCellComponent,
    DataTableRowComponent,
    DateCellComponent,
    FileSizeCellComponent,
    FileTypePipe,
    LocalizedDatePipe,
    NumberCellComponent,
    ObjectDataRow,
    ObjectDataTableAdapter,
    ThumbnailService
} from '@alfresco/adf-core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { InfiniteScrollDatatableRowAction } from '../../models/infinite-scroll-datatable-row-action.interface';
import { CdkContextMenuTrigger, CdkMenu, CdkMenuItem } from '@angular/cdk/menu';
import { Observable } from 'rxjs';
import { InfiniteScrollDatatableRowEvent } from '../../models/infinite-scroll-datatable-row-event.interface';
import { FocusKeyManager } from '@angular/cdk/a11y';

@Component({
    selector: 'acs-infinite-scroll-datatable',
    standalone: true,
    imports: [
        CommonModule,
        CdkFixedSizeVirtualScroll,
        CdkVirtualForOf,
        CdkVirtualScrollViewport,
        DataTableRowComponent,
        TranslatePipe,
        LocalizedDatePipe,
        DateCellComponent,
        DataTableCellComponent,
        NumberCellComponent,
        MatMenuTrigger,
        MatIcon,
        MatMenu,
        MatButtonModule,
        MatMenuItem,
        CdkContextMenuTrigger,
        CdkMenu,
        CdkMenuItem,
        FileTypePipe,
        FileSizeCellComponent,
        NgOptimizedImage
    ],
    providers: [CdkVirtualScrollViewport],
    templateUrl: './infinite-scroll-datatable.component.html',
    styleUrl: './infinite-scroll-datatable.component.scss',
    host: { class: 'acs-infinite-scroll-datatable' },
    encapsulation: ViewEncapsulation.None
})
export class InfiniteScrollDatatableComponent implements OnInit, AfterContentInit, AfterViewInit {
    @ViewChild('viewport')
    viewport: CdkVirtualScrollViewport;

    @ViewChildren(DataTableRowComponent)
    rowsList: QueryList<DataTableRowComponent>;

    @ContentChild(DataColumnListComponent)
    columnList: DataColumnListComponent;

    @Input()
    itemSize = 56;

    @Input()
    minBufferPx = 280;

    @Input()
    maxBufferPx = 560;

    @Input()
    virtualScrollDataSource: InfiniteScrollDatasource<ObjectDataRow>;

    @Input()
    rowActions: InfiniteScrollDatatableRowAction[];

    @Input()
    rowsObservable: Observable<ObjectDataRow[]>;

    @Input()
    preventDefaultEvents = false;

    @Output()
    rowActionExecuted = new EventEmitter<InfiniteScrollDatatableRowEvent>();

    @Output()
    keydownArrowUp = new EventEmitter<void>();

    @Output()
    keydownArrowDown = new EventEmitter<void>();

    data = new ObjectDataTableAdapter([], []);
    isLoading = true;
    keyManager: FocusKeyManager<DataTableRowComponent>;

    constructor(private thumbnailService: ThumbnailService) {}

    @HostListener('keydown.arrowDown', ['$event'])
    onArrowDown(event: KeyboardEvent) {
        if (this.preventDefaultEvents) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        this.keydownArrowDown.emit();
    }

    @HostListener('keydown.arrowUp', ['$event'])
    onArrowUp(event: KeyboardEvent) {
        if (this.preventDefaultEvents) {
            event.preventDefault();
            event.stopImmediatePropagation();
        }
        this.keydownArrowUp.emit();
    }

    ngOnInit() {
        if (this.rowsObservable) {
            this.rowsObservable.subscribe((rows) => this.data.setRows(rows));
        }
        this.isLoading = false;
    }

    ngAfterContentInit() {
        if (this.columnList?.columns?.length > 0) {
            this.data.setColumns(this.columnList.columns.map((c) => c as DataColumn));
        }
    }

    ngAfterViewInit() {
        this.keyManager = new FocusKeyManager(this.rowsList);
    }

    getCellTooltip(row: ObjectDataRow, col: DataColumn): string {
        if (row && col && col.formatTooltip) {
            const result: string = col.formatTooltip(row, col);
            if (result) {
                return result;
            }
        }
        return null;
    }

    getVisibleRowActions(row: ObjectDataRow): InfiniteScrollDatatableRowAction[] {
        return this.rowActions.filter((action) => action.isVisible(row, action.actionType));
    }

    onExecuteRowAction(row: ObjectDataRow, action: InfiniteScrollDatatableRowAction): void {
        setTimeout(() => {
            this.rowActionExecuted.emit({ row, actionType: action.actionType });
        });
    }

    rowTracker(_index: number, row: ObjectDataRow): string {
        return row.getValue('id');
    }

    getRowThumbnail(row: ObjectDataRow): string {
        if (row.getValue('isFolder')) {
            return this.thumbnailService.getMimeTypeIcon('folder');
        } else {
            return this.thumbnailService.getMimeTypeIcon(row.getValue('content').mimeType);
        }
    }

    onContextMenuOpen(event: Event, menuTrigger: MatMenuTrigger) {
        event.preventDefault();
        menuTrigger.openMenu();
    }
}
