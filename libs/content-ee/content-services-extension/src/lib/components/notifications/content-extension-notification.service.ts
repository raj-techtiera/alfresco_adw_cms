/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AppStore } from '@alfresco/aca-shared/store';
import { NotificationInitiator, NotificationModel, NotificationService, NOTIFICATION_TYPE } from '@alfresco/adf-core';
import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { SiteMembershipRequestGroup } from '../../models/types';
import { AddMemberAction } from '../../store/extension.actions';

@Injectable({
    providedIn: 'root',
})
export class ContentExtensionNotificationService {
    constructor(private translateService: TranslateService, private notificationService: NotificationService, private store: Store<AppStore>) {}

    createRequestNotification(item: SiteMembershipRequestGroup): NotificationModel {
        return {
            type: NOTIFICATION_TYPE.RECURSIVE,
            messages: [this.getMessage(item)],
            icon: 'info',
            datetime: item.createdAt,
            initiator: this.getInitiator(item),
            clickCallBack: (data) => this.onRequestClick(data),
            args: item,
        } as NotificationModel;
    }

    getMessage(item: SiteMembershipRequestGroup): string {
        if (item.requests.length === 1) {
            return this.translateService.instant('LIBRARY_NOTIFICATIONS.REQUEST_SINGULAR', {
                user: item.requests[0].displayName,
                library: item.site.entry.title,
            });
        } else {
            return this.translateService.instant('LIBRARY_NOTIFICATIONS.REQUEST_PLURAL', {
                number: item.requests.length,
                library: item.site.entry.title,
            });
        }
    }

    getInitiator(item: SiteMembershipRequestGroup): NotificationInitiator {
        if (item.requests.length === 1) {
            return {
                displayName: item.requests[0].displayName,
                firstName: item.requests[0].firstName,
                lastName: item.requests[0].lastName,
            } as NotificationInitiator;
        } else {
            return { displayName: item.requests.length.toString() } as NotificationInitiator;
        }
    }

    notify(notification: NotificationModel) {
        this.notificationService.pushToNotificationHistory(notification);
    }

    onRequestClick(data: SiteMembershipRequestGroup) {
        this.store.dispatch(new AddMemberAction(data.site, data.requests));
    }
}
