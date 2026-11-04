import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationService } from '@alfresco/adf-core';
import { HttpClient } from '@angular/common/http';
import { syncReportsMemberFromProfile } from '../reports-portal/reports-access';

export const reportsGuard: CanActivateFn = async () => {
    const authService = inject(AuthenticationService);
    const http = inject(HttpClient);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
        return router.parseUrl('/login');
    }

    const allowed = await syncReportsMemberFromProfile(authService, http);
    return allowed ? true : router.parseUrl('/home');
};
