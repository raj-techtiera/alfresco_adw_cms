/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { InjectionToken } from '@angular/core';
import { CanActivateFn } from '@angular/router';

export const MSAL_INSTANCE = new InjectionToken<string>('MSAL_INSTANCE');

export const MSAL_GUARD_CONFIG = new InjectionToken<string>('MSAL_GUARD_CONFIG');

export const MSAL_INTERCEPTOR_CONFIG = new InjectionToken<string>('MSAL_INTERCEPTOR_CONFIG');

export const MSAL_GUARD_TOKEN = new InjectionToken<CanActivateFn>('MSAL_GUARD_TOKEN');

export enum InteractionType {
    REDIRECT = 'redirect',
    POPUP = 'popup',
    SILENT = 'silent',
}

export enum MsalBroadcastEvent {
    LOGIN_SUCCESS = 'msal:loginSuccess',
    LOGIN_FAILURE = 'msal:loginFailure',
    ACQUIRE_TOKEN_SUCCESS = 'msal:acquireTokenSuccess',
    ACQUIRE_TOKEN_FAILURE = 'msal:acquireTokenFailure',
    SSO_SILENT_SUCCESS = 'msal:ssoSilentSuccess',
    SSO_SILENT_FAILURE = 'msal:ssoSilentFailure',
}
