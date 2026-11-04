/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AcaRuleContext } from '@alfresco/aca-shared/rules';
import { RuleContext } from '@alfresco/adf-extensions';

export function isWordFile(context: RuleContext): boolean {
    return context?.selection?.file?.entry?.content?.mimeTypeName === 'Microsoft Word 2007';
}

export function isPowerPointFile(context: RuleContext): boolean {
    return context?.selection?.file?.entry?.content?.mimeTypeName === 'Microsoft PowerPoint 2007';
}

export function isExcelFile(context: RuleContext): boolean {
    return context?.selection?.file?.entry?.content?.mimeTypeName === 'Microsoft Excel 2007';
}

export function isActiveMicrosoftSession(context: RuleContext): boolean {
    const entry = context?.selection?.file?.entry;

    if (entry && entry.properties) {
        const nodeId = entry['nodeId'] || entry.id;

        return (
            entry.properties['ooi:sessionNodeId'] === nodeId &&
            entry.properties['ooi:acsSessionOwner'] === entry.properties['cm:lockOwner']?.id
        );
    } else {
        return false;
    }
}

export function isMicrosoftOnlinePluginEnabled(context: AcaRuleContext): boolean {
    const flag = context.appConfig.get<boolean | string>('plugins.microsoftOnline', false);
    return flag === true || flag === 'true';
}
