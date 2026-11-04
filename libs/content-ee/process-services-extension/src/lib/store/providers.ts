/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { provideEffects } from '@ngrx/effects';
import { ProcessHealthEffects } from './effects/process-health.effects';
import { FiltersEffects } from './effects/filters.effects';
import { provideState } from '@ngrx/store';
import * as fromProcessServices from './reducers/process-services.reducer';

export function provideProcessServicesExtensionStore() {
    return [provideEffects([ProcessHealthEffects, FiltersEffects]), provideState(fromProcessServices.featureKey, fromProcessServices.reducer)];
}
