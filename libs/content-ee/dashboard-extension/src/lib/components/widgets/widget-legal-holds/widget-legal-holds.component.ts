/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectionStrategy, Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import {
    ConfirmDialogComponent,
    ConfirmDialogComponentProps,
    DataColumnComponent,
    DataColumnListComponent,
    NotificationService,
    ObjectDataRow
} from '@alfresco/adf-core';
import { DownloadNodesAction, NodeInformationAction } from '@alfresco/aca-shared/store';
import { ContentApiService } from '@alfresco/aca-shared';
import { NodesApiService } from '@alfresco/adf-content-services';
import { WidgetBaseComponent } from '../widget-base/widget-base.component';
import { InfiniteScrollDatatableComponent } from '../../infinite-scroll-datatable/infinite-scroll-datatable.component';
import { InfiniteScrollDatatableRowAction } from '../../../models/infinite-scroll-datatable-row-action.interface';
import { InfiniteScrollDatatableRowEvent } from '../../../models/infinite-scroll-datatable-row-event.interface';
import { ManageHoldsListDataSource } from './legal-holds-data-source';
import { WidgetLegalHoldsActions } from '../../../models/widget-legal-holds-actions';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'acs-widget-legal-holds',
    templateUrl: './widget-legal-holds.component.html',
    styleUrl: './widget-legal-holds.component.scss',
    imports: [WidgetBaseComponent, InfiniteScrollDatatableComponent, DataColumnListComponent, DataColumnComponent, AsyncPipe],
    standalone: true,
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'acs-widget-legal-holds'
    }
})
export class WidgetLegalHoldsComponent implements OnInit {
    @Input()
    canDeleteHold = false;

    infiniteScrollDataSource: ManageHoldsListDataSource;
    rowActions: InfiniteScrollDatatableRowAction[] = [];
    emptyStateMessage = 'WIDGETS.LEGAL_HOLDS.NO_HOLDS';

    constructor(
        private readonly store: Store,
        private readonly nodesService: NodesApiService,
        private readonly router: Router,
        private readonly contentApiService: ContentApiService,
        private readonly translation: TranslateService,
        private readonly dialogRef: MatDialog,
        private readonly notificationService: NotificationService
    ) {}

    ngOnInit() {
        this.infiniteScrollDataSource = new ManageHoldsListDataSource(this.nodesService, this.contentApiService);
        this.rowActions = [
            {
                actionType: WidgetLegalHoldsActions.DELETE,
                title: 'WIDGETS.LEGAL_HOLDS.ACTIONS.DELETE',
                icon: 'delete',
                isVisible: () => this.canDeleteHold
            },
            {
                actionType: WidgetLegalHoldsActions.DOWNLOAD,
                title: 'WIDGETS.LEGAL_HOLDS.ACTIONS.DOWNLOAD',
                icon: 'get_app',
                isVisible: () => true
            },
            {
                actionType: WidgetLegalHoldsActions.INFO,
                title: 'WIDGETS.LEGAL_HOLDS.ACTIONS.INFORMATION',
                icon: 'info',
                isVisible: () => true
            }
        ];
    }

    executeRowAction(event: InfiniteScrollDatatableRowEvent) {
        switch (event.actionType) {
            case WidgetLegalHoldsActions.DOWNLOAD: {
                this.store.dispatch(new DownloadNodesAction([{ entry: event.row.getSourceObject() }]));
                break;
            }
            case WidgetLegalHoldsActions.INFO: {
                this.store.dispatch(new NodeInformationAction({ entry: event.row.getSourceObject() }));
                break;
            }
            case WidgetLegalHoldsActions.DELETE: {
                const name = event.row.getValue('name');
                this.dialogRef
                    .open<ConfirmDialogComponent, ConfirmDialogComponentProps, boolean>(ConfirmDialogComponent, {
                        data: {
                            title: this.translation.instant('GOVERNANCE.MANAGE_HOLDS.CONFIRM_DELETE_HOLDS_DIALOG.TITLE', {
                                name
                            }),
                            message: 'GOVERNANCE.MANAGE_HOLDS.CONFIRM_DELETE_HOLDS_DIALOG.MESSAGE_SINGULAR',
                            yesLabel: 'APP.ACTIONS.DELETE',
                            noLabel: 'GOVERNANCE.MANAGE_HOLDS.CONFIRM_DELETE_HOLDS_DIALOG.KEEP_HOLD'
                        },
                        maxWidth: '700px',
                        restoreFocus: true
                    })
                    .afterClosed()
                    .subscribe((res) => {
                        if (res) {
                            this.contentApiService.deleteNode(event.row.getValue('id')).subscribe({
                                next: () => {
                                    this.notificationService.openSnackMessage(
                                        this.translation.instant('APP.MESSAGES.INFO.NODE_DELETION.SINGULAR', { name })
                                    );
                                    this.infiniteScrollDataSource.reset();
                                },
                                error: () => {
                                    this.notificationService.showError(this.translation.instant('APP.MESSAGES.ERRORS.NODE_DELETION', { name }));
                                }
                            });
                        }
                    });
                break;
            }
        }
    }

    onViewAllBtnClick() {
        void this.router.navigateByUrl(`libraries/${this.infiniteScrollDataSource.holdContainerId}`);
    }

    onNameClick(row: ObjectDataRow) {
        void this.router.navigateByUrl(`libraries/${row.getValue('id')}`);
    }
}
