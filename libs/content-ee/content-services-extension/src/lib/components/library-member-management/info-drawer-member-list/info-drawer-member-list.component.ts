/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { getAppSelection } from '@alfresco/aca-shared/store';
import { Store } from '@ngrx/store';
import { filter, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { SiteEntry, SiteMemberPaging } from '@alfresco/js-api';
import { LibraryMemberService } from '../services/library-member.service';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MemberListComponent } from '../member-list/member-list.component';
import { InfinitePaginationComponent } from '@alfresco/adf-core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    standalone: true,
    imports: [CommonModule, TranslatePipe, MemberListComponent, InfinitePaginationComponent],
    selector: 'adw-info-drawer-member-list',
    templateUrl: './info-drawer-member-list.component.html',
    encapsulation: ViewEncapsulation.None
})
export class InfoDrawerMemberListComponent implements OnInit {
    site: SiteEntry;
    loading: Observable<boolean>;
    members: Observable<SiteMemberPaging>;

    private readonly destroyRef = inject(DestroyRef);

    constructor(private store: Store<any>, private libraryMemberService: LibraryMemberService) {
        this.members = this.libraryMemberService.members.asObservable();
        this.loading = this.libraryMemberService.loading.asObservable();
    }

    ngOnInit(): void {
        this.store
            .select(getAppSelection)
            .pipe(
                filter((selection) => !!selection.library),
                map((selection) => selection.library),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((site) => {
                this.site = site;
                this.libraryMemberService.loadMembers(this.site.entry.id);
            });
    }
}
