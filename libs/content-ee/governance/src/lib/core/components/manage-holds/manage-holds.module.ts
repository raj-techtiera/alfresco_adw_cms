/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ExtensionService } from '@alfresco/adf-extensions';
import { NgModule } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { ManageHoldsComponent } from './components/manage-holds/manage-holds.component';
import { ManageHoldsEffect } from './effects/manage-holds.effect';
import {
    canDeleteHoldFolder,
    canEditHold,
    canManageHolds,
    canRemoveFromHold,
    CAPABILITIES_FOR_DELETE_HOLD,
    CAPABILITIES_FOR_EDIT_HOLD,
    CAPABILITIES_RELATED_WITH_ASSIGNING_HOLDS,
    CAPABILITIES_RELATED_WITH_HOLD_CREATION,
    isManageHoldsAvailable,
    isNodeOnHold,
    isNotHoldFolder,
    isNotInsideHoldsFolder,
    RECORD_CAPABILITY
} from './rules/manage-hold.rules';
import { HoldIconComponent } from './components/hold-icon/hold-icon.component';
import { FilePlanService } from '../../services/file-plan.service';
import { FilePlanRolePaging, PermissionsInfo } from '@alfresco/js-api';
import { switchMap, take } from 'rxjs/operators';
import { finalize, forkJoin, from, of, withLatestFrom } from 'rxjs';
import { AcaRuleContext } from '@alfresco/aca-shared/rules';
import { ManageHoldsService } from './services/manage-holds.service';
import { UserProfileService } from '@alfresco/aca-shared';
import { IsFeatureSupportedInCurrentAcsPipe } from '@alfresco/aca-content';

export const effects = [ManageHoldsEffect];

@NgModule({
    imports: [ManageHoldsComponent],
    providers: [provideEffects(effects)]
})
export class ManageHoldsModule {
    constructor(
        extensions: ExtensionService,
        filePlanService: FilePlanService,
        manageHoldsService: ManageHoldsService,
        userProfileService: UserProfileService,
        isFeatureSupportedInCurrentAcs: IsFeatureSupportedInCurrentAcsPipe
    ) {
        setTimeout(() => {
            let filePlanRoles: FilePlanRolePaging;
            let holdsPermissions: PermissionsInfo;
            let userId: string;
            let shouldUseLegacyEvaluator: boolean;
            from(userProfileService.loadUserProfile())
                .pipe(
                    withLatestFrom(isFeatureSupportedInCurrentAcs.transform('isCapabilitiesApiAvailable')),
                    switchMap(([profile, isCapabilitiesApiAvailable]) => {
                        if (isCapabilitiesApiAvailable) {
                            return forkJoin({
                                filePlanRoles: filePlanService.getFilePlanRoles('-filePlan-', {
                                    where: {
                                        capabilityNames: [
                                            RECORD_CAPABILITY,
                                            ...CAPABILITIES_RELATED_WITH_HOLD_CREATION,
                                            ...CAPABILITIES_RELATED_WITH_ASSIGNING_HOLDS,
                                            ...CAPABILITIES_FOR_DELETE_HOLD,
                                            ...CAPABILITIES_FOR_EDIT_HOLD
                                        ]
                                    }
                                }),
                                holdsPermissions: manageHoldsService.getHoldsPermissions(),
                                userProfile: of(profile),
                                shouldUseLegacyEvaluator: of(!isCapabilitiesApiAvailable)
                            });
                        } else {
                            return forkJoin({
                                filePlanRoles: of(null),
                                holdsPermissions: of(null),
                                userProfile: of(profile),
                                shouldUseLegacyEvaluator: of(!isCapabilitiesApiAvailable)
                            });
                        }
                    })
                )
                .pipe(
                    take(1),
                    finalize(() =>
                        extensions.setEvaluators({
                            'app.manage.holds.canManageHolds': (context: AcaRuleContext) =>
                                canManageHolds(context, filePlanRoles, holdsPermissions, userId, shouldUseLegacyEvaluator),
                            'app.manage.holds.canDeleteHoldFolder': (context: AcaRuleContext) => canDeleteHoldFolder(context, filePlanRoles),
                            'app.manage.holds.canRemoveFromHold': (context: AcaRuleContext) => canRemoveFromHold(context, filePlanRoles),
                            'app.manage.holds.canEditHold': (context: AcaRuleContext) => canEditHold(context, filePlanRoles)
                        })
                    )
                )
                .subscribe({
                    next: (response) => {
                        filePlanRoles = response.filePlanRoles;
                        holdsPermissions = response.holdsPermissions;
                        userId = response.userProfile?.id;
                        shouldUseLegacyEvaluator = response.shouldUseLegacyEvaluator;
                    },
                    error: () => {}
                });
        }, 2000);
        extensions.setComponents({
            'app.manage.holds.hold-icon': HoldIconComponent
        });

        extensions.setEvaluators({
            'app.manage.holds.isNodeOnHold': isNodeOnHold,
            'app.manage.holds.isNotInsideHoldsFolder': isNotInsideHoldsFolder,
            'app.manage.holds.isNotHoldFolder': isNotHoldFolder,
            'app.manage.holds.isManageHoldsAvailable': isManageHoldsAvailable
        });
    }
}
