/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Routes } from '@angular/router';
import { AppLoginComponent } from './components/login/app-login.component';

export const APP_ROUTES: Routes = [
    {
        path: 'login',
        component: AppLoginComponent,
        data: {
            title: 'APP.SIGN_IN'
        }
    }
];
