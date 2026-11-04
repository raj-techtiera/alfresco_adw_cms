/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, ViewEncapsulation, OnInit } from '@angular/core';
import { SecurityMarksService } from '../security-marks.service';
import { SecurityMarkPaging } from '@alfresco/js-api';
import { BehaviorSubject, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Chip, DynamicChipListComponent } from '@alfresco/adf-core';

@Component({
    selector: 'aga-security-marks-column',
    standalone: true,
    imports: [CommonModule, DynamicChipListComponent],
    templateUrl: './display-security-marks.component.html',
    styleUrls: ['./display-security-marks.component.scss'],
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'adf-datatable-content-cell'
    }
})
export class DisplaySecurityMarksComponent implements OnInit {
    context: any;

    securityMarksList: Chip[] = [];
    marksData = new BehaviorSubject(this.securityMarksList);

    constructor(private securityMarksService: SecurityMarksService) {}

    ngOnInit() {
        this.securityMarksService
            .getNodeSecurityMarks(this.context.row.node?.entry?.id)
            .then((securityMarkPaging: SecurityMarkPaging) => {
                this.securityMarksList = securityMarkPaging.list.entries?.map((securityMark) => securityMark.entry);

                this.securityMarksList.sort((mark1, mark2) => mark1.name.localeCompare(mark2.name));
                this.marksData.next(this.securityMarksList);
            })
            .catch((error) => {
                throwError(error);
            });
    }

    showAll() {
        this.marksData.next([...this.securityMarksList]);
    }
}
