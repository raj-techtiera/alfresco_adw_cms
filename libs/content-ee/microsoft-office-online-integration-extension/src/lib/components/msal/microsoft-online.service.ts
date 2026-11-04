/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { AppConfigService } from '@alfresco/adf-core';
import { from, Observable } from 'rxjs';
import { MicrosoftSessionDetails } from '../../store/effects/microsoft-online.effects';
import { AdfHttpClient } from '@alfresco/adf-core/api';

@Injectable({ providedIn: 'root' })
export class MicrosoftOnlineService {
    private ooiHost = '';

    constructor(private adfHttpClient: AdfHttpClient, appConfigService: AppConfigService) {
        appConfigService.onLoad.subscribe(() => {
            const pluginFlag = appConfigService.get<boolean | string>('plugins.microsoftOnline', false);
            const isPluginActive = pluginFlag === true || pluginFlag === 'true';
            this.ooiHost = isPluginActive ? appConfigService.get('msOnline.msHost', '') : '';
        });
    }

    startSession(microsoftTicket: string, nodeId: string): Observable<MicrosoftSessionDetails> {
        const uri = this.ooiHost + nodeId,
            contentTypes = ['application/json'],
            accepts = ['application/json'],
            headerParams = {
                'X-Authorization-MS-OOI': 'Bearer ' + microsoftTicket
            };
        return from(
            this.adfHttpClient.request(uri, {
                httpMethod: 'POST',
                headerParams,
                accepts,
                contentTypes
            })
        );
    }

    cancelSession(microsoftTicket: string, nodeId: string): Observable<MicrosoftSessionDetails> {
        const uri = this.ooiHost + nodeId + '/cancel',
            queryParams = {
                ignoreOpenEditors: 'true'
            },
            contentTypes = ['application/json'],
            accepts = ['application/json'],
            headerParams = {
                'X-Authorization-MS-OOI': 'Bearer ' + microsoftTicket
            };
        return from(
            this.adfHttpClient.request(uri, {
                httpMethod: 'POST',
                queryParams,
                headerParams,
                accepts,
                contentTypes
            })
        );
    }

    endSession(microsoftTicket: string, nodeId: string, isMajor: boolean, comment?: string): Observable<MicrosoftSessionDetails> {
        const uri = this.ooiHost + nodeId + '/end',
            queryParams = { isMajor, comment, ignoreOpenEditors: 'true' },
            contentTypes = ['application/json'],
            accepts = ['application/json'],
            headerParams = {
                'X-Authorization-MS-OOI': 'Bearer ' + microsoftTicket
            };
        return from(
            this.adfHttpClient.request(uri, {
                httpMethod: 'POST',
                queryParams,
                headerParams,
                accepts,
                contentTypes
            })
        );
    }
}
