import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthenticationService } from '@alfresco/adf-core';
import { HttpClient } from '@angular/common/http';
import { syncVendorPortalMemberFromProfile } from '../vendor-portal/vendor-portal-access';

export const vendorDocumentCreationGuard: CanActivateFn = async () => {
    const authService = inject(AuthenticationService);
    const http = inject(HttpClient);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
        return router.parseUrl('/login');
    }

    const isCurrentUserVendor = await syncVendorPortalMemberFromProfile(authService, http);
    return isCurrentUserVendor ? true : router.parseUrl('/home');
};
