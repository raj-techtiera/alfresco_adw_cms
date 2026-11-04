/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { AppStore } from '@alfresco/aca-shared/store';
import {
    CreateOfficeDocumentAndOpenViewerAction,
    CreateOfficeDocumentAndStartSessionAction,
    EXCEL,
    POWERPOINT,
    WORD
} from '../../store/extension.actions';
import { AppConfigService } from '@alfresco/adf-core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AutoFocusDirective } from '@alfresco/adf-content-services';
import { MatButtonModule } from '@angular/material/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'ooi-create-document-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        TranslatePipe,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        AutoFocusDirective,
        MatButtonModule
    ],
    templateUrl: './create-document-dialog.component.html',
    styleUrls: ['./create-document-dialog.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class CreateDocumentDialogComponent implements OnInit {
    private blankDocPath = 'assets/blank-documents';

    private fileTypesOptions = [
        {
            value: WORD,
            extension: '.docx',
            header: 'MICROSOFT-ONLINE.CREATE_DOCUMENT_DIALOG.WORD.HEADER',
            filePath: `${this.blankDocPath}/blank-doc.docx`
        },
        {
            value: EXCEL,
            extension: '.xlsx',
            header: 'MICROSOFT-ONLINE.CREATE_DOCUMENT_DIALOG.EXCEL.HEADER',
            filePath: `${this.blankDocPath}/blank-xls.xlsx`
        },
        {
            value: POWERPOINT,
            extension: '.pptx',
            header: 'MICROSOFT-ONLINE.CREATE_DOCUMENT_DIALOG.POWERPOINT.HEADER',
            filePath: `${this.blankDocPath}/blank-ppt.pptx`
        }
    ];

    fileType: string;
    form: UntypedFormGroup;
    ooiEnabled: boolean;

    constructor(
        @Inject(MAT_DIALOG_DATA) data: any,
        appConfigService: AppConfigService,
        private dialogRef: MatDialogRef<CreateDocumentDialogComponent>,
        private store: Store<AppStore>,
        private formBuilder: UntypedFormBuilder
    ) {
        appConfigService.onLoad.pipe(takeUntilDestroyed()).subscribe(() => {
            const pluginFlag = appConfigService.get<boolean | string>('plugins.microsoftOnline', false);
            this.ooiEnabled = pluginFlag === true || pluginFlag === 'true';
        });
        this.fileType = data.fileType;
    }

    ngOnInit() {
        this.form = this.formBuilder.group({
            name: ['', [Validators.required, this.forbidEndingDot, this.forbidOnlySpaces, this.forbidSpecialCharacters]],
            description: ['', Validators.maxLength(512)]
        });
    }

    get description(): string {
        return this.form.value.description;
    }

    get header(): string {
        return this.fileTypesOptions.find((option) => option.value === this.fileType).header;
    }

    get extension(): string {
        return this.fileTypesOptions.find((option) => option.value === this.fileType).extension;
    }

    get filePath(): string {
        return this.fileTypesOptions.find((option) => option.value === this.fileType).filePath;
    }

    get properties(): any {
        return this.description ? { 'cm:description': this.description } : {};
    }

    get fileName(): string {
        return this.form.value.name.trim() + this.extension;
    }

    public onSubmitCreate() {
        if (this.form.valid) {
            this.store.dispatch(new CreateOfficeDocumentAndOpenViewerAction(this.filePath, this.fileName, this.properties));
        }
        this.dialogRef.close();
    }

    public onSubmitCreateAndOpen() {
        if (this.form.valid) {
            this.store.dispatch(new CreateOfficeDocumentAndStartSessionAction(this.filePath, this.fileName, this.properties));
        }
        this.dialogRef.close();
    }

    private forbidSpecialCharacters({ value }: UntypedFormControl): ValidationErrors | null {
        // eslint-disable-next-line no-useless-escape
        const specialCharacters = /([\*\"\<\>\\\/\?\:\|])/;
        const isValid = !specialCharacters.test(value);

        return isValid ? null : { message: `NODE_FROM_TEMPLATE.FORM.ERRORS.SPECIAL_CHARACTERS` };
    }

    private forbidEndingDot({ value }: UntypedFormControl): ValidationErrors | null {
        const isValid: boolean = (value || '').trim().split('').pop() !== '.';

        return isValid ? null : { message: `NODE_FROM_TEMPLATE.FORM.ERRORS.ENDING_DOT` };
    }

    private forbidOnlySpaces({ value }: UntypedFormControl): ValidationErrors | null {
        if (value.length) {
            const isValid = !!(value || '').trim();
            return isValid ? null : { message: `NODE_FROM_TEMPLATE.FORM.ERRORS.ONLY_SPACES` };
        } else {
            return { message: `NODE_FROM_TEMPLATE.FORM.ERRORS.REQUIRED` };
        }
    }
}
