import { AuthenticationService } from '@alfresco/adf-core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const ACTIVITI_PROFILE_URL = '/activiti-app/api/enterprise/profile';

/** Activiti group name that unlocks My Construction Document navigation and route. */
export const CONSTRUCTION_DOCUMENTS_ALLOWED_GROUP = 'EPC_CIVIL_CONTRACTOR';

type ActivitiGroup = {
    name?: string;
    externalId?: string | null;
};

type ActivitiProfile = {
    name?: string;
    groups?: ActivitiGroup[] | null;
    primaryGroup?: ActivitiGroup | null;
};

const sameGroupName = (value: unknown, target: string): boolean =>
    typeof value === 'string' && value.trim().toUpperCase() === target;

export const profileHasConstructionDocumentsGroup = (profile: ActivitiProfile): boolean => {
    const target = CONSTRUCTION_DOCUMENTS_ALLOWED_GROUP.trim().toUpperCase();

    if (sameGroupName(profile?.name, target)) {
        return true;
    }

    if (sameGroupName(profile?.primaryGroup?.name, target) || sameGroupName(profile?.primaryGroup?.externalId, target)) {
        return true;
    }

    if (Array.isArray(profile?.groups)) {
        return profile.groups.some(
            (group) => sameGroupName(group?.name, target) || sameGroupName(group?.externalId, target)
        );
    }

    return false;
};

/** Live Activiti profile check: My Construction Document is allowed only for `EPC_CIVIL_CONTRACTOR`. */
export const syncConstructionDocumentsMemberFromProfile = async (
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
        return profileHasConstructionDocumentsGroup((profile as ActivitiProfile) || {});
    } catch {
        return false;
    }
};
