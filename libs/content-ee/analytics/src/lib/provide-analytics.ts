/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { EnvironmentProviders, inject, provideAppInitializer, Provider } from '@angular/core';
import { PendoService } from './pendo.service';

export function provideAnalytics(): (Provider | EnvironmentProviders)[] {
    return [
        provideAppInitializer(() => {
            const service = inject(PendoService);
            return service.init();
        })
    ];
}
