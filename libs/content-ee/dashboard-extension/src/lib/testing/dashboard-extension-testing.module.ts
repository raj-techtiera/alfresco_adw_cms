/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {
    AppConfigService,
    AppConfigServiceMock,
    NoopTranslateModule,
    PageTitleService,
    provideCoreAuth,
    TRANSLATION_PROVIDER
} from '@alfresco/adf-core';
import { TranslateService, TranslateStore } from '@ngx-translate/core';
import { AlfrescoApiService, AlfrescoApiServiceMock } from '@alfresco/adf-content-services';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideCharts } from 'ng2-charts';
import { ArcElement, DoughnutController, Legend, Tooltip } from 'chart.js';
import { provideMockStore } from '@ngrx/store/testing';

@NgModule({
    imports: [NoopAnimationsModule, NoopTranslateModule, MatDialogModule, MatSnackBarModule],
    providers: [
        provideCoreAuth(),
        provideMockStore(),
        provideHttpClientTesting(),
        TranslateStore,
        TranslateService,
        { provide: AlfrescoApiService, useClass: AlfrescoApiServiceMock },
        { provide: AppConfigService, useClass: AppConfigServiceMock },
        {
            provide: TRANSLATION_PROVIDER,
            multi: true,
            useValue: {
                name: 'dashboard-extension',
                source: 'assets'
            }
        },
        {
            provide: PageTitleService,
            useValue: {}
        },
        provideCharts({ registerables: [DoughnutController, Legend, ArcElement, Tooltip] })
    ]
})
export class DashboardExtensionTestingModule {}
