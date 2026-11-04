/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { ContentApiService, PageLayoutComponent } from '@alfresco/aca-shared';
import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AppConfigService, LocalizedDatePipe } from '@alfresco/adf-core';
import { FilePlanService, LegalHoldCapability, RecordCapability } from '@alfresco/adf-governance';
import { Store } from '@ngrx/store';
import { isAdmin, getUserProfile } from '@alfresco/aca-shared/store';
import { map, of, switchMap, take, withLatestFrom } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IsFeatureSupportedInCurrentAcsPipe } from '@alfresco/aca-content';

@Component({
    standalone: true,
    imports: [
        CommonModule,
        PageLayoutComponent,
        TranslatePipe
    ],
    selector: 'adw-dashboard-home',
    templateUrl: './dashboard-home.component.html',
    styleUrl: './dashboard-home.component.scss',
    providers: [LocalizedDatePipe],
    host: {
        class: 'adw-dashboard-home'
    },
    encapsulation: ViewEncapsulation.None
})
export class DashboardHomeComponent implements OnInit {
    contentServicesEnabled = false;
    processServicesEnabled = false;
    legalHoldEnabled = false;
    canShowLegalHolds = false;
    canDeleteHold = false;
    isAGSInstalled = false;
    userName = 'Unknown User';
    private readonly destroyRef = inject(DestroyRef);
    private readonly appConfig = inject(AppConfigService);
    private readonly store = inject(Store);
    private readonly filePlanService = inject(FilePlanService);
    private readonly contentApi = inject(ContentApiService);
    private readonly isFeatureSupportedInCurrentAcs = inject(IsFeatureSupportedInCurrentAcsPipe);

    ngOnInit() {
        this.store
            .select(getUserProfile)
            .pipe(
                map((user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.userName || 'Unknown User'),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((displayName) => {
                this.userName = displayName;
            });
        const contentServicesFlag = this.appConfig.get<boolean | string>('plugins.contentService', true);
        const processServicesFlag = this.appConfig.get<boolean | string>('plugins.processService', false);
        const legalHoldFlag = this.appConfig.get<boolean | string>('plugins.legalHoldEnabled', false);
        this.processServicesEnabled = processServicesFlag === true || processServicesFlag === 'true';
        this.contentServicesEnabled = contentServicesFlag === true || contentServicesFlag === 'true';
        this.legalHoldEnabled = legalHoldFlag === true || legalHoldFlag === 'true';

        this.contentApi
            .getRepositoryInformation()
            .pipe(take(1))
            .subscribe((response) => {
                this.isAGSInstalled = !!response?.entry?.repository?.modules
                    ?.filter((module) => module.id === 'alfresco-rm-enterprise-repo')
                    .find((repo) => repo.installState === 'INSTALLED');
            });

        this.store
            .select(isAdmin)
            .pipe(
                takeUntilDestroyed(this.destroyRef),
                withLatestFrom(this.isFeatureSupportedInCurrentAcs.transform('isCapabilitiesApiAvailable')),
                switchMap(([isUserAdmin, isCapabilitiesApiAvailable]) => {
                    if (isUserAdmin) {
                        this.canDeleteHold = true;
                        return of(this.legalHoldEnabled);
                    } else if (!isCapabilitiesApiAvailable) {
                        return this.isFeatureSupportedInCurrentAcs.transform('app.dashboard.isRecordsManagerLegacy');
                    } else {
                        return this.filePlanService
                            .getFilePlanRoles('-filePlan-', {
                                where: {
                                    capabilityNames: [RecordCapability.ViewRecords, LegalHoldCapability.DeleteHold]
                                }
                            })
                            .pipe(
                                map((roles) => {
                                    let hasRecordCapability = false;
                                    roles?.list?.entries?.forEach((role) => {
                                        role.entry.capabilities?.forEach((capability) => {
                                            if (capability.name === RecordCapability.ViewRecords) {
                                                hasRecordCapability = true;
                                            }
                                            if (capability.name === LegalHoldCapability.DeleteHold) {
                                                this.canDeleteHold = true;
                                            }
                                        });
                                    });
                                    return this.legalHoldEnabled && hasRecordCapability;
                                })
                            );
                    }
                })
            )
            .subscribe((canShowLegalHolds) => {
                this.canShowLegalHolds = canShowLegalHolds;
            });
    }
}
