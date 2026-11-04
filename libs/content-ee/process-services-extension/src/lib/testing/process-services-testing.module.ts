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
    FORM_FIELD_MODEL_RENDER_MIDDLEWARE,
    PageTitleService,
    provideCoreAuth,
    TRANSLATION_PROVIDER,
    TranslationMock,
    TranslationService
} from '@alfresco/adf-core';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { TranslateModule, TranslateService, TranslateStore } from '@ngx-translate/core';
import * as fromProcessServices from '../store/reducers/process-services.reducer';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconTestingModule } from '@angular/material/icon/testing';
import { AlfrescoApiService, AlfrescoApiServiceMock } from '@alfresco/adf-content-services';
import { provideHttpClient } from '@angular/common/http';

@NgModule({
    imports: [NoopAnimationsModule, TranslateModule.forRoot(), MatSnackBarModule, MatDialogModule, MatIconTestingModule],
    providers: [
        provideCoreAuth(),
        provideStore({}),
        provideState(fromProcessServices.featureKey, fromProcessServices.reducer),
        provideEffects([]),
        provideHttpClient(),
        TranslateStore,
        TranslateService,
        { provide: AlfrescoApiService, useClass: AlfrescoApiServiceMock },
        { provide: AppConfigService, useClass: AppConfigServiceMock },
        { provide: TranslationService, useClass: TranslationMock },
        {
            provide: TRANSLATION_PROVIDER,
            multi: true,
            useValue: {
                name: 'process-services-extension',
                source: 'assets'
            }
        },
        {
            provide: PageTitleService,
            useValue: {}
        },
        { provide: FORM_FIELD_MODEL_RENDER_MIDDLEWARE, useValue: [] }
    ],
    exports: [NoopAnimationsModule, TranslateModule]
})
export class ProcessServicesTestingModule {}
