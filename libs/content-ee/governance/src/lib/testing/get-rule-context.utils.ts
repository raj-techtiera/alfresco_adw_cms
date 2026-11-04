/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NodeEntry } from '@alfresco/js-api';

export function getContext(
    enabled: boolean,
    isAdmin?: boolean,
    nodes?: NodeEntry[],
    insideHoldFolder = false,
    insideHoldContainer = false,
    acsVersion = '0.0.0',
    userGroupId = ''
): any {
    const parts = acsVersion.split('.');
    return {
        appConfig: {
            get: () => enabled
        },
        navigation: {
            currentFolder:
                insideHoldFolder || insideHoldContainer
                    ? {
                          nodeType: insideHoldFolder ? 'rma:hold' : 'rma:holdContainer'
                      }
                    : {}
        },
        profile: {
            isAdmin: !!isAdmin,
            groups: [
                {
                    id: userGroupId
                }
            ]
        },
        repository: {
            modules: [
                {
                    id: 'alfresco-rm-enterprise-repo',
                    installState: 'INSTALLED'
                }
            ],
            version: {
                major: parts[0] || '0',
                minor: parts[1] || '0',
                patch: parts[2] || '0',
                hotfix: '0',
                schema: 1,
                label: acsVersion,
                display: acsVersion
            }
        },
        selection: {
            count: nodes?.length || 0,
            first: nodes?.[0],
            nodes: nodes || []
        },
        permissions: {
            check: () => true
        }
    };
}
