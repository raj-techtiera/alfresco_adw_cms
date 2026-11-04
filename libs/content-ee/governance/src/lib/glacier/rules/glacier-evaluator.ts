/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NodeEntry } from '@alfresco/js-api';
import { hasProperty, isFile, isLocked, isNodeHavingProp } from '../../core/rules/node.evaluator';
import { isLibraryAction } from '../../core/rules/site.evaluator';
import { RuleContext } from '@alfresco/adf-extensions';

export function canStoreNode(context: RuleContext): boolean {
    const selectedNode = context.selection.first;
    if (context.selection.nodes.length && hasEnabledGlacierPlugin(context) && hasAdminCapability(context) && isLibraryAction(context)) {
        if (context.selection.nodes.length === 1) {
            return (
                context.permissions.check(selectedNode, ['update']) &&
                !isStoredInGlacier(selectedNode) &&
                !isPendingRestore(selectedNode) &&
                !isRestored(selectedNode) &&
                !isLocked(selectedNode) &&
                isFile(selectedNode)
            );
        }

        return context.selection.nodes.every((node) => context.permissions.check(node, ['update']));
    }
    return false;
}

export function canRestoreNode(context: RuleContext): boolean {
    const selectedNode = context.selection.first;
    if (context.selection.nodes.length && hasAdminCapability(context) && hasEnabledGlacierPlugin(context) && isLibraryAction(context)) {
        if (context.selection.nodes.length === 1) {
            return isStoredInGlacier(selectedNode);
        }

        return context.selection.nodes.every((node) => context.permissions.check(node, ['update']));
    }
    return false;
}

export function canExtendRestoreNode(context: RuleContext): boolean {
    const selectedNode = context.selection.first;
    return isRestored(selectedNode) && hasAdminCapability(context) && isLibraryAction(context);
}

export function hasAdminCapability(context: RuleContext): boolean {
    const path = context.navigation.currentFolder?.path?.name?.split('/');
    if (path) {
        const index = path.indexOf('Sites');
        if (index !== -1) {
            const site = path[index + 1];
            const { groups } = context.profile;
            const isManager = groups.find(({ id }) => id === `GROUP_site_${site}_SiteManager`);
            const isCollaborator = groups.find(({ id }) => id === `GROUP_site_${site}_SiteCollaborator`);
            const isContributor = groups.find(({ id }) => id === `GROUP_site_${site}_SiteContributor`);
            const isConsumer = groups.find(({ id }) => id === `GROUP_site_${site}_SiteConsumer`);
            return !isManager && !isCollaborator && !isContributor && !isConsumer ? context.profile.isAdmin : !!isManager;
        }
    }
    return false;
}

export function hasEnabledGlacierPlugin(context: RuleContext): boolean {
    return (
        context.repository && context.repository.modules && !!context.repository.modules.find((repo) => repo.id === 'alfresco-glacier-connector-repo')
    );
}

export function hasStored(context: RuleContext, node?: NodeEntry): boolean {
    return isStoredInGlacier(node ?? context.selection.first);
}

export function hasPendingRestore(context: RuleContext, node?: NodeEntry): boolean {
    return isPendingRestore(node ?? context.selection.first);
}

export function hasRestored(context: RuleContext, node?: NodeEntry): boolean {
    return isRestored(node ?? context.selection.first);
}

export function isStoredInGlacier(node: NodeEntry): boolean {
    return isNodeHavingProp(node, 'aspectNames', 'gl:archived', 'array') && hasProperty(node, 'gl:contentState', 'ARCHIVED');
}

export function isPendingRestore(node: NodeEntry): boolean {
    return hasProperty(node, 'gl:contentState', 'PENDING_RESTORE');
}

export function isRestored(node: NodeEntry): boolean {
    return hasProperty(node, 'gl:contentState', 'RESTORED');
}

export function canShowViewer(context: RuleContext, node: NodeEntry): boolean {
    return !isStoredInGlacier(node);
}
