/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, NgModule } from '@angular/core';
import { Router } from '@angular/router';
import { ExtensionService, provideExtensionConfig } from '@alfresco/adf-extensions';
import { AppConfigService, provideTranslations } from '@alfresco/adf-core';
import { ExtensionsDataLoaderGuard } from '@alfresco/aca-shared';
import { AcaRuleContext } from '@alfresco/aca-shared/rules';
import { DashboardSidenavComponent } from './components/dashboard-sidenav/dashboard-sidenav.component';
import { DashboardHomeComponent } from './components/dashboard-home/dashboard-home.component';
import { isRecordsManagerLegacy } from '@alfresco/adf-governance';
import { IsFeatureSupportedInCurrentAcsPipe } from '@alfresco/aca-content';

const isDashboardPluginEnabled = (appConfig: AppConfigService): boolean => {
    const flag = appConfig.get<boolean | string>('plugins.dashboardEnabled', false);
    return flag === true || flag === 'true';
};

const isPluginEnabledEvaluator = (context: AcaRuleContext): boolean => {
    return isDashboardPluginEnabled(context.appConfig);
};

const DashboardPluginEnabledGuard = (): boolean => {
    const router = inject(Router);
    const appConfig = inject(AppConfigService);

    const isEnabled = isDashboardPluginEnabled(appConfig);
    if (!isEnabled) {
        void router.navigate(['/personal-files']);
    }
    return isEnabled;
};

@NgModule({
    providers: [
        provideTranslations('dashboard-extension', 'assets/adw-dashboard-extension'),
        provideExtensionConfig(['dashboard-extension.json']),
        IsFeatureSupportedInCurrentAcsPipe
    ]
})
export class DashboardExtensionModule {
    constructor(extensions: ExtensionService) {
        extensions.setComponents({
            'dashboard.component.home': DashboardHomeComponent,
            'dashboard.component.sidenav': DashboardSidenavComponent
        });
        extensions.setAuthGuards({
            'dashboard-plugin-enabled-guard.auth': DashboardPluginEnabledGuard,
            'extension-data-loader-guard.auth': ExtensionsDataLoaderGuard
        });
        extensions.setEvaluators({
            'app.dashboard.isEnabled': isPluginEnabledEvaluator,
            'app.dashboard.isRecordsManagerLegacy': isRecordsManagerLegacy
        });
    }
}
