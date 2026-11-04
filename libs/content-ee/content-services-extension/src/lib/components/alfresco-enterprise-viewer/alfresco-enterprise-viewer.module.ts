/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { AlfrescoEnterpriseViewerComponent } from './alfresco-enterprise-viewer.component';

@NgModule({
    declarations: [AlfrescoEnterpriseViewerComponent],
    exports: [AlfrescoEnterpriseViewerComponent]
})
export class AlfrescoEnterpriseViewerModule {}
