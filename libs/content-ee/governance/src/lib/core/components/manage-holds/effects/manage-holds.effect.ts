/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { EMPTY, forkJoin, interval, Observable } from 'rxjs';
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatMap, filter, map, switchMap, take, takeLast, takeWhile, withLatestFrom } from 'rxjs/operators';
import {
    BULK_HOLDS_WARNING,
    BulkHoldsWarningAction,
    DELETE_HOLD,
    DeleteHoldAction,
    MANAGE_BULK_HOLDS_TO_FILES,
    MANAGE_BULK_HOLDS_TO_FOLDER,
    MANAGE_HOLDS,
    MANAGE_SINGLE_HOLDS,
    ManageBulkHoldsToFilesAction,
    ManageBulkHoldsToFolderAction,
    ManageHoldsAction,
    ManageSingleHoldsAction,
    REMOVE_FROM_HOLD,
    RemoveFromHoldAction
} from '../actions/manage-holds.actions';
import { ManageHoldsService } from '../services/manage-holds.service';
import { ManageHoldsDialogService } from '../services/manage-holds-dialog.service';
import { ConfirmDialogComponent, NotificationService, TranslationService } from '@alfresco/adf-core';
import { HoldBody, HoldBulkStatusEntry, Node, NodeEntry, } from '@alfresco/js-api';
import { DocumentListService, SearchQueryBuilderService } from '@alfresco/adf-content-services';
import { Store } from '@ngrx/store';
import { AppExtensionService } from '@alfresco/aca-shared';
import { OperationMode } from '../../../model/bulk-operation.model';
import { FilePlanService } from '../../../services/file-plan.service';
import { ExistingHoldDataToConfirm } from '../model/existing-hold-data-to-confirm.model';
import { Location } from '@angular/common';
import { DeleteNodesAction, getAppSelection, getCurrentFolder } from '@alfresco/aca-shared/store';
import { MatDialog } from '@angular/material/dialog';

@Injectable()
export class ManageHoldsEffect {
    private store = inject(Store);
    private actions$ = inject(Actions);
    private documentListService = inject(DocumentListService);
    private extensions = inject(AppExtensionService);
    private filePlanService = inject(FilePlanService);
    private manageHoldsService = inject(ManageHoldsService);
    private manageHoldsDialogService = inject(ManageHoldsDialogService);
    private notificationService = inject(NotificationService);
    private searchResults = inject(SearchQueryBuilderService);
    private location = inject(Location);
    private dialogRef = inject(MatDialog);
    private translation = inject(TranslationService);

    manageHolds$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType<ManageHoldsAction>(MANAGE_HOLDS),
                concatMap(({ payload }) => {
                    if (payload.isFolder) {
                        this.store.dispatch(new ManageBulkHoldsToFolderAction(payload.id));
                    } else {
                        this.store.dispatch(new ManageSingleHoldsAction(payload));
                    }
                    return EMPTY;
                })
            ),
        { dispatch: false }
    );

    manageSingleHolds$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType<ManageSingleHoldsAction>(MANAGE_SINGLE_HOLDS),
                concatMap(({ payload }) =>
                    this.filePlanService.checkFilePlan().pipe(
                        concatMap((filePlanExists) => {
                            if (!filePlanExists) {
                                this.onNoFilePlan();
                                return EMPTY;
                            }
                            this.manageHoldsDialogService
                                .openDialog(OperationMode.SINGLE, payload.id)
                                .afterClosed()
                                .pipe(
                                    filter(Boolean),
                                    withLatestFrom(
                                        this.manageHoldsDialogService.dataToConfirm$,
                                        this.manageHoldsDialogService.selectedTabIndex$,
                                        this.manageHoldsDialogService.allowedToAddToHold$
                                    ),
                                    switchMap(([_, dataToConfirm, selectedTabIndex, allowedToAddToHold]) => {
                                        if (selectedTabIndex === 0) {
                                            const { selectedHoldIds, unselectedHoldIds } = dataToConfirm as ExistingHoldDataToConfirm;

                                            return this.manageHoldsService.saveExistingHolds({
                                                nodeId: payload.id,
                                                selectedHoldIds,
                                                unselectedHoldIds
                                            });
                                        } else {
                                            return allowedToAddToHold
                                                ? this.manageHoldsService.saveNewHoldAndAssign(dataToConfirm as HoldBody, payload.id)
                                                : this.manageHoldsService.saveNewHold(dataToConfirm as HoldBody);
                                        }
                                    })
                                )
                                .subscribe({
                                    next: () => this.onApplyHoldsSuccess(),
                                    error: (err: Error) => {
                                        const error = JSON.parse(err.message).error;
                                        const errorMessage = error.statusCode === 404  ? 'GOVERNANCE.MANAGE_HOLDS.APPLY_HOLDS_NOT_FOUND' : error.briefSummary;
                                        this.onApplyHoldsError(errorMessage);
                                    }
                                });
                            return EMPTY;
                        })
                    )
                )
            ),
        { dispatch: false }
    );

    manageBulkHoldsToFolder$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType<ManageBulkHoldsToFolderAction>(MANAGE_BULK_HOLDS_TO_FOLDER),
                concatMap(({ folderId }) =>
                    this.filePlanService.checkFilePlan().pipe(
                        concatMap((filePlanExists) => {
                            if (!filePlanExists) {
                                this.onNoFilePlan();
                                return EMPTY;
                            }
                            this.manageHoldsDialogService
                                .openDialog(OperationMode.BULK, folderId)
                                .afterClosed()
                                .pipe(
                                    filter(Boolean),
                                    withLatestFrom(
                                        this.manageHoldsDialogService.dataToConfirm$,
                                        this.manageHoldsDialogService.selectedTabIndex$,
                                        this.manageHoldsDialogService.allowedToAddToHold$
                                    ),
                                    switchMap(([_, dataToConfirm, selectedTabIndex, allowedToAddToHold]) => {
                                        if (selectedTabIndex === 0) {
                                            const { selectedHoldIds } = dataToConfirm as ExistingHoldDataToConfirm;
                                            this.manageHoldsService.holdIdForBulkStatus = selectedHoldIds[0];

                                            return this.manageHoldsService.bulkAssignHoldToFolder(selectedHoldIds[0], folderId);
                                        } else {
                                            return allowedToAddToHold
                                                ? this.manageHoldsService.bulkSaveNewHoldToFolder(dataToConfirm as HoldBody, folderId)
                                                : this.manageHoldsService.saveNewHold(dataToConfirm as HoldBody);
                                        }
                                    })
                                )
                                .subscribe({
                                    next: (bulkResponse) => {
                                        if ('bulkStatusId' in bulkResponse.entry) {
                                            this.openSnackbarMessage('GOVERNANCE.MANAGE_HOLDS.BULK_APPLY_HOLDS_STARTED', 5000);
                                            this.waitForBulkOperationCompletion(bulkResponse.entry.bulkStatusId);
                                        } else {
                                            this.onApplyHoldsSuccess();
                                        }
                                    },
                                    error: (error: Error) => this.onApplyHoldsError(JSON.parse(error.message).error.briefSummary)
                                });
                            return EMPTY;
                        })
                    )
                )
            ),
        { dispatch: false }
    );

    manageBulkHoldsToFiles$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType<ManageBulkHoldsToFilesAction>(MANAGE_BULK_HOLDS_TO_FILES),
                concatMap(() =>
                    this.filePlanService.checkFilePlan().pipe(
                        concatMap((filePlanExists) => {
                            if (!filePlanExists) {
                                this.onNoFilePlan();
                                return EMPTY;
                            }
                            this.manageHoldsService.holdIdForBulkStatus = null;
                            this.manageHoldsDialogService
                                .openDialog(OperationMode.BULK)
                                .afterClosed()
                                .pipe(
                                    filter(Boolean),
                                    withLatestFrom(
                                        this.manageHoldsDialogService.dataToConfirm$,
                                        this.manageHoldsDialogService.selectedTabIndex$,
                                        this.manageHoldsDialogService.allowedToAddToHold$
                                    ),
                                    switchMap(([_, dataToConfirm, selectedTabIndex, allowedToAddToHold]) => {
                                        if (selectedTabIndex === 0) {
                                            const { selectedHoldIds } = dataToConfirm as ExistingHoldDataToConfirm;
                                            this.manageHoldsService.holdIdForBulkStatus = selectedHoldIds[0];

                                            return this.manageHoldsService.bulkAssignHold(selectedHoldIds[0], this.getQuery());
                                        } else {
                                            return allowedToAddToHold ?
                                                this.manageHoldsService.bulkSaveNewHoldToFiles(dataToConfirm as HoldBody, this.getQuery())
                                                : this.manageHoldsService.saveNewHold(dataToConfirm as HoldBody);
                                        }
                                    })
                                )
                                .subscribe({
                                    next: (bulkResponse) => {
                                        this.extensions.bulkActionExecuted();
                                        if ('bulkStatusId' in bulkResponse.entry) {
                                            this.openSnackbarMessage('GOVERNANCE.MANAGE_HOLDS.BULK_APPLY_HOLDS_STARTED', 5000);
                                            this.waitForBulkOperationCompletion(bulkResponse.entry.bulkStatusId);
                                        } else {
                                            this.onApplyHoldsSuccess();
                                        }
                                    },
                                    error: (error: Error) => this.onApplyHoldsError(JSON.parse(error.message).error.briefSummary)
                                });
                            return EMPTY;
                        })
                    )
                )
            ),
        { dispatch: false }
    );

    bulkHoldsWarning$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType<BulkHoldsWarningAction>(BULK_HOLDS_WARNING),
                concatMap(() =>
                    this.filePlanService.checkFilePlan().pipe(
                        concatMap((filePlanExists) => {
                            if (!filePlanExists) {
                                this.onNoFilePlan();
                                this.extensions.bulkActionExecuted();
                                return EMPTY;
                            }
                            this.manageHoldsDialogService
                                .openWarningDialog()
                                .afterClosed()
                                .subscribe((value) => {
                                    if (value) {
                                        this.store.dispatch(new ManageBulkHoldsToFilesAction());
                                    } else {
                                        this.extensions.bulkActionExecuted();
                                    }
                                });
                            return EMPTY;
                        })
                    )
                )
            ),
        { dispatch: false }
    );

    deleteHold$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType<DeleteHoldAction>(DELETE_HOLD),
                map((action) => {
                    if (action?.payload?.length > 0) {
                        this.deleteItemsWithHold(action.payload);
                    } else {
                        this.store
                            .select(getAppSelection)
                            .pipe(take(1))
                            .subscribe((selection) => {
                                if (selection?.count > 0) {
                                    this.deleteItemsWithHold(selection.nodes);
                                }
                            });
                    }
                })
            ),
        { dispatch: false }
    );

    removeFromHold$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType<RemoveFromHoldAction>(REMOVE_FROM_HOLD),
                map(({ payload }) => {
                    let currentFolder: Node;
                    this.store.select(getCurrentFolder).pipe(concatMap(
                        (folder) => {
                            currentFolder = folder;
                            return forkJoin(
                                payload.map((node) => this.manageHoldsService.unassignHold(node.entry.id, folder.id))
                            );
                        })).subscribe({
                            next: () => {
                                this.handleReload();
                                this.notificationService.showInfo(this.translation.instant(
                                    payload.length > 1 ? 'GOVERNANCE.MANAGE_HOLDS.REMOVE_MULTIPLE_FILES_FROM_HOLD_SUCCESS' :
                                        'GOVERNANCE.MANAGE_HOLDS.REMOVE_SINGLE_FILE_FROM_HOLD_SUCCESS'
                                ));
                            },
                            error: () => {
                                if (currentFolder?.nodeType === 'rma:hold') {
                                    this.notificationService.showError(this.translation.instant(
                                        payload.length > 1 ? 'GOVERNANCE.MANAGE_HOLDS.REMOVE_MULTIPLE_FILES_FROM_HOLD_ERROR' :
                                            'GOVERNANCE.MANAGE_HOLDS.REMOVE_SINGLE_FILE_FROM_HOLD_ERROR'
                                    ));
                                }
                            }
                        });
                })
            ),
        { dispatch: false }
    );

    private onApplyHoldsSuccess() {
        this.handleReload();
        this.openSnackbarMessage('GOVERNANCE.MANAGE_HOLDS.APPLY_HOLDS_SUCCESS');
    }

    private openSnackbarMessage(message: string, duration: number = 0, showReloadButton: boolean = false, interpolateArgs?: any) {
        this.notificationService
            .openSnackMessageAction(
                message,
                showReloadButton ? 'COMMON.RELOAD' : 'GOVERNANCE.MANAGE_HOLDS.ACKNOWLEDGE',
                {
                    duration: duration,
                    data: {
                        actionIcon: showReloadButton ? 'close' : null
                    }
                },
                interpolateArgs
            )
            .onAction()
            .subscribe(() => {
                if (showReloadButton) {
                    this.handleReload();
                }
            });
    }

    private onApplyHoldsError(errorMessage: string) {
        this.notificationService.openSnackMessageAction(errorMessage, 'GOVERNANCE.MANAGE_HOLDS.ACKNOWLEDGE', {
            duration: 0,
            data: {
                actionIcon: null
            },
            panelClass: 'adf-error-snackbar'
        });
    }

    private getQuery(): string {
        const { query } = this.searchResults.buildQuery().query;
        const contentType = ' AND TYPE:content';
        const filterQueries = this.searchResults.filterQueries.length ? ' AND ' + this.mapFilterQueries() : '';

        return query + filterQueries + contentType;
    }

    private mapFilterQueries(): string {
        return (
            '(' +
            this.searchResults.filterQueries.reduce((acc, nextQuery, index) => acc + (index > 0 ? ' AND ' : '') + '(' + nextQuery.query + ')', '') +
            ')'
        );
    }

    private onNoFilePlan() {
        this.onApplyHoldsError('GOVERNANCE.MANAGE_HOLDS.NO_RECORDS_MANAGEMENT_SITE');
    }

    private waitForBulkOperationCompletion(bulkStatusId: string) {
        interval(2000).pipe(
            switchMap(() => this.manageHoldsService.getBulkOperationStatus(bulkStatusId)),
            takeWhile(statusResponse => !this.isBulkStatusFinished(statusResponse), true),
            takeLast(1)
        ).subscribe((doneResponse) => this.handleBulkOperationCompletion(doneResponse, true));
    }

    private handleBulkOperationCompletion(bulkOperationStatus: HoldBulkStatusEntry, showReloadButton = false) {
        const { errorsCount, totalItems, processedItems } = bulkOperationStatus.entry;
        if (errorsCount === 0 && totalItems === 0 && processedItems === 0) {
            this.onApplyHoldsError('GOVERNANCE.MANAGE_HOLDS.BULK_APPLY_HOLDS_CANNOT_BE_APPLIED_TO_FOLDERS');
        } else if (errorsCount > 0) {
            if (errorsCount === totalItems) {
                this.onApplyHoldsError('GOVERNANCE.MANAGE_HOLDS.BULK_APPLY_HOLDS_FAIL');
            } else {
                this.openSnackbarMessage('GOVERNANCE.MANAGE_HOLDS.BULK_APPLY_HOLDS_PARTIAL_SUCCESS', null, showReloadButton, { errorsCount });
            }
        } else {
            this.openSnackbarMessage('GOVERNANCE.MANAGE_HOLDS.BULK_APPLY_HOLDS_SUCCESS', null, showReloadButton, { totalItems });
        }
    }

    private handleReload() {
        if (this.location.path().includes('search')) {
            this.searchResults.update();
        } else {
            this.documentListService.reload();
        }
    }

    private isBulkStatusFinished(response: HoldBulkStatusEntry): boolean {
        return response.entry.status === 'DONE' || response.entry.status === 'CANCELLED';
    }

    private displayDeleteHoldConfirmationDialog(nodes: NodeEntry[]): Observable<boolean> {
        const title = nodes.length === 1
            ? this.translation.instant('GOVERNANCE.MANAGE_HOLDS.CONFIRM_DELETE_HOLDS_DIALOG.TITLE', {
                name: nodes[0].entry.name
            })
            : this.translation.instant('GOVERNANCE.MANAGE_HOLDS.CONFIRM_DELETE_HOLDS_DIALOG.TITLE_PLURAL', {
                count: nodes.length
            });
        const message = nodes.length === 1
            ? 'GOVERNANCE.MANAGE_HOLDS.CONFIRM_DELETE_HOLDS_DIALOG.MESSAGE_SINGULAR'
            : 'GOVERNANCE.MANAGE_HOLDS.CONFIRM_DELETE_HOLDS_DIALOG.MESSAGE_PLURAL';

        return this.dialogRef
            .open(ConfirmDialogComponent, {
                data: {
                    title,
                    message,
                    yesLabel: 'APP.ACTIONS.DELETE',
                    noLabel: 'GOVERNANCE.MANAGE_HOLDS.CONFIRM_DELETE_HOLDS_DIALOG.KEEP_HOLD'
                },
                maxWidth: '750px'
            })
            .afterClosed();
    }

    private deleteItemsWithHold(nodes: NodeEntry[]): void {
        this.displayDeleteHoldConfirmationDialog(nodes).subscribe((confirmed) => {
            if (confirmed) {
                this.store.dispatch(new DeleteNodesAction(nodes, false));
            }
        });
    }
}
