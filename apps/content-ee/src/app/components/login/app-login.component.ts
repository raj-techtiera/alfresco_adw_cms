/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { AppConfigPipe, AuthenticationService, LoginComponent } from '@alfresco/adf-core';
import { TranslatePipe } from '@ngx-translate/core';
import { AlfrescoLoginCredentialsService } from '../../services/alfresco-login-credentials.service';
import { environment } from '../../../environments/environment';
@Component({
    standalone: true,
    imports: [TranslatePipe, LoginComponent, AppConfigPipe],
    templateUrl: './app-login.component.html',
    styleUrls: ['./app-login.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AppLoginComponent implements OnInit {
    logoUrl = environment.logoUrl;
    logoImage = environment.logoImage;
    constructor(
        private authService: AuthenticationService,
        private readonly loginCredentials: AlfrescoLoginCredentialsService
    ) {}

    ngOnInit(): void {
        // If user is already authenticated when we hit /login, skip the login screen
        if (this.authService.isLoggedIn()) {
            this.redirectToDashboardHard();
        }
    }

    /** Force mute — browsers sometimes ignore the muted attribute alone. */
    muteAndPlay(video: HTMLVideoElement): void {
        if (!video) {
            return;
        }
        video.muted = true;
        video.volume = 0;
        video.setAttribute('muted', '');
        const playPromise = video.play();
        if (playPromise?.catch) {
            playPromise.catch(() => {
                /* autoplay may be blocked until user gesture; stay muted */
            });
        }
    }

    onLoginSuccess() {
        this.persistLoginCredentials();
        // After successful login, force a full reload on the dashboard route.
        // This avoids intermittent blank pages after multiple login/logout cycles.
        this.redirectToDashboardHard();
    }

    private persistLoginCredentials(): void {
        const root = document.querySelector('.app-login-modern');
        const usernameInput = root?.querySelector(
            'input[formcontrolname="username"], input[name="username"], #username'
        ) as HTMLInputElement | null;
        const passwordInput = root?.querySelector(
            'input[formcontrolname="password"], input[name="password"], #password'
        ) as HTMLInputElement | null;

        const userId = usernameInput?.value?.trim() || this.authService.getUsername()?.trim() || '';
        const password = passwordInput?.value ?? '';
        this.loginCredentials.save(userId, password);
    }

    private redirectToDashboardHard(): void {
        const base = window.location.origin + window.location.pathname;
        window.location.href = `${base}#/dms-dashboard`;
    }
}
