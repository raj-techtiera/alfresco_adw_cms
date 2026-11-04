/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { ExtensionService } from '@alfresco/adf-extensions';
import { ProcessDetailsExtComponent } from './components/process-details/process-details-ext.component';
import { ProcessInfoDrawerComponent } from './components/info-drawer/process-info-drawer.component';
import { provideEffects } from '@ngrx/effects';
import { ProcessDetailsExtEffect } from './effects/process-details-ext.effect';
import { ProcessDetailsPageExtComponent } from './components/process-details-page-ext.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@NgModule({
    imports: [
        ProcessDetailsExtComponent,
        ProcessDetailsPageExtComponent,
        ProcessInfoDrawerComponent,
        MatTooltipModule
    ],
    providers: [provideEffects([ProcessDetailsExtEffect])],
    exports: [ProcessDetailsExtComponent]
})
export class ProcessDetailsModule {
    constructor(extensions: ExtensionService) {
        extensions.setComponents({
            'process-services-plugin.components.process-details-ext': ProcessDetailsPageExtComponent
        });
    }
}
