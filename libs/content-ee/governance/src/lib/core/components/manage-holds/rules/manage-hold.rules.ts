/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { AcaRuleContext, isFavorites, createVersionRule } from '@alfresco/aca-shared/rules';
import { FilePlanRolePaging, NodeEntry, PermissionsInfo } from '@alfresco/js-api';
import { isAGSInstalled } from '../../../rules/site.evaluator';
import { LegalHoldCapability } from '../model/legal-hold-capability';
import { RecordCapability } from '../../../../record/models/record-capability';
import { LegalHoldPermission } from '../model/legal-hold-permission';
import { RECORDS_MANAGER_GROUP_ID } from '../model/records-manager-group-id';

export const CAPABILITIES_FOR_REMOVE_FROM_HOLD = [LegalHoldCapability.RemoveFromHold];
export const CAPABILITIES_RELATED_WITH_HOLD_CREATION = [LegalHoldCapability.CreateHold];
export const CAPABILITIES_RELATED_WITH_ASSIGNING_HOLDS =
    [LegalHoldCapability.AddToHold, ...CAPABILITIES_FOR_REMOVE_FROM_HOLD];
export const CAPABILITIES_FOR_DELETE_HOLD = [LegalHoldCapability.DeleteHold];
export const CAPABILITIES_FOR_EDIT_HOLD = [LegalHoldCapability.EditHold];
export const RECORD_CAPABILITY = RecordCapability.ViewRecords;

export function canManageHolds(
    context: AcaRuleContext,
    filePlanRoles: FilePlanRolePaging,
    holdsPermissions: PermissionsInfo,
    userId: string,
    shouldUseLegacyEvaluator?: boolean
): boolean {
    const isRecordsManagerLegacyFlag = shouldUseLegacyEvaluator ? isRecordsManagerLegacy(context) : false;
    return (
        isLegalHoldPluginEnabled(context) &&
        (context.profile.isAdmin || hasRequiredPermissions(filePlanRoles, holdsPermissions, userId) || isRecordsManagerLegacyFlag)
    );
}

export function isRecordsManagerLegacy(context: AcaRuleContext): boolean {
    return context.profile.groups?.some((group) => {
        return group.id.includes(RECORDS_MANAGER_GROUP_ID);
    });
}

export function isNodeOnHold(context: AcaRuleContext, node: NodeEntry): boolean {
    if (!node) {
        node = context.selection.first;
    }
    return isLegalHoldPluginEnabled(context) && !!node?.entry?.properties?.['rma:frozenAt'];
}

export function canDeleteHoldFolder(context: AcaRuleContext, filePlanRoles: FilePlanRolePaging): boolean {
    const containsHoldFolder = context.selection.nodes.some(node => node.entry.nodeType === 'rma:hold');
    const hasHoldAspect = context.selection.nodes.every((node) => node.entry.aspectNames?.includes('rma:recordComponentIdentifier'));
    return !!(isLegalHoldPluginEnabled(context) && (containsHoldFolder || (isFavorites(context) && hasHoldAspect))
        && (context.profile.isAdmin || hasRequiredCapability(filePlanRoles, CAPABILITIES_FOR_DELETE_HOLD)));
}

export function isLegalHoldPluginEnabled(context: AcaRuleContext): boolean {
    const flag = context.appConfig.get<boolean | string>('plugins.legalHoldEnabled', false);
    return isAGSInstalled(context) && (flag === true || flag === 'true');
}

export function canRemoveFromHold(context: AcaRuleContext, filePlanRoles: FilePlanRolePaging): boolean {
    return isLegalHoldPluginEnabled(context) && context.navigation.currentFolder?.nodeType === 'rma:hold' && !context.selection.isEmpty
        && context.selection.nodes.every((node) => isNodeOnHold(context, node))
        && (context.profile.isAdmin || hasRequiredCapability(filePlanRoles, CAPABILITIES_FOR_REMOVE_FROM_HOLD));
}

export function canEditHold(context: AcaRuleContext, filePlanRoles: FilePlanRolePaging): boolean {
    return context.navigation.currentFolder?.nodeType !== 'rma:holdContainer' || !isLegalHoldPluginEnabled(context)
        || context.profile.isAdmin || hasRequiredCapability(filePlanRoles, CAPABILITIES_FOR_EDIT_HOLD);
}

export function isNotInsideHoldsFolder(context: AcaRuleContext): boolean {
    return context.navigation.currentFolder?.nodeType !== 'rma:holdContainer' && context.navigation.currentFolder?.nodeType !== 'rma:hold';
}

export function isNotHoldFolder(context: AcaRuleContext): boolean {
    return !context.selection.nodes.some((node) => node.entry.aspectNames?.includes('rma:recordComponentIdentifier'));
}

export const isManageHoldsAvailable = createVersionRule('23.3');

function hasRequiredCapability(filePlanRoles: FilePlanRolePaging, legalHoldCapabilities: string[]): boolean {
    return filePlanRoles?.list.entries.some((role) => {
        return role.entry.capabilities?.some((capability) => capability.name === RECORD_CAPABILITY)
            && role.entry.capabilities?.some((capability) => legalHoldCapabilities.includes(capability.name));
    });
}

function hasRequiredPermissions(filePlanRoles: FilePlanRolePaging, holdsPermissions: PermissionsInfo, userId: string): boolean {
    return hasRequiredCapability(filePlanRoles, CAPABILITIES_RELATED_WITH_HOLD_CREATION) &&
        holdsPermissions.locallySet.some((permission) =>
            permission.authorityId === userId && permission.name === LegalHoldPermission.Filing) ||
        hasRequiredCapability(filePlanRoles, CAPABILITIES_RELATED_WITH_ASSIGNING_HOLDS);
}
