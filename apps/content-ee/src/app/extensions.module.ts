/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, NgModule, provideAppInitializer } from '@angular/core';
import { AosExtensionModule } from '@alfresco/aca-content/ms-office';
import { RecordModule } from '@alfresco/adf-governance';
import { ContentServicesExtensionModule } from '@alfresco/adf-content-services-extension';
import { ProcessServicesExtensionModule } from '@alfresco/adf-process-services-extension';
import { AcaAboutModule, DEV_MODE_TOKEN, PACKAGE_JSON } from '@alfresco/aca-content/about';
import { MicrosoftOfficeOnlineIntegrationExtensionModule } from '@alfresco/microsoft-office-online-integration-extension';
import { environment } from '../environments/environment';
import packageJson from 'package.json';
import { provideAnalytics } from '@alfresco/analytics';
import { DashboardExtensionModule } from '@alfresco/dashboard-extension';
import { provideExtensionConfig, provideExtensions } from '@alfresco/adf-extensions';
import { VendorPortalNavRefreshService } from './vendor-portal/vendor-portal-nav-refresh.service';
import { ReportsNavRefreshService } from './reports-portal/reports-nav-refresh.service';
import { ConstructionDocumentsNavRefreshService } from './construction-documents-portal/construction-documents-nav-refresh.service';
import { canDisplayKnowledgeRetrievalButton } from './rules/knowledge-retrieval.rules';

@NgModule({
    imports: [
        environment.plugins.aca_aos ? AosExtensionModule : [],
        environment.plugins.aca_about ? AcaAboutModule : [],
        environment.plugins.adw_governance ? RecordModule : [],
        environment.plugins.adw_aps1 ? ProcessServicesExtensionModule : [],
        environment.plugins.adw_content_services ? ContentServicesExtensionModule : [],
        environment.plugins.adw_office365 ? MicrosoftOfficeOnlineIntegrationExtensionModule : [],
        environment.plugins.adw_dashboard ? DashboardExtensionModule : []
    ],
    providers: [
        provideAnalytics(),
        { provide: PACKAGE_JSON, useValue: packageJson },
        { provide: DEV_MODE_TOKEN, useValue: true },
        provideExtensionConfig(['custom-nav.plugin.json']),
        provideExtensions({
            evaluators: {
                'app.selection.displayedKnowledgeRetrievalButton': canDisplayKnowledgeRetrievalButton
            }
        }),
        provideAppInitializer(() => {
            inject(VendorPortalNavRefreshService);
            inject(ReportsNavRefreshService);
            inject(ConstructionDocumentsNavRefreshService);
        })
    ]
})
export class AppExtensionsModule {}
