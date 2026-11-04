/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { PublicClientApplication } from '@azure/msal-browser';
import { MicrosoftOnlineEffects } from './store/effects/microsoft-online.effects';
import { NgModule } from '@angular/core';
import {
    MicrosoftOnlineService,
    MSAL_GUARD_TOKEN,
    MSAL_INSTANCE,
    MSAL_INTERCEPTOR_CONFIG,
    MsalBroadcastService,
    MsalGuard,
    MsalService
} from './components/msal';
import { AppConfigService, provideTranslations } from '@alfresco/adf-core';
import { WindowRef } from './components/resume-active-session/window-ref';
import { provideEffects } from '@ngrx/effects';
import { ResumeActiveSessionComponent } from './components/resume-active-session/resume-active-session.component';
import { EndSessionDialogComponent } from './components/end-session-dialog/end-session-dialog.component';
import { ExtensionService, provideExtensionConfig } from '@alfresco/adf-extensions';
import {
    isActiveMicrosoftSession,
    isExcelFile,
    isMicrosoftOnlinePluginEnabled,
    isPowerPointFile,
    isWordFile
} from './rules/office-online-integration.rules';
import { isUserWriteLockOwner, isWriteLocked } from '@alfresco/aca-shared/rules';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { CreateDocumentDialogComponent } from './components/create-document-dialog/create-document-dialog.component';
import { CreateDocumentExtensionEffects } from './store/effects/create-document.effects';

export function MSALInterceptorConfigFactory() {
    return {
        popUp: true,
        consentScopes: ['user.read', 'openid', 'profile', 'Files.ReadWrite.All'],
        unprotectedResources: [],
        protectedResourceMap: [['https://graph.microsoft.com/v1.0/me', ['user.read']]],
        extraQueryParameters: {}
    };
}

export function MSALInstanceFactory(): PublicClientApplication {
    return new PublicClientApplication({ auth: { clientId: '' } });
}

const microsoftEffects = [MicrosoftOnlineEffects, CreateDocumentExtensionEffects];

@NgModule({
    providers: [
        provideTranslations('microsoft-office-online-integration-extension', 'assets/adf-microsoft-office-online-integration-extension'),
        provideExtensionConfig(['microsoft-office-online-integration-extension.json']),
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { floatLabel: 'never' } },
        {
            provide: MSAL_INSTANCE,
            useFactory: MSALInstanceFactory,
            deps: [AppConfigService]
        },
        {
            provide: MSAL_INTERCEPTOR_CONFIG,
            useFactory: MSALInterceptorConfigFactory
        },
        {
            provide: MSAL_GUARD_TOKEN,
            useValue: MsalGuard
        },
        MsalService,
        MsalBroadcastService,
        MicrosoftOnlineService,
        WindowRef,
        provideEffects(microsoftEffects)
    ],
    imports: [ResumeActiveSessionComponent, EndSessionDialogComponent, CreateDocumentDialogComponent],
    exports: [ResumeActiveSessionComponent, EndSessionDialogComponent, CreateDocumentDialogComponent]
})
export class MicrosoftOfficeOnlineIntegrationExtensionModule {
    constructor(extensions: ExtensionService) {
        extensions.setComponents({
            'content-services.components.resume-active-session': ResumeActiveSessionComponent
        });

        extensions.setEvaluators({
            'app.content-services.isWordFile': isWordFile,
            'app.content-services.isPowerPointFile': isPowerPointFile,
            'app.content-services.isExcelFile': isExcelFile,
            'app.content-services.isActiveMicrosoftSession': isActiveMicrosoftSession,
            'app.content-services.isMicrosoftOnlinePluginEnabled': isMicrosoftOnlinePluginEnabled,
            'app.content-services.isWriteLocked': isWriteLocked,
            'app.content-services.isUserWriteLockOwner': isUserWriteLockOwner
        });
    }
}
