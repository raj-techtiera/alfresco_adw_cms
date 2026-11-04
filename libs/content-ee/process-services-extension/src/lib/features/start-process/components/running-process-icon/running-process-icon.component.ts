/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ChangeDetectorRef, Component, DestroyRef, inject, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { NodeEntry } from '@alfresco/js-api';
import { MatIconModule } from '@angular/material/icon';
import { ProcessInstanceService } from '../../../../services/process-instance.service';
import { isInfoDrawerOpened, SetInfoDrawerMetadataAspectAction, SetInfoDrawerStateAction } from '@alfresco/aca-shared/store';
import { Store } from '@ngrx/store';
import { IconComponent } from '@alfresco/adf-core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    standalone: true,
    imports: [CommonModule, TranslatePipe, MatIconModule, IconComponent],
    selector: 'aps-running-process-icon',
    template: `
        <adf-icon
            *ngIf="isPartOfRunningProcess"
            class="adf-datatable-cell-badge"
            [title]="'RUNNING_PROCESS.BADGE_TOOLTIP' | translate"
            [value]="'account_tree'"
            (click)="openProcessDetailsInfoDrawer()"
        />
    `,
    host: { class: 'aps-running-process-icon' },
    encapsulation: ViewEncapsulation.None
})
export class RunningProcessIconComponent implements OnInit {
    private infoDrawerOpened = false;
    isPartOfRunningProcess = false;

    @Input()
    data: { node: NodeEntry };

    private readonly destroyRef = inject(DestroyRef);

    constructor(private processInstanceService: ProcessInstanceService, private store: Store<any>, private cd: ChangeDetectorRef) {}

    ngOnInit() {
        this.processInstanceService
            .getRunningProcessesDetails(this.data.node.entry)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((processInstanceRepresentations) => {
                this.isPartOfRunningProcess = processInstanceRepresentations.data?.length > 0;
                this.cd.detectChanges();
            });
        this.store
            .select(isInfoDrawerOpened)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((isOpened) => (this.infoDrawerOpened = isOpened));
    }

    openProcessDetailsInfoDrawer() {
        this.store.dispatch(new SetInfoDrawerStateAction(!this.infoDrawerOpened));
        setTimeout(() => {
            this.store.dispatch(new SetInfoDrawerMetadataAspectAction('RUNNING_PROCESS.LINKED_PROCESS_PANEL.TITLE'));
        }, 300);
    }
}
