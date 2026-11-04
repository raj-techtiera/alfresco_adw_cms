/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NgModule } from '@angular/core';
import { TaskDetailsExtComponent } from './components/task-details-ext.component';
import { ExtensionService } from '@alfresco/adf-extensions';
import { provideEffects } from '@ngrx/effects';
import { TaskDetailsExtEffect } from './effects/task-details-ext.effect';

@NgModule({
    imports: [TaskDetailsExtComponent],
    providers: [provideEffects(TaskDetailsExtEffect)],
})
export class TaskDetailsModule {
    constructor(extensions: ExtensionService) {
        extensions.setComponents({
            'process-services-plugin.components.task-details-ext': TaskDetailsExtComponent
        });
    }
}
