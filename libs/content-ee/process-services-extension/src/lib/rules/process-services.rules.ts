/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NodeEntry, ProcessInstanceRepresentation } from '@alfresco/js-api';
import { AcaRuleContext, isTrashcan, isSharedFiles, hasSelection } from '@alfresco/aca-shared/rules';
import { ProfileState, RuleContext } from '@alfresco/adf-extensions';

export function canShowStartProcessFromContent(context: AcaRuleContext): boolean {
    return (
        isProcessServicePluginEnabled(context) &&
        !isTrashcan(context) &&
        !hasSelectedFolder(context.selection.nodes) &&
        (hasSelectedFile(context.selection.nodes) || isSharedFiles(context) && hasSelection(context)) &&
        !hasSelectedLink(context.selection.nodes)
    );
}

export function hasSelectedLink(nodes: NodeEntry[]): boolean {
    return nodes.some((node) => node.entry.nodeType === 'app:filelink');
}

export function hasSelectedFolder(nodes: NodeEntry[]): boolean {
    return nodes.some((node) => node.entry.isFolder);
}

export function hasSelectedFile(nodes: NodeEntry[]): boolean {
    return nodes.some((node) => node.entry.isFile);
}

export function isProcessServicePluginEnabled(context: AcaRuleContext): boolean {
    const flag = context.appConfig.get<boolean | string>('plugins.processService', false);
    return flag === true || flag === 'true';
}

export function isFile(node: NodeEntry): boolean {
    return !!node?.entry?.isFile;
}

export function canDisplayBadgeAndPanel(context: AcaRuleContext, node: NodeEntry): boolean {
    return isProcessServicePluginEnabled(context) && (isFile(node) || isSharedFiles(context));
}

export function canCancelProcess(context: RuleContext): boolean {
    return !(context.selection as any).process.ended && isProcessOwner((context.selection as any).process, context.profile);
}

export function isProcessOwner(process: ProcessInstanceRepresentation, profile: ProfileState): boolean {
    return process.startedBy.email === profile['email'];
}

export function canShowProcessToolbarItems(context: RuleContext): boolean {
    return (isTaskSelected(context) && isTaskListRoute(context)) || (isProcessSelected(context) && isProcessListRoute(context));
}

function isTaskListRoute(context: RuleContext): boolean {
    return context.navigation.url.includes('tasks') || context.navigation.url.includes('process-details');
}

function isProcessListRoute(context: RuleContext): boolean {
    return context.navigation.url.includes('processes');
}

function isProcessSelected(context: RuleContext): boolean {
    return !!(context.selection as any).process;
}

function isTaskSelected(context: RuleContext): boolean {
    return !!(context.selection as any).task;
}
