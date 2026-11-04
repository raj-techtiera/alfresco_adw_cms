/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AppConfigService, AppConfigServiceMock, NoopTranslateModule, provideCoreAuth, provideTranslations } from '@alfresco/adf-core';
import { provideHttpClient } from '@angular/common/http';
import { provideStore } from '@ngrx/store';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { AlfrescoApiService, AlfrescoApiServiceMock } from '@alfresco/adf-content-services';
import { provideRouter } from '@angular/router';

@NgModule({
    imports: [NoopTranslateModule, MatSnackBarModule, MatDialogModule],
    providers: [
        provideNoopAnimations(),
        provideRouter([]),
        provideCoreAuth(),
        provideHttpClient(),
        provideStore(),
        { provide: AlfrescoApiService, useClass: AlfrescoApiServiceMock },
        { provide: AppConfigService, useClass: AppConfigServiceMock },
        provideTranslations('content-services-extension', 'assets')
    ]
})
export class ContentServicesTestingModule {}
