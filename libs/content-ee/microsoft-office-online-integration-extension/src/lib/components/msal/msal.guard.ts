/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, CanActivateFn } from '@angular/router';
import { InteractionType, MSAL_GUARD_CONFIG } from './constants';
import { MsalGuardConfiguration } from './msal.guard.config';
import { Observable, of } from 'rxjs';
import { catchError, concatMap, map } from 'rxjs/operators';
import { Location } from '@angular/common';
import { MsalService } from './msal.service';

export const MsalGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> => {
    const msalGuardConfig = inject(MSAL_GUARD_CONFIG) as unknown as MsalGuardConfiguration;
    const authService = inject(MsalService);
    const location = inject(Location);

    return authService.handleRedirectObservable().pipe(
        concatMap(() => {
            if (!authService.getAllAccounts()?.length) {
                return loginInteractively(state.url, msalGuardConfig, authService, location);
            }
            return of(true);
        })
    );
};

const getDestinationUrl = (path: string, location: Location): string => {
    const baseElements = document.getElementsByTagName('base');
    const baseUrl = location.normalize(baseElements.length ? baseElements[0].href : window.location.origin);

    const pathUrl = location.prepareExternalUrl(path);

    if (pathUrl.startsWith('#')) {
        return `${baseUrl}/${pathUrl}`;
    }

    return `${baseUrl}${path}`;
};

const loginInteractively = (url: string, msalGuardConfig: MsalGuardConfiguration, authService: MsalService, location: Location): Observable<boolean> => {
    if (msalGuardConfig.interactionType === InteractionType.POPUP) {
        return authService.loginPopup({ ...msalGuardConfig.authRequest }).pipe(
            map(() => true),
            catchError(() => of(false))
        );
    }

    const redirectStartPage = getDestinationUrl(url, location);
    authService.loginRedirect({
        ...msalGuardConfig.authRequest,
        redirectStartPage,
        scopes: [],
    });
    return of(false);
};
