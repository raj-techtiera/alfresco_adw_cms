/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, take } from 'rxjs/operators';
import { isNodeHavingProp } from '../../core/rules/node.evaluator';
import { OpenRecordInfoDrawer, OPEN_RECORD_INFO_DRAWER } from '../actions/record.action';
import { InfoDrawerService } from '../services/info-drawer.service';
import { TranslationService } from '@alfresco/adf-core';

@Injectable()
export class OpenRecordInfoDrawerEffect {

    private actions$ = inject(Actions);
    private infoDrawerService = inject(InfoDrawerService);
    private translationService = inject(TranslationService);

    openRecordInfoDrawer$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType<OpenRecordInfoDrawer>(OPEN_RECORD_INFO_DRAWER),
                map((action) => {
                    const node = action.configuration;
                    if (isNodeHavingProp(node, 'aspectNames', 'rma:recordRejectionDetails', 'array')) {
                        // Rejected record properties are not translated, this is a workaround until this will be fixed
                        this.infoDrawerService
                            .openInfoDrawer('The rejection details of a record')
                            .pipe(take(1))
                            .subscribe(() => {});
                    } else {
                        this.infoDrawerService
                            .openInfoDrawer(this.translationService.instant('GOVERNANCE.RECORD-PROPERTIES.RECORD_GROUP_TITLE'))
                            .pipe(take(1))
                            .subscribe(() => {});
                    }
                })
            ),
        { dispatch: false }
    );
}
