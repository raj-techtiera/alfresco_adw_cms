/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ExtensionService } from '@alfresco/adf-extensions';
import { NgModule } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { EditSecurityMarkEffect } from './effects/edit-security-mark.effect';
import { SecurityMarksDialogComponent } from './components/security-marks-dialog/security-marks.dialog';
import { DisplaySecurityMarksComponent } from './components/display-security-marks/display-security-marks.component';
import { SecurityMarksHelpComponent } from './components/security-marks-help/security-marks-help.component';

export const effects = [EditSecurityMarkEffect];

@NgModule({
    imports: [
        SecurityMarksDialogComponent,
        DisplaySecurityMarksComponent,
        SecurityMarksHelpComponent
    ],
    providers: [provideEffects(effects)],
    exports: [
        SecurityMarksDialogComponent,
        DisplaySecurityMarksComponent,
        SecurityMarksHelpComponent
    ]
})
export class SecurityMarksModule {
    constructor(extensions: ExtensionService) {
        extensions.setComponents({
            'app.display.security.marks': DisplaySecurityMarksComponent
        });
    }
}
