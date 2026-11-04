/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { filter, tap } from 'rxjs/operators';
import { updateProcessServiceHealth } from '../actions/process-services-health.actions';
import { NotificationService } from '@alfresco/adf-core';

@Injectable()
export class ProcessHealthEffects {
    private actions$ = inject(Actions);
    private readonly notificationService = inject(NotificationService);

    updateHealth$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType(updateProcessServiceHealth),
                filter((action) => !action.health),
                tap(() => this.notificationService.showError('PROCESS-EXTENSION.SNACKBAR.BACKEND_SERVICE_ERROR'))
            ),
        { dispatch: false }
    );
}
