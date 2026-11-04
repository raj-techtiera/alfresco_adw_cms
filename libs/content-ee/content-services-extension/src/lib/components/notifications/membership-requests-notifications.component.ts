/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, DestroyRef, inject, NgZone, OnInit, ViewEncapsulation } from '@angular/core';
import { merge, Observable, Subject, timer } from 'rxjs';
import {
    SiteEntry,
    SiteMembershipRequestWithPersonEntry,
    SiteMembershipRequestWithPersonPaging
} from '@alfresco/js-api';
import { map, mergeMap, switchMap } from 'rxjs/operators';
import { AppStore, getUserProfile } from '@alfresco/aca-shared/store';
import { Store } from '@ngrx/store';
import { ProfileState } from '@alfresco/adf-extensions';
import { SiteMembershipRequestGroup } from '../../models/types';
import { AppConfigService } from '@alfresco/adf-core';
import { SitesService } from '@alfresco/adf-content-services';
import { ContentExtensionNotificationService } from './content-extension-notification.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    standalone: true,
    imports: [MatSnackBarModule],
    selector: 'acs-membership-requests-notifications',
    template: '<ng-content />',
    encapsulation: ViewEncapsulation.None
})
export class MembershipRequestsNotificationsComponent implements OnInit {
    private restartPooling$ = new Subject<boolean>();
    list: SiteMembershipRequestGroup[] = [];

    private readonly destroyRef = inject(DestroyRef);

    constructor(
        private readonly sitesService: SitesService,
        private readonly appConfig: AppConfigService,
        private readonly store: Store<AppStore>,
        private readonly contentExtensionNotificationService: ContentExtensionNotificationService,
        private readonly ngZone: NgZone
    ) {}

    ngOnInit() {
        this.ngZone.runOutsideAngular(() => {
            this.pooling().subscribe((data: SiteMembershipRequestWithPersonPaging) => {
                this.updateNotificationsList(data);
            });
            this.restartPooling$.next(false);
        });
    }

    private pooling(): Observable<SiteMembershipRequestWithPersonPaging> {
        return merge(this.restartPooling$).pipe(
            switchMap((restart) => timer(restart ? this.refreshTimeout : 0, this.refreshTimeout)),
            mergeMap(() => this.getRequests())
        );
    }

    private updateNotificationsList(data: SiteMembershipRequestWithPersonPaging) {
        const pendingRequests = this.processRawRequests(data);
        const newRequests = this.filterNewRequests(pendingRequests);
        this.notifyNewRequests(newRequests);
        this.list = pendingRequests;
    }

    private notifyNewRequests(newRequests: SiteMembershipRequestGroup[]) {
        newRequests.forEach((request) => {
            const notification = this.contentExtensionNotificationService.createRequestNotification(request);
            this.contentExtensionNotificationService.notify(notification);
        });
    }

    private filterNewRequests(pendingRequests: SiteMembershipRequestGroup[]) {
        return pendingRequests.filter((request) => this.isRequestNew(request));
    }

    private isRequestNew(pendingRequest: SiteMembershipRequestGroup): boolean {
        const request = this.list.find((previousRequest) =>
            pendingRequest.site.entry.guid === previousRequest.site.entry.guid && JSON.stringify(pendingRequest, null, 0) === JSON.stringify(previousRequest, null, 0)
        );

        return request === undefined;
    }

    private groupRequests(list: SiteMembershipRequestWithPersonEntry[]): SiteMembershipRequestGroup[] {
        return list.reduce((accumulator, element) => {
            const key = element.entry.id;
            const found = accumulator.find((group: SiteMembershipRequestGroup) => group.id === element.entry.id);

            if (!found) {
                accumulator.push({
                    id: key,
                    createdAt: element.entry.createdAt,
                    site: new SiteEntry({ entry: element.entry.site }),
                    requests: [element.entry.person],
                });
            } else {
                found.requests.push(element.entry.person);
                found.createdAt = element.entry.createdAt;
            }

            return accumulator;
        }, []);
    }

    private processRawRequests(data: SiteMembershipRequestWithPersonPaging): SiteMembershipRequestGroup[] {
        return Object.values(
            this.groupRequests(data.list.entries).reduce((accumulator, entry) => {
                accumulator[entry.id] = entry;
                return accumulator;
            }, [])
        ).sort((first, second) => second.createdAt.valueOf() - first.createdAt.valueOf());
    }

    private filterCurrentUser(data: SiteMembershipRequestWithPersonPaging): Observable<SiteMembershipRequestWithPersonPaging> {
        return this.store.select(getUserProfile).pipe(
            map((user: ProfileState) => ({
                list: {
                    entries: data.list.entries.filter((element: SiteMembershipRequestWithPersonEntry) => element.entry.person.id !== user.id),
                    pagination: data.list.pagination,
                },
            })),
            takeUntilDestroyed(this.destroyRef)
        );
    }

    private get refreshTimeout(): number {
        return this.appConfig.get<number>('notificationsPooling') || 30000;
    }

    private getRequests(): Observable<SiteMembershipRequestWithPersonPaging> {
        return this.sitesService.getSiteMembershipRequests().pipe(mergeMap((data: SiteMembershipRequestWithPersonPaging) => this.filterCurrentUser(data)));
    }
}
