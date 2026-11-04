/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { AppConfigService, AuthGuard, FormRenderingService, NotificationService, provideTranslations } from '@alfresco/adf-core';
import { AttachFileWidgetDialogService, ProcessFormRenderingService } from '@alfresco/adf-process-services';
import { EXTENSION_DATA_LOADERS, ExtensionsDataLoaderGuard, PluginEnabledGuard } from '@alfresco/aca-shared';
import { ExtensionService, provideExtensionConfig } from '@alfresco/adf-extensions';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { canCancelProcess, canShowProcessToolbarItems, isProcessServicePluginEnabled } from './rules/process-services.rules';
import { FilePreviewExtComponent } from './components/tasks';
import { SidenavExtComponent } from './components/sidenav/sidenav-ext.component';
import { ProcessExtensionService } from './services/process-extension.service';
import { Store } from '@ngrx/store';
import { provideRouter, Routes } from '@angular/router';
import { processServicePluginLoaderFactory } from './services/process-service-plugin-loader.factory';
import { StartProcessModule } from './features/start-process/start-process.module';
import { TaskListModule } from './features/task-list/task-list.module';
import { ProcessListModule } from './features/process-list/process-list.module';
import { ProcessDetailsModule } from './features/process-details/process-details.module';
import { TaskDetailsModule } from './features/task-details/task-details.module';
import { LinkedProcessPanelComponent } from './components/processes/linked-process-panel/linked-process-panel.component';
import { provideProcessServicesExtensionStore } from './store/providers';
import { AuthSectionComponent } from './components/auth-section/auth-section.component';
import { catchError, forkJoin, from, of, take } from 'rxjs';
import { IntegrationAlfrescoOnPremiseApi, IntegrationSSOApi, PreferencesApi } from '@alfresco/js-api';
import { AlfrescoApiService } from '@alfresco/adf-content-services';
import { AttachmentViewerComponent } from './components/widgets/attachment-viewer/attachment-viewer.component';
import { AttachFileWidgetDialogExtService } from './components/attach-file-dialog/attach-file-widget-dialog-ext.service';

export const appRoutes: Routes = [
    {
        path: 'apps/:appId/task-details/:taskId/view',
        component: FilePreviewExtComponent,
        children: [
            {
                path: 'preview/blob',
                component: FilePreviewExtComponent,
                outlet: 'overlay'
            }
        ]
    }
];

export const APS_AUTO_AUTH_KEY = 'apsAutoAuth';

@NgModule({
    imports: [StartProcessModule, TaskListModule, ProcessListModule, ProcessDetailsModule, TaskDetailsModule],
    providers: [
        provideRouter(appRoutes),
        provideTranslations('adf-process-services', 'assets/adf-process-services'),
        provideTranslations('process-services-extension', 'assets/adf-process-services-extension'),
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { floatLabel: 'never' } },
        {
            provide: EXTENSION_DATA_LOADERS,
            multi: true,
            useFactory: processServicePluginLoaderFactory,
            deps: [ProcessExtensionService, Store, AppConfigService]
        },
        provideExtensionConfig(['process-services-extension.json']),
        provideProcessServicesExtensionStore(),
        FormRenderingService,
        { provide: FormRenderingService, useClass: ProcessFormRenderingService },
        { provide: AttachFileWidgetDialogService, useClass: AttachFileWidgetDialogExtService }
    ]
})
export class ProcessServicesExtensionModule {
    private _preferencesApi: PreferencesApi;
    private _integrationAlfrescoOnPremiseApi: IntegrationAlfrescoOnPremiseApi;
    private _integrationSSOApi: IntegrationSSOApi;

    get preferencesApi(): PreferencesApi {
        this._preferencesApi = this._preferencesApi ?? new PreferencesApi(this.apiService.getInstance());
        return this._preferencesApi;
    }

    get integrationAlfrescoOnPremiseApi(): IntegrationAlfrescoOnPremiseApi {
        this._integrationAlfrescoOnPremiseApi =
            this._integrationAlfrescoOnPremiseApi ?? new IntegrationAlfrescoOnPremiseApi(this.apiService.getInstance());
        return this._integrationAlfrescoOnPremiseApi;
    }

    get integrationSSOApi(): IntegrationSSOApi {
        this._integrationSSOApi = this._integrationSSOApi ?? new IntegrationSSOApi(this.apiService.getInstance());
        return this._integrationSSOApi;
    }

    constructor(
        private apiService: AlfrescoApiService,
        private readonly notificationService: NotificationService,
        extensions: ExtensionService,
        processExtensionService: ProcessExtensionService,
        formRenderingService: FormRenderingService
    ) {
        extensions.setComponents({
            'process-services-plugin.components.process-services-side-nav-ext': SidenavExtComponent,
            'process-services-plugin.components.linked-process-panel': LinkedProcessPanelComponent,
            'process-services-plugin.components.auth-section': AuthSectionComponent
        });

        formRenderingService.setComponentTypeResolver(
            'attachment-viewer',
            () => AttachmentViewerComponent,
            true
        );

        extensions.setAuthGuards({
            'process-services-plugin.auth': AuthGuard,
            'extension-data-loader-guard.auth': ExtensionsDataLoaderGuard,
            'plugin-enabled-guard.auth': PluginEnabledGuard
        });

        extensions.setEvaluators({
            'app.process.isProcessServicePluginEnabled': isProcessServicePluginEnabled,
            'app.process.isProcessServiceRunning': isProcessServiceRunning,
            'app.process.canShowProcessToolbarItems': canShowProcessToolbarItems,
            'app.process.canCancelProcess': canCancelProcess
        });

        setTimeout(() => {
            forkJoin({
                autoAuth: from(this.preferencesApi.getPreference('-me-', APS_AUTO_AUTH_KEY)).pipe(
                    take(1),
                    catchError(() => of(null))
                ),
                repos: from(this.integrationAlfrescoOnPremiseApi.getRepositories()).pipe(
                    take(1),
                    catchError(() => of(null))
                )
            }).subscribe(({ autoAuth, repos }) => {
                if (repos?.data?.length > 0) {
                    const ssoInstance = repos.data.find((repo) => repo.authenticationType === 'sso');
                    const ssoRepositoryId = ssoInstance?.id.toString() ?? null;
                    if (autoAuth?.entry.value === 'true' && ssoRepositoryId) {
                        from(this.integrationSSOApi.getAccountInformation(ssoRepositoryId))
                            .pipe(
                                take(1),
                                catchError(() => of(null))
                            )
                            .subscribe((accountInfo) => {
                                if (accountInfo?.ownerEmail === null && accountInfo?.expireDate === null) {
                                    const authWindow = window.open(accountInfo.authenticationURL, '_blank', 'popup,width=600,height=600');
                                    const notification = this.notificationService;
                                    window.contentAccountAuthConfirmed = function () {
                                        authWindow?.close();
                                    };
                                    window.contentAccountAuthFailed = function (error: any, details: any) {
                                        notification.showError('AUTH_SECTION.AUTH_FAILED', null, { error, details });
                                        authWindow?.close();
                                    };
                                }
                            });
                    }
                }
            });
        }, 2000);

        function isProcessServiceRunning(): boolean {
            return processExtensionService.processServicesRunning;
        }
    }
}
