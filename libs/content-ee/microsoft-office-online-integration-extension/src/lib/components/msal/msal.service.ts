/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Inject, Injectable } from '@angular/core';
import {
    IPublicClientApplication,
    AccountInfo,
    EndSessionRequest,
    AuthorizationUrlRequest,
    AuthenticationResult,
    PopupRequest,
    RedirectRequest,
    SilentRequest,
    AuthError,
    PublicClientApplication,
} from '@azure/msal-browser';
import { from, Observable } from 'rxjs';
import { MSAL_INSTANCE, MsalBroadcastEvent } from './constants';
import { MsalBroadcastService } from './msal.broadcast.service';
import { catchError, map } from 'rxjs/operators';
import { AppConfigService } from '@alfresco/adf-core';

interface IMsalService {
    acquireTokenPopup(request: PopupRequest): Observable<AuthenticationResult>;
    acquireTokenRedirect(request: RedirectRequest): Observable<void>;
    acquireTokenSilent(silentRequest: SilentRequest): Observable<AuthenticationResult>;
    getAccountByUsername(userName: string): AccountInfo | null;
    getAllAccounts(): AccountInfo[];
    handleRedirectObservable(): Observable<AuthenticationResult | null>;
    loginPopup(request?: PopupRequest): Observable<AuthenticationResult>;
    loginRedirect(request?: RedirectRequest): Observable<void>;
    logout(logoutRequest?: EndSessionRequest): Observable<void>;
    ssoSilent(request: AuthorizationUrlRequest): Observable<AuthenticationResult>;
}

export interface MsalConfigModel {
    isActive: boolean;
    auth: {
        clientId: string;
        authority: string;
        redirectUri: string;
        navigateToLoginRequestUrl: boolean;
        msHost: string;
    };
    cache: {
        cacheLocation: string;
        storeAuthStateInCookie: boolean;
    };
}

@Injectable({ providedIn: 'root' })
export class MsalService implements IMsalService {
    constructor(
        @Inject(MSAL_INSTANCE) private msalInstance: IPublicClientApplication,
        private broadcastService: MsalBroadcastService,
        private appConfigService: AppConfigService) {
        this.appConfigService.onLoad.subscribe(() => {
            this.setConfiguration();
        });
    }

    setConfiguration() {
        const pluginFlag = this.appConfigService.get<boolean | string>('plugins.microsoftOnline', false);
        const isPluginActive = pluginFlag === true || pluginFlag === 'true';

        const msalConfig: MsalConfigModel = {
            isActive: isPluginActive,
            auth: {
                clientId: isPluginActive ? this.appConfigService.get('msOnline.msClientId', '') : '',
                authority: isPluginActive ? this.appConfigService.get('msOnline.msAuthority', '') : '',
                redirectUri: isPluginActive ? this.appConfigService.get('msOnline.msRedirectUri', '') : '',
                msHost: isPluginActive ? this.appConfigService.get('msOnline.msHost', '') : '',
                navigateToLoginRequestUrl: true,
            },
            cache: {
                cacheLocation: 'localStorage',
                storeAuthStateInCookie: false,
            },
        };
        this.msalInstance = new PublicClientApplication(msalConfig?.isActive ? msalConfig : { auth: { clientId: '' } });
    }

    acquireTokenPopup(request: AuthorizationUrlRequest): Observable<AuthenticationResult> {
        return from(this.msalInstance.acquireTokenPopup(request)).pipe(
            map((authResponse) => {
                this.broadcastService.broadcast(MsalBroadcastEvent.ACQUIRE_TOKEN_SUCCESS, authResponse);
                return authResponse;
            }),
            catchError((error: AuthError) => {
                this.broadcastService.broadcast(MsalBroadcastEvent.ACQUIRE_TOKEN_FAILURE, error);
                throw error;
            })
        );
    }

    acquireTokenRedirect(request: RedirectRequest): Observable<void> {
        return from(this.msalInstance.acquireTokenRedirect(request));
    }

    acquireTokenSilent(silentRequest: SilentRequest): Observable<AuthenticationResult> {
        return from(this.msalInstance.acquireTokenSilent(silentRequest)).pipe(
            map((authResponse) => {
                this.broadcastService.broadcast(MsalBroadcastEvent.ACQUIRE_TOKEN_SUCCESS, authResponse);
                return authResponse;
            }),
            catchError((error: AuthError) => {
                this.broadcastService.broadcast(MsalBroadcastEvent.ACQUIRE_TOKEN_FAILURE, error);
                throw error;
            })
        );
    }

    getAccountByUsername(userName: string): AccountInfo {
        return this.msalInstance.getAccountByUsername(userName);
    }

    getAllAccounts(): AccountInfo[] {
        return this.msalInstance.getAllAccounts();
    }

    handleRedirectObservable(): Observable<AuthenticationResult> {
        const loggedInAccounts = this.msalInstance.getAllAccounts();
        return from(this.msalInstance.handleRedirectPromise()).pipe(
            map((authResponse) => {
                if (authResponse) {
                    const loggedInAccount = loggedInAccounts.find((account) => account.username === authResponse.account?.username);
                    if (loggedInAccount) {
                        this.broadcastService.broadcast(MsalBroadcastEvent.ACQUIRE_TOKEN_SUCCESS, authResponse);
                    } else {
                        this.broadcastService.broadcast(MsalBroadcastEvent.LOGIN_SUCCESS, authResponse);
                    }
                }
                return authResponse;
            }),
            catchError((error: AuthError) => {
                if (this.getAllAccounts().length > 0) {
                    this.broadcastService.broadcast(MsalBroadcastEvent.ACQUIRE_TOKEN_FAILURE, error);
                } else {
                    this.broadcastService.broadcast(MsalBroadcastEvent.LOGIN_FAILURE, error);
                }
                throw error;
            })
        );
    }

    loginPopup(request?: PopupRequest): Observable<AuthenticationResult> {
        return from(this.msalInstance.loginPopup(request)).pipe(
            map((authResponse) => {
                this.broadcastService.broadcast(MsalBroadcastEvent.LOGIN_SUCCESS, authResponse);
                return authResponse;
            }),
            catchError((error: AuthError) => {
                this.broadcastService.broadcast(MsalBroadcastEvent.LOGIN_FAILURE, error);
                throw error;
            })
        );
    }

    loginRedirect(request?: RedirectRequest): Observable<void> {
        return from(this.msalInstance.loginRedirect(request));
    }

    logout(logoutRequest?: EndSessionRequest): Observable<void> {
        return from(this.msalInstance.logout(logoutRequest));
    }

    ssoSilent(request: AuthorizationUrlRequest): Observable<AuthenticationResult> {
        return from(this.msalInstance.ssoSilent(request)).pipe(
            map((authResponse) => {
                this.broadcastService.broadcast(MsalBroadcastEvent.SSO_SILENT_SUCCESS, authResponse);
                return authResponse;
            }),
            catchError((error: AuthError) => {
                this.broadcastService.broadcast(MsalBroadcastEvent.SSO_SILENT_FAILURE, error);
                throw error;
            })
        );
    }

    private getCurrentAccount(): AccountInfo {
        const accounts = this.msalInstance?.getAllAccounts();
        return accounts?.length > 0 ? accounts[0] : undefined;
    }

    getToken(): Observable<string> {
        const scopes = ['user.read', 'openid', 'profile', 'Files.ReadWrite.All'];
        const account = this.getCurrentAccount();

        if (account) {
            return from(this.msalInstance.acquireTokenSilent({ account, scopes})).pipe(
                map((response) => response.accessToken),
                catchError(() =>
                    this.msalInstance
                        .acquireTokenPopup({ account, scopes })
                        .then((response) => response.accessToken)
                        .catch((error) => { throw error; })
                )
            );
        } else {
            return from(this.msalInstance.loginPopup({ scopes })).pipe(
                map((response) => response.accessToken),
                catchError((error) => { throw error; })
            );
        }
    }
}
