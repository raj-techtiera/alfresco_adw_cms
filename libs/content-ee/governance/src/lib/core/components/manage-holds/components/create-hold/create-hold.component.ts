/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, EventEmitter, inject, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { distinctUntilChanged } from 'rxjs/operators';
import { TranslatePipe } from '@ngx-translate/core';
import { ManageHoldsDialogService } from '../../services/manage-holds-dialog.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { NgIf } from '@angular/common';
import { HoldBody } from '@alfresco/js-api';
import { TranslationService } from '@alfresco/adf-core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

interface HoldForm {
    name: FormControl<string>;
    description: FormControl<string>;
    reason: FormControl<string>;
}

@Component({
    selector: 'aga-create-hold',
    templateUrl: './create-hold.component.html',
    styleUrls: ['./create-hold.component.scss'],
    host: { class: 'aga-create-hold' },
    encapsulation: ViewEncapsulation.None,
    imports: [ReactiveFormsModule, MatFormFieldModule, TranslatePipe, MatInputModule, NgIf],
    standalone: true
})
export class CreateHoldComponent implements OnInit {
    @Output() readonly valueChange = new EventEmitter<boolean>();
    @Output() readonly formValidationChange = new EventEmitter<boolean>();

    maxLengthErrorMessage: string;

    private readonly NAME_MAX_LENGTH = 255;
    readonly form = new FormGroup<HoldForm>({
        name: new FormControl('', {
            validators: [
                Validators.required,
                Validators.maxLength(this.NAME_MAX_LENGTH),
                Validators.pattern(/^(?!.*["*<>?/:|]+)(?!.*\.\.$)(?!.* $).{1,255}$/)
            ]
        }),
        description: new FormControl(''),
        reason: new FormControl('', { validators: [Validators.required] })
    });

    private readonly destroyRef = inject(DestroyRef);

    constructor(private readonly manageHoldsDialogService: ManageHoldsDialogService, private readonly translationService: TranslationService) {}

    ngOnInit() {
        const defaultForm = this.form.value;

        this.form.valueChanges.pipe(distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((currentValue) => {
            const hasValueChanged = JSON.stringify(currentValue) !== JSON.stringify(defaultForm);

            this.valueChange.emit(hasValueChanged);
            this.formValidationChange.emit(this.form.invalid);

            if (hasValueChanged && this.form.valid) {
                this.manageHoldsDialogService.dataToConfirm$.next(currentValue as HoldBody);
            }
        });

        this.maxLengthErrorMessage = this.translationService.instant('FORM.FIELD.VALIDATOR.NO_LONGER_THAN', { maxLength: this.NAME_MAX_LENGTH });
    }
}
