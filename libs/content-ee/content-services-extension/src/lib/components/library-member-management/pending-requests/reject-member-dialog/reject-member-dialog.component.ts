/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { A11yModule } from '@angular/cdk/a11y';

@Component({
    standalone: true,
    imports: [CommonModule, TranslatePipe, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, A11yModule],
    selector: 'adw-reject-member-dialog',
    templateUrl: './reject-member-dialog.component.html',
    encapsulation: ViewEncapsulation.None,
    styleUrls: ['./reject-member-dialog.component.scss']
})
export class RejectMemberDialogComponent {}
