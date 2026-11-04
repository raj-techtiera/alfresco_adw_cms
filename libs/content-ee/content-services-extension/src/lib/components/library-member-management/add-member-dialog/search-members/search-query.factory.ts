/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { QueryProvider, VersionCompatibilityService } from '@alfresco/adf-content-services';
import { ACS_VERSIONS } from '../../../../models/types';

@Injectable()
export class SearchQueryFactory implements QueryProvider {
    searchQuery = 'userName:*${searchTerm}* OR email:*${searchTerm}* OR firstName:*${searchTerm}* OR lastName:*${searchTerm}*';
    constructor(private versionCompatibilityService: VersionCompatibilityService) {}

    get query(): string {
        if (this.versionCompatibilityService.isVersionSupported(ACS_VERSIONS['7'])) {
            /* cspell: disable-next-line */
            return '(' + this.searchQuery + ' OR authorityName:*${searchTerm}* OR authorityDisplayName:*${searchTerm}*) AND PATH:"//cm:APP.DEFAULT/*"';
        }
        return this.searchQuery;
    }
}
