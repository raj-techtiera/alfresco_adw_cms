/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { ExtensionService } from '@alfresco/adf-extensions';
import { StartProcessExtComponent } from './components/start-process/start-process-ext.component';
import { ProcessDefinitionsExtComponent } from './components/process-definitions/process-definitions-ext.component';
import { canDisplayBadgeAndPanel, canShowStartProcessFromContent } from '../../rules/process-services.rules';
import { StartProcessExtEffect } from './effects/start-process-ext.effect';
import { StartProcessDialogComponent } from './components/start-process-dialog/start-process-dialog.component';
import { RunningProcessIconComponent } from './components/running-process-icon/running-process-icon.component';

@NgModule({
    imports: [
        ProcessDefinitionsExtComponent,
        StartProcessDialogComponent,
        StartProcessExtComponent
    ],
    providers: [provideEffects([StartProcessExtEffect])],
})
export class StartProcessModule {
    constructor(extensions: ExtensionService) {
        extensions.setComponents({
            'process-services-plugin.components.start-process-ext': StartProcessExtComponent,
            'process-services-plugin.components.process-definitions-ext': ProcessDefinitionsExtComponent,
            'process-services-plugin.components.running-process-icon': RunningProcessIconComponent
        });

        extensions.setEvaluators({
            'app.process.canShowStartProcessFromContent': canShowStartProcessFromContent,
            'app.process.canDisplayBadgeAndPanel': canDisplayBadgeAndPanel
        });
    }
}
