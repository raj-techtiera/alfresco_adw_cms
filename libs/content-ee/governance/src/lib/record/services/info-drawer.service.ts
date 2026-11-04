/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Observable, timer } from 'rxjs';
import { ActionService } from '../../core/services/action.service';
import {
    infoDrawerMetadataAspect,
    SetInfoDrawerMetadataAspectAction,
    SetInfoDrawerStateAction
} from '@alfresco/aca-shared/store';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({
    providedIn: 'root',
})
export class InfoDrawerService {
    private hasValidSelection: boolean;
    private displayAspect: string;

    constructor(private store: Store<any>, private actionService: ActionService) {
        this.actionService
            .onRecordSelection()
            .pipe(takeUntilDestroyed())
            .subscribe((isValidSelection: boolean) => {
                this.hasValidSelection = isValidSelection;
                if (isValidSelection) {
                    this.resetStoreAspect();
                } else {
                    this.setMetaDataAspect(null);
                }
            });
        this.store
            .select(infoDrawerMetadataAspect)
            .pipe(takeUntilDestroyed())
            .subscribe((aspect) => (this.displayAspect = aspect));
    }

    public openInfoDrawer(state): Observable<any> {
        return timer(300).pipe(
            tap(() => {
                this.store.dispatch(new SetInfoDrawerStateAction(this.hasValidSelection));
                this.setMetaDataAspect(state);
            })
        );
    }

    public setMetaDataAspect(state: 'Record' | 'Properties') {
        this.store.dispatch(new SetInfoDrawerMetadataAspectAction(state));
    }

    private resetStoreAspect() {
        const isValidReset = this.displayAspect !== 'Properties';
        if (isValidReset) {
            this.setMetaDataAspect('Properties');
        }
    }
}
