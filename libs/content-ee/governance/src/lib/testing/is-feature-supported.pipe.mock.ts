/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Provider } from '@angular/core';
import { Observable, of } from 'rxjs';
import { IsFeatureSupportedInCurrentAcsPipe } from '@alfresco/aca-content';

export const isFeatureSupportedInCurrentAcsPipeMock: Provider = {
    provide: IsFeatureSupportedInCurrentAcsPipe,
    useValue: {
        transform: (): Observable<boolean> => of(true)
    }
};
