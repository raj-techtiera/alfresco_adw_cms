/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { provideTranslations } from '@alfresco/adf-core';
import { ExtensionService } from '@alfresco/adf-extensions';
import { NgModule } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { DeclareRecordEffects } from './effects/declare-record.effect';
import { DeleteRecordEffect } from './effects/delete-record.effect';
import { AdminDeleteRecordEffect } from './effects/admin-delete-record.effect';
import { RejectRecordEffect } from './effects/reject-record.effect';
import { MoveRecordEffect } from './effects/move-record.effect';
import * as recordEvaluator from './rules/record.evaluator';
import { GovernanceCoreModule } from '../core/governance-core.module';
import { GlacierModule } from '../glacier/glacier.module';
import { RecordIconComponent } from './components/record-icon/record-icon.component';
import { AcaRuleContext } from '@alfresco/aca-shared/rules';
import { OpenRecordInfoDrawerEffect } from './effects/open-record-info-drawer.effect';
import { FilePlanService } from '../core/services/file-plan.service';
import { finalize, of } from 'rxjs';
import { FilePlanRolePaging } from '@alfresco/js-api';
import { switchMap, take } from 'rxjs/operators';
import { RecordCapability } from './models/record-capability';
import { IsFeatureSupportedInCurrentAcsPipe } from '@alfresco/aca-content';

export const effects = [
    DeclareRecordEffects,
    RejectRecordEffect,
    AdminDeleteRecordEffect,
    DeleteRecordEffect,
    MoveRecordEffect,
    OpenRecordInfoDrawerEffect
];

@NgModule({
    imports: [GovernanceCoreModule, GlacierModule, RecordIconComponent],
    providers: [
        provideEffects(effects),
        provideTranslations('governance-extension', 'assets/adf-governance')],
    exports: [RecordIconComponent]
})
export class RecordModule {
    constructor(extensions: ExtensionService, filePlanService: FilePlanService, isFeatureSupportedInCurrentAcs: IsFeatureSupportedInCurrentAcsPipe) {
        setTimeout(() => {
            let filePlanRoles: FilePlanRolePaging;
            isFeatureSupportedInCurrentAcs
                .transform('isCapabilitiesApiAvailable')
                .pipe(
                    switchMap((isCapabilitiesApiAvailable) => {
                        if (isCapabilitiesApiAvailable) {
                            return filePlanService.getFilePlanRoles('-filePlan-', {
                                where: {
                                    capabilityNames: [RecordCapability.ViewRecords]
                                }
                            });
                        } else {
                            return of(null);
                        }
                    })
                )
                .pipe(
                    take(1),
                    finalize(() =>
                        extensions.setEvaluators({
                            'app.selection.hasViewRecordsCapability': (context: AcaRuleContext) =>
                                recordEvaluator.hasViewRecordsCapability(context, filePlanRoles)
                        })
                    )
                )
                .subscribe({
                    next: (roles) => (filePlanRoles = roles),
                    error: () => {}
                });
        }, 2000);
        extensions.setEvaluators({
            'app.selection.isRecord': recordEvaluator.isNodeRecord,
            'app.selection.isRejectedRecord': recordEvaluator.isNodeRecordRejected,
            'app.selection.canDeclareAsRecord': recordEvaluator.canDeclareAsRecord,
            'app.selection.canUpdateRecord': recordEvaluator.canUpdateRecord,
            'app.selection.file.canUploadVersion': recordEvaluator.canUploadRecordVersion,

            'app.record.canUpdateVersion': recordEvaluator.canUpdateVersion,
            'app.record.canDeleteStoredNode': recordEvaluator.canDeleteStoredNode,
            'app.record.canDeleteStoredRecord': recordEvaluator.canDeleteStoredRecord,
            'app.record.canShareRecord': recordEvaluator.canShareRecord,
            'app.record.isNotRecordsManagement': recordEvaluator.isNotRecordsManagement,
            'app.record.isNotRecordCategory': recordEvaluator.isNotRecordCategory,
            'app.record.isNotRecordFolder': recordEvaluator.isNotRecordFolder,

            'aos.canOpenRecordWithOffice': (context: AcaRuleContext) => recordEvaluator.canOpenRecordWithOffice(context)
        });
    }
}
