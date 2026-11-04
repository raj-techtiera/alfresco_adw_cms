/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { ADD_MEMBER, AddMemberAction, MANAGE_MEMBERS, ManageMembersAction } from '../extension.actions';
import { mergeMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { LibraryDialogService } from '../../components/library-member-management/services/library-dialog.service';

@Injectable()
export class ExtensionEffects {

    private actions$ = inject(Actions);
    private router = inject(Router);
    private libraryDialogService = inject(LibraryDialogService);

    addMember$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType<AddMemberAction>(ADD_MEMBER),
                mergeMap((action: any) =>
                    this.libraryDialogService.openAddLibraryMemberDialog(
                        action.payload,
                        action.members,
                        action.configuration?.focusedElementOnCloseSelector
                    )
                )
            ),
        { dispatch: false }
    );

    manageMembers$ = createEffect(
        () =>
            this.actions$.pipe(
                ofType<ManageMembersAction>(MANAGE_MEMBERS),
                tap((action: any) => this.router.navigateByUrl(`/${action.payload.entry.id}/members/libraries`))
            ),
        { dispatch: false }
    );
}
