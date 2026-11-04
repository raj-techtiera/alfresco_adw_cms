/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import {
    AppConfigService,
    AppConfigServiceMock,
    CookieService,
    CookieServiceMock,
    NoopTranslateModule
} from '@alfresco/adf-core';
import { provideStore } from '@ngrx/store';
// import { RecordModule } from '../record/record.module';
import { AlfrescoApiService, AlfrescoApiServiceMock } from '@alfresco/adf-content-services';
import { filePlanServiceMock } from './file-plan.service.mock';
import { manageHoldsServiceMock } from './manage-holds.service.mock';
import { userProfileServiceMock } from './user-profile.service.mock';
import { provideEffects } from '@ngrx/effects';

@NgModule({
    imports: [
        NoopAnimationsModule,
        NoopTranslateModule,
        RouterTestingModule,
    ],
    providers: [
        provideStore(
            { app: (state) => state },
            {
                initialState: {
                    app: {
                        infoDrawerMetadataAspect: ''
                    }
                }
            }
        ),
        provideEffects([]),
        filePlanServiceMock,
        manageHoldsServiceMock,
        userProfileServiceMock,
        { provide: AlfrescoApiService, useClass: AlfrescoApiServiceMock },
        { provide: AppConfigService, useClass: AppConfigServiceMock },
        { provide: CookieService, useClass: CookieServiceMock }
    ]
})
export class GovernanceTestingModule {}
