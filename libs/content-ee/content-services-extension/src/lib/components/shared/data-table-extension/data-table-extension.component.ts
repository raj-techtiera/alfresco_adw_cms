/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AfterContentInit, Component, EventEmitter, Input, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import {
    DataTableComponent,
    DataTableSchema,
    LoadingContentTemplateDirective,
    NoContentTemplateDirective,
    ShowHeaderMode,
    ThumbnailService
} from '@alfresco/adf-core';
import { ContentService, ShareDataTableAdapter } from '@alfresco/adf-content-services';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NodePaging } from '@alfresco/js-api';

@Component({
    standalone: true,
    imports: [CommonModule, MatProgressSpinnerModule, NoContentTemplateDirective, LoadingContentTemplateDirective, DataTableComponent],
    selector: 'adw-data-table-extension',
    templateUrl: './data-table-extension.component.html',
    styleUrls: ['./data-table-extension.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class DataTableExtensionComponent extends DataTableSchema implements AfterContentInit {
    static PRESET_KEY = 'extension.preset';

    @Input()
    loading = true;

    @Input()
    showHeader: ShowHeaderMode = ShowHeaderMode.Always;

    @Input()
    selectionMode = 'multiple';

    @Input()
    multiselect = false;

    @Input()
    contextMenu = false;

    @Input()
    set items(nodePaging: NodePaging) {
        if (this.data) {
            this.data.loadPage(nodePaging);
        }
    }

    @Input()
    sorting = ['title', 'asc'];

    @Output()
    showRowContextMenu = new EventEmitter();

    @ViewChild(DataTableComponent)
    dataTable: DataTableComponent;

    data: ShareDataTableAdapter;

    constructor(private thumbnailService: ThumbnailService, private contentService: ContentService) {
        super(DataTableExtensionComponent.PRESET_KEY, {});
        this.data = new ShareDataTableAdapter(this.thumbnailService, this.contentService, null, null, null);
        this.data.setImageResolver(this.imageResolver);
    }

    ngAfterContentInit() {
        this.createDatatableSchema();
    }

    imageResolver(): string {
        return 'material-icons://library_books';
    }
}
