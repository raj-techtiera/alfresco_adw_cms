/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideAnimations, provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { AuthGuard, provideAppConfig, provideCoreAuth, provideI18N } from '@alfresco/adf-core';
import { AppService } from '@alfresco/aca-shared';
import { AppExtensionsModule } from './extensions.module';
import { environment } from '../environments/environment';
import { provideRouter, Route, withHashLocation } from '@angular/router';
import {
  provideShellRoutes,
  SHELL_APP_SERVICE,
  SHELL_AUTH_TOKEN,
  SHELL_NAVBAR_MAX_WIDTH
} from '@alfresco/adf-core/shell';
import { CONTENT_LAYOUT_ROUTES, ContentServiceExtensionModule } from '@alfresco/aca-content';
import { APP_ROUTES } from './app.routes';
import { provideCharts } from 'ng2-charts';
import { ArcElement, DoughnutController, Legend, Tooltip } from 'chart.js';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { MAT_TABS_CONFIG } from '@angular/material/tabs';
import { CAD_PDF_RENDERER } from '../../../../libs/content-ee/process-services-extension/src/lib/services/cad-pdf-renderer';
import { CAD_VIEWER_OPENER } from '../../../../libs/content-ee/process-services-extension/src/lib/services/cad-viewer-opener';
import { CadPdfRendererService } from './cad-viewer/cad-pdf-renderer.service';
import { CadViewerOpenService } from './cad-viewer/cad-viewer-open.service';
import { HomePageComponent } from './components/home-page/home-page.component';
import { ClassificationPanelComponent } from './components/classification/classification-panel.component';
import './app.i18n';
import { ViewProjectComponent } from './components/view-project/view-project.component';
import { CreateNewProjectComponent } from './components/create-new-project/create-new-project.component';
import { ProjectExplorerComponent } from './components/project-explorer/project-explorer.component';
import { VendorDocumentCreationComponent } from './components/vendor-document-creation/vendor-document-creation.component';
import { ConstructionDocumentsComponent } from './components/construction-documents/construction-documents.component';
import { vendorDocumentCreationGuard } from './guards/vendor-document-creation.guard';
import { constructionDocumentsGuard } from './guards/construction-documents.guard';
import { reportsGuard } from './guards/reports.guard';
import { ReportsComponent } from './components/reports/reports.component';

import { GeographicoverviewComponent } from './components/geographicoverview/geographicoverview.component';
import { BusinessUnitsComponent } from './components/business-units/business-units/business-units.component';
import { KpiDashboardComponent } from './components/kpi-dashboard/kpi-dashboard.component';
import { DmsDashboardComponent } from './components/dms-dashboard/dms-dashboard.component';
import { IntelligenceCenterComponent } from './components/intelligence-centre/intelligence-center.component';
import { ComplianceComponent } from './components/compliance/compliance.component';
import { AuditLogComponent } from './components/audit-log/audit-log.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { TeamResourcesComponent } from './components/team-resources/team-resources.component';
import { ProjectTeamComponent } from './components/projectTeam/projectTeam.component';
import { SettingsComponent } from './components/settings/settings.component';
import { DocNumberingSettingsComponent } from './components/doc-numbering-settings/doc-numbering-settings.component';
import { OnboardingComponent } from './components/Onboarding/Onboarding.component';
import { BillingComponent } from './components/billing/billing.component';
import { BrandingComponent } from './components/branding/branding.component';
import { DataMigrationComponent } from './components/data-migration/data-migration.component';
import { AdministrationHubComponent } from './components/administration-hub/administration-hub.component';
import { AiUsageIntelligenceComponent } from './components/aiUsage-intelligence/aiUsage-intelligence.component';
import { UserManagementComponent } from './components/User-Management/user-management/User-Management.component';
import { HrManagementComponent } from './components/hr-management/hr-management/hr-management.component';
import { AssetsDashboardComponent } from './components/assets/dashboard/assets-dashboard.component';
import { CreateAssetsComponent } from './components/assets/create-assets/create-assets.component';
import { TagsWorkspaceComponent } from './components/tags-workspace/tags-workspace.component';
import { MasterDataComponent } from './components/master-data/master-data.component';

// Register custom home page route inside the shell layout
const shellChildren = CONTENT_LAYOUT_ROUTES[0]?.children;
if (shellChildren) {
    // Remove stale duplicates during dev reloads.
    const customPaths = new Set(['home', 'classification', 'classification/:nodeId', 'vendor-document-creation', 'construction-documents', 'reports', 'tags', 'master-data', 'hr-management', 'document-management', 'document-management/:nodeId', 'dms-dashboard']);
    for (let i = shellChildren.length - 1; i >= 0; i--) {
        const p = shellChildren[i]?.path;
        if (p && customPaths.has(p)) {
            shellChildren.splice(i, 1);
        }
    }

    const homeRoute: Route = { path: 'home', component: HomePageComponent };
    const createProjectRoute: Route = { path: 'listOf-Projects', component: ViewProjectComponent };
    const businessUnitsRoute: Route = { path: 'business-units', component: BusinessUnitsComponent };
    const geographicOverViewRoute: Route = { path: 'geographicOverView', component: GeographicoverviewComponent };
    const createNewProjectRoute: Route = { path: 'create-new-project', component: CreateNewProjectComponent };
    const kpiDashboardRoute: Route = { path: 'kpiDashboard', component: KpiDashboardComponent };
    const dmsDashboardRoute: Route = { path: 'dms-dashboard', component: DmsDashboardComponent };
    const intelligenceCenterRoute: Route = { path: 'intelligenceDashboard', component: IntelligenceCenterComponent };
    const complianceRoute: Route = { path: 'compliance', component: ComplianceComponent };
    const auditLogRoute: Route = { path: 'auditLog', component: AuditLogComponent };
    const notificationRoute: Route = { path: 'notifications', component: NotificationsComponent };
    const team_resourcesRoute: Route = { path: 'team-resources', component: TeamResourcesComponent };
    const project_TeamRoute: Route = { path: 'project-team', component: ProjectTeamComponent};
    const settingsRoute: Route = { path: 'settings', component: SettingsComponent};
    const doc_numbering_settingsRoute: Route = { path: 'doc-numbering-settings', component: DocNumberingSettingsComponent};
    const onboardingRoute: Route = { path: 'onboarding', component: OnboardingComponent};
    const billingRoute: Route = { path: 'billing', component: BillingComponent};
    const brandingRoute: Route = { path: 'branding', component: BrandingComponent};
    const dataMigrationRoute: Route = { path: 'data-migration', component: DataMigrationComponent};
    const administration_HubRoute: Route = { path: 'administration-hub', component: AdministrationHubComponent};
    const aiUsage_IntelligenceRoute: Route = { path: 'ai-usage-intelligence', component: AiUsageIntelligenceComponent};
    const userManagementRoute: Route = { path: 'user-management', component: UserManagementComponent };
    const hrManagementRoute: Route = { path: 'hr-management', component: HrManagementComponent };
    const classificationRoute: Route = { path: 'classification', component: ClassificationPanelComponent };
    const classificationNodeRoute: Route = { path: 'classification/:nodeId', component: ClassificationPanelComponent };
    const projectExplorerRoute: Route = { path: 'projects', component: ProjectExplorerComponent };
    const projectExplorerNodeRoute: Route = { path: 'projects/:nodeId', component: ProjectExplorerComponent };
    const documentManagementRoute: Route = {
        path: 'document-management',
        redirectTo: `/document-management/${environment.documentManagementNodeId}`,
        pathMatch: 'full'
    };
    const documentManagementNodeRoute: Route = { path: 'document-management/:nodeId', component: ProjectExplorerComponent };
    const vendorDocumentCreationRoute: Route = {path: 'vendor-document-creation',component: VendorDocumentCreationComponent,canActivate: [vendorDocumentCreationGuard]};
    const constructionDocumentsRoute: Route = {
        path: 'construction-documents',
        component: ConstructionDocumentsComponent,
        canActivate: [constructionDocumentsGuard]
    };
    const assetsDashboardRoute: Route = {
        path: 'assets-dashboard',
        component: AssetsDashboardComponent,
    };
const createAssetRoute: Route = {path: 'create-asset',component: CreateAssetsComponent};
    const tagsWorkspaceRoute: Route = {
        path: 'tags',
        component: TagsWorkspaceComponent
    };
    const masterDataRoute: Route = {
        path: 'master-data',
        component: MasterDataComponent
    };
    const reportsRoute: Route = {
        path: 'reports',
        component: ReportsComponent,
        canActivate: [reportsGuard]
    };

    // Insert before the empty route ('') to avoid it shadowing custom paths.
    const emptyPathIndex = shellChildren.findIndex((r: any) => r.path === '');
    const insertIndex = emptyPathIndex >= 0 ? emptyPathIndex : shellChildren.findIndex((r: any) => r.path === '**');

    if (insertIndex >= 0) {
        shellChildren.splice(
            insertIndex,
            0,
            homeRoute,
            createProjectRoute,
            createNewProjectRoute,
            classificationRoute,
            classificationNodeRoute,
            projectExplorerRoute,
            projectExplorerNodeRoute,
            documentManagementRoute,
            documentManagementNodeRoute,
            vendorDocumentCreationRoute,
            constructionDocumentsRoute,
            reportsRoute,
            businessUnitsRoute,
            geographicOverViewRoute,
            kpiDashboardRoute,
            dmsDashboardRoute,
            intelligenceCenterRoute,
            complianceRoute,
            auditLogRoute,
            notificationRoute,
            team_resourcesRoute,
            project_TeamRoute,
            settingsRoute,
            doc_numbering_settingsRoute,
            onboardingRoute,
            billingRoute,
            brandingRoute,
            dataMigrationRoute,
            administration_HubRoute,
            aiUsage_IntelligenceRoute,
            userManagementRoute,
            hrManagementRoute,
            assetsDashboardRoute,
            createAssetRoute,
            tagsWorkspaceRoute,
            masterDataRoute
        );
    } else {
        shellChildren.push(
            homeRoute,
            createProjectRoute,
            createNewProjectRoute,
            classificationRoute,
            classificationNodeRoute,
            projectExplorerRoute,
            projectExplorerNodeRoute,
            documentManagementRoute,
            documentManagementNodeRoute,
            vendorDocumentCreationRoute,
            constructionDocumentsRoute,
            kpiDashboardRoute,
            dmsDashboardRoute,
            intelligenceCenterRoute,
            complianceRoute,
            auditLogRoute,
            notificationRoute,
            team_resourcesRoute,
            project_TeamRoute,
            settingsRoute,
            doc_numbering_settingsRoute,
            onboardingRoute,
            billingRoute,
            brandingRoute,
            dataMigrationRoute,
            administration_HubRoute,
            aiUsage_IntelligenceRoute,
            userManagementRoute,
            hrManagementRoute,
            reportsRoute,
            assetsDashboardRoute,
            createAssetRoute,
            tagsWorkspaceRoute,
            masterDataRoute
        );
    }
}

export const AppConfig: ApplicationConfig = {
    providers: [
        importProvidersFrom(ContentServiceExtensionModule, AppExtensionsModule),
        provideHttpClient(),
        provideCoreAuth({ useHash: true }),
        provideAppConfig(),
        provideRouter(APP_ROUTES, withHashLocation()),
        provideShellRoutes(CONTENT_LAYOUT_ROUTES),
        environment.e2e ? provideNoopAnimations() : provideAnimations(),
        {
            provide: SHELL_APP_SERVICE,
            useClass: AppService
        },
        {
            provide: SHELL_AUTH_TOKEN,
            useValue: AuthGuard
        },
        /* Narrower left navigation than ADF shell default (320px) */
        {
            provide: SHELL_NAVBAR_MAX_WIDTH,
            useValue: 252
        },
        provideI18N({
            assets: [
                ['app', 'assets'],
                ['custom-nav', 'assets/custom-nav']
            ]
        }),
        provideCharts({ registerables: [DoughnutController, Legend, ArcElement, Tooltip] }),
        {
            provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
            useValue: {
                duration: 10000
            }
        },
        {
            provide: CAD_PDF_RENDERER,
            useExisting: CadPdfRendererService
        },
        {
            provide: CAD_VIEWER_OPENER,
            useExisting: CadViewerOpenService
        },
        /* Preview / Properties / Comments: show all tab labels in narrow ACA info drawer (Material otherwise paginates) */
        {
            provide: MAT_TABS_CONFIG,
            useValue: {
                disablePagination: true,
                stretchTabs: true,
                /* Keep every tab body mounted so stacked info-drawer panels can all render at once */
                preserveContent: true
            }
        }
    ]
};
