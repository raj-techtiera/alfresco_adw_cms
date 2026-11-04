/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ExtensionLoaderCallback } from '@alfresco/aca-shared';
import { tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { ProcessExtensionService } from './process-extension.service';
import { of } from 'rxjs';
import { updateProcessServiceHealth } from '../store/actions/process-services-health.actions';
import { AppConfigService } from '@alfresco/adf-core';

export function processServicePluginLoaderFactory(
    processExtensionService: ProcessExtensionService,
    store: Store<any>,
    appConfig: AppConfigService
): ExtensionLoaderCallback {
    return () => {
        const flag = appConfig.get<boolean | string>(
            'plugins.processService',
            false
        );
        if (flag === true || flag === 'true') {
            return processExtensionService.checkBackendHealth().pipe(
                tap((health) => {
                    store.dispatch(
                        updateProcessServiceHealth({
                            health,
                        })
                    );
                })
            );
        } else {
            return of(true);
        }
    };
}
