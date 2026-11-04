/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.components';
import { AppConfig } from './app/app.config';
import { applyStoredUiTheme } from './app/services/ui-theme.service';

if (environment.production) {
    enableProdMode();
}

applyStoredUiTheme();

void (async () => {
    await bootstrapApplication(AppComponent, AppConfig);
})();
