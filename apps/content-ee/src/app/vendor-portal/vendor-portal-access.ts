import { AuthenticationService } from '@alfresco/adf-core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

// Relative URL so dev proxy / deployed origin handles host resolution like other Activiti calls.
const ACTIVITI_PROFILE_URL = '/activiti-app/api/enterprise/profile';

/** Activiti group names (or group externalId) that unlock Vendor Document Registry / vendor portal UI. */
const VENDOR_PORTAL_GROUP_NAMES = new Set(['EDMS_VENDOR']);

type ActivitiGroup = {
    name?: string;
    externalId?: string | null;
};

type ActivitiProfile = {
    name?: string;
    groups?: ActivitiGroup[] | null;
    primaryGroup?: ActivitiGroup | null;
};

const matchesVendorPortalGroup = (value: unknown): boolean =>
    typeof value === 'string' && VENDOR_PORTAL_GROUP_NAMES.has(value.trim().toUpperCase());

const hasVendorPortalGroup = (profile: ActivitiProfile): boolean => {
    if (matchesVendorPortalGroup(profile?.name)) {
        return true;
    }

    if (
        matchesVendorPortalGroup(profile?.primaryGroup?.name) ||
        matchesVendorPortalGroup(profile?.primaryGroup?.externalId)
    ) {
        return true;
    }

    if (Array.isArray(profile?.groups)) {
        return profile.groups.some(
            (group) =>
                matchesVendorPortalGroup(group?.name) || matchesVendorPortalGroup(group?.externalId)
        );
    }

    return false;
};

/**
 * Calls Activiti profile API with the login user's auth header and evaluates whether
 * `EDMS_VENDOR` or `PTTEP_DCM` (by group `name` or `externalId`, or top-level/primary group) is present.
 */
export const syncVendorPortalMemberFromProfile = async (
    authService: AuthenticationService,
    http: HttpClient
): Promise<boolean> => {
    try {
        const headers = await firstValueFrom(
            authService.addTokenToHeader(
                ACTIVITI_PROFILE_URL,
                new HttpHeaders({
                    'Cache-Control': 'no-store',
                    Pragma: 'no-cache'
                })
            )
        );
        const profile = await firstValueFrom(http.get<unknown>(ACTIVITI_PROFILE_URL, { headers }));
        return hasVendorPortalGroup((profile as ActivitiProfile) || {});
    } catch {
        return false;
    }
};
