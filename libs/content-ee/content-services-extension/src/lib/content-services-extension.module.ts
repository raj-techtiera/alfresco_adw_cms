/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { AppConfigService, AuthGuard, provideTranslations } from '@alfresco/adf-core';
import { ExtensionService, provideExtensionConfig } from '@alfresco/adf-extensions';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideEffects } from '@ngrx/effects';
import { DocumentBasePageService, PluginEnabledGuard } from '@alfresco/aca-shared';
import {
    MembershipRequestsNotificationsComponent
} from './components/notifications/membership-requests-notifications.component';
import { isMemberManagement } from './rules/content-services.rules';
import { ExtensionEffects } from './store/effects/extension.effects';
import { InfoDrawerMemberListComponent, LibraryDetailsComponent } from './components/library-member-management';
import { PreviewTabComponent } from './components/preview-tab/preview-tab.component';
import { AlfrescoEnterpriseViewerModule } from './components/alfresco-enterprise-viewer/alfresco-enterprise-viewer.module';
import { AlfrescoEnterpriseViewerComponent } from './components/alfresco-enterprise-viewer/alfresco-enterprise-viewer.component';
import { ExtendedContentManagementService } from './services/extended-content-management.service';

export const effects = [ExtensionEffects];

@NgModule({
    imports: [AlfrescoEnterpriseViewerModule],
    providers: [
        provideEffects(effects),
        provideTranslations('content-services-extension', 'assets/adf-content-services-extension'),
        provideExtensionConfig(['content-services-extension.json']),
        { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { floatLabel: 'never' } },
        {
            provide: DocumentBasePageService,
            useClass: ExtendedContentManagementService
        }
    ]
})
export class ContentServicesExtensionModule {
    constructor(extensions: ExtensionService, private appConfigService: AppConfigService) {
        extensions.setComponents({
            'content-services.components.library-requests-notification': MembershipRequestsNotificationsComponent,
            'content-services.components.members': InfoDrawerMemberListComponent,
            'content-services.components.member-manager': LibraryDetailsComponent,
            'content-services.components.preview-tab': PreviewTabComponent,
            'content-services.components.aev-viewer': AlfrescoEnterpriseViewerComponent
        });

        extensions.setAuthGuards({
            'content-services.auth': AuthGuard,
            'plugin-enabled-guard.auth': PluginEnabledGuard
        });

        extensions.setEvaluators({
            'app.content-services.isEnabled': () => this.isContentServicePluginEnabled(),
            'app.content-services.isMemberManagement': isMemberManagement
        });
    }

    private isContentServicePluginEnabled(): boolean {
        const flag = this.appConfigService.get<boolean | string>('plugins.contentService', true);
        return flag === true || flag === 'true';
    }
}
