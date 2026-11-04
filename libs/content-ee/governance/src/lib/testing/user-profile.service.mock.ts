/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { of } from 'rxjs';
import { Provider } from '@angular/core';
import { UserProfileService } from '@alfresco/aca-shared';
import { ProfileState } from '@alfresco/adf-extensions';

export const userProfileServiceMock: Provider = {
    provide: UserProfileService,
    useValue: {
        loadUserProfile: () => of({} as ProfileState),
        userProfile$: of({} as ProfileState),
    }
};
