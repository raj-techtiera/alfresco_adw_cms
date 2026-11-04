/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { BehaviorSubject, finalize, forkJoin, of, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { DIALOG_COMPONENT_DATA, DialogComponent, DialogSize } from '@alfresco/adf-core';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TranslatePipe } from '@ngx-translate/core';
import { CreateHoldComponent } from '../create-hold/create-hold.component';
import { SingleExistingHoldsComponent } from '../single-existing-holds/single-existing-holds.component';
import { ManageHoldsDialogService } from '../../services/manage-holds-dialog.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BulkExistingHoldsComponent } from '../bulk-existing-holds/bulk-existing-holds.component';
import { OperationMode } from '../../../../model/bulk-operation.model';
import { FilePlanService } from '../../../../services/file-plan.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LegalHoldCapability } from '../../model/legal-hold-capability';
import { GenericErrorComponent, UserProfileService } from '@alfresco/aca-shared';
import { catchError, switchMap, take, withLatestFrom } from 'rxjs/operators';
import { ManageHoldsService } from '../../services/manage-holds.service';
import { LegalHoldPermission } from '../../model/legal-hold-permission';
import { NodesApiService } from '@alfresco/adf-content-services';
import { HttpErrorResponse } from '@angular/common/http';
import { AsyncPipe } from '@angular/common';
import { IsFeatureSupportedInCurrentAcsPipe } from '@alfresco/aca-content';

@Component({
    templateUrl: './manage-holds.component.html',
    styleUrls: ['./manage-holds.component.scss'],
    host: { class: 'aga-manage-holds' },
    encapsulation: ViewEncapsulation.None,
    standalone: true,
    imports: [
        ScrollingModule,
        TranslatePipe,
        CreateHoldComponent,
        BulkExistingHoldsComponent,
        SingleExistingHoldsComponent,
        MatTabsModule,
        MatProgressSpinnerModule,
        AsyncPipe,
        GenericErrorComponent
    ]
})
export class ManageHoldsComponent implements OnInit {
    @ViewChild(MatTabGroup) tabGroup: MatTabGroup;

    operationMode = inject(DIALOG_COMPONENT_DATA).operationMode;
    nodeId = inject(DIALOG_COMPONENT_DATA).nodeId as string;
    checkNodeExistence: boolean = inject(DIALOG_COMPONENT_DATA).checkNodeExistence;
    oldIndex = 0;
    canSwitchTab = true;
    isFirstLoading = true;

    readonly areHoldsLoaded$ = new BehaviorSubject<boolean>(false);
    readonly OperationMode = OperationMode;

    private _error: string;
    private _permissionsDataLoading = true;
    private _displayedExistingHoldsTab = false;
    private _isHoldCreationAllowed = false;
    private _isAdditionToHoldAllowed = false;
    private _isRemovalFromHoldAllowed = false;

    private readonly destroyRef = inject(DestroyRef);

    get error(): string {
        return this._error;
    }

    get permissionsDataLoading(): boolean {
        return this._permissionsDataLoading;
    }

    get displayedExistingHoldsTab(): boolean {
        return this._displayedExistingHoldsTab;
    }

    get isHoldCreationAllowed(): boolean {
        return this._isHoldCreationAllowed;
    }

    get isAdditionToHoldAllowed(): boolean {
        return this._isAdditionToHoldAllowed;
    }

    get isRemovalFromHoldAllowed(): boolean {
        return this._isRemovalFromHoldAllowed;
    }

    constructor(
        private readonly dialog: MatDialog,
        private readonly manageHoldsDialogService: ManageHoldsDialogService,
        private readonly filePlanService: FilePlanService,
        private readonly userProfileService: UserProfileService,
        private readonly manageHoldsService: ManageHoldsService,
        private readonly nodesApiService: NodesApiService,
        private readonly isFeatureSupportedInCurrentAcs: IsFeatureSupportedInCurrentAcsPipe
    ) {}

    ngOnInit() {
        forkJoin({
            permissionsData: this.userProfileService.userProfile$.pipe(
                take(1),
                withLatestFrom(this.isFeatureSupportedInCurrentAcs.transform('isCapabilitiesApiAvailable')),
                switchMap(([profile, isCapabilitiesApiAvailable]) => {
                    if (profile.isAdmin || !isCapabilitiesApiAvailable) {
                        this._isHoldCreationAllowed = this._isAdditionToHoldAllowed = this._isRemovalFromHoldAllowed = true;
                        return of(null);
                    } else {
                        return forkJoin({
                            filePlanRoles: this.filePlanService.getFilePlanRoles('-filePlan-', {
                                where: {
                                    capabilityNames: [
                                        LegalHoldCapability.AddToHold,
                                        LegalHoldCapability.CreateHold,
                                        LegalHoldCapability.RemoveFromHold
                                    ]
                                }
                            }),
                            holdsPermissions: this.manageHoldsService.getHoldsPermissions(),
                            profile: of(profile)
                        });
                    }
                }),
                catchError((error: HttpErrorResponse) => {
                    this._error = 'GOVERNANCE.MANAGE_HOLDS.LOADING_CAPABILITIES_ERROR';
                    return throwError(() => error);
                })
            ),
            node: (this.checkNodeExistence ? this.nodesApiService.getNode(this.nodeId) : of(undefined)).pipe(
                catchError((error: HttpErrorResponse) => {
                    this._error = 'GOVERNANCE.MANAGE_HOLDS.NODE_NOT_FOUND';
                    return throwError(() => error);
                })
            )
        })
            .pipe(
                finalize(() => (this._permissionsDataLoading = false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => {
                    response?.permissionsData?.filePlanRoles?.list?.entries?.forEach((role) => {
                        role.entry.capabilities?.forEach((capability) => {
                            if (capability.name === LegalHoldCapability.AddToHold) {
                                this._isAdditionToHoldAllowed = true;
                            }
                            if (capability.name === LegalHoldCapability.CreateHold) {
                                this._isHoldCreationAllowed = response.permissionsData.holdsPermissions.locallySet.some(
                                    (permission) =>
                                        permission.authorityId === response.permissionsData.profile.id &&
                                        permission.name === LegalHoldPermission.Filing
                                );
                            }
                            if (capability.name === LegalHoldCapability.RemoveFromHold) {
                                this._isRemovalFromHoldAllowed = true;
                            }
                        });
                    });
                    this.manageHoldsDialogService.allowedToAddToHold$.next(this.isAdditionToHoldAllowed);
                    this._displayedExistingHoldsTab =
                        this.operationMode === OperationMode.SINGLE
                            ? this.isAdditionToHoldAllowed || this.isRemovalFromHoldAllowed
                            : this.isAdditionToHoldAllowed;
                    if (!this.displayedExistingHoldsTab) {
                        this.areHoldsLoaded$.next(true);
                    }
                    this.manageHoldsDialogService.selectedTabIndex$.next(this.displayedExistingHoldsTab ? 0 : 1);
                },
                error: () => {
                    /** Needed to stop error propagation */
                }
            });
        this.manageHoldsDialogService.isConfirmButtonDisabled$.next(true);
    }

    switchTab(tab: MatTabGroup, index: number) {
        if (this.isFirstLoading) {
            this.isFirstLoading = false;
        }
        if (tab.selectedIndex !== this.oldIndex) {
            if (this.canSwitchTab) {
                this.oldIndex = index;
                tab.selectedIndex = index;
                this.manageHoldsDialogService.selectedTabIndex$.next(index);
            } else {
                tab.selectedIndex = this.oldIndex;
                this.manageHoldsDialogService.selectedTabIndex$.next(index);

                const dialogInstance = this.dialog.open(DialogComponent, {
                    data: {
                        title: 'GOVERNANCE.MANAGE_HOLDS.DIALOG_WARNING_TITLE',
                        description: 'GOVERNANCE.MANAGE_HOLDS.DIALOG_WARNING_MESSAGE',
                        dialogSize: DialogSize.Alert,
                        confirmButtonTitle: 'COMMON.SWITCH',
                        isConfirmButtonDisabled$: of(false)
                    }
                });

                dialogInstance.afterClosed().subscribe((canSwitchTab) => {
                    if (canSwitchTab) {
                        this.canSwitchTab = true;
                        tab.selectedIndex = index;
                        this.oldIndex = index;
                        this.manageHoldsDialogService.selectedTabIndex$.next(index);
                        this.manageHoldsDialogService.isConfirmButtonDisabled$.next(true);
                    } else {
                        tab.selectedIndex = this.oldIndex;
                        this.manageHoldsDialogService.selectedTabIndex$.next(this.oldIndex);
                    }
                });
            }
        }
    }

    onListValueChange(isValueChanged: boolean) {
        this.onFormValueChange(isValueChanged);
        this.onFormValidationChange(!isValueChanged);
    }

    onFormValueChange(isValueChanged: boolean) {
        this.canSwitchTab = !isValueChanged;
    }

    onFormValidationChange(shouldDisable: boolean) {
        this.manageHoldsDialogService.isConfirmButtonDisabled$.next(shouldDisable);
    }

    onHoldsLoaded(numberOfHolds: number) {
        if (this.isFirstLoading) {
            this.areHoldsLoaded$.next(true);
            if (numberOfHolds === 0) {
                this.tabGroup.selectedIndex = 1;
                this.manageHoldsDialogService.selectedTabIndex$.next(1);
            } else {
                this.manageHoldsDialogService.selectedTabIndex$.next(0);
            }
        }
    }
}
