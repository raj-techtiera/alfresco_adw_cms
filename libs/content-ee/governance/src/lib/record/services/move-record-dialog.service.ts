/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { ContentNodeDialogService, ContentNodeSelectorComponent, ContentNodeSelectorComponentData, ShareDataRow, NodeAction, ContentService } from '@alfresco/adf-content-services';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ThumbnailService, TranslationService } from '@alfresco/adf-core';
import { Observable, Subject, throwError } from 'rxjs';
import { Node } from '@alfresco/js-api';

@Injectable({
    providedIn: 'root',
})
export class MoveRecordDialogService {
    constructor(public dialog: MatDialog, private contentService: ContentService, private thumbnailService: ThumbnailService, private translation: TranslationService) {}

    openMoveRecordDialog(action: NodeAction, nodeToMove: Node, permission?: string, excludeSiteContent?: string[]): Observable<Node[]> {
        if (this.contentService.hasAllowableOperations(nodeToMove, permission)) {
            const select = new Subject<Node[]>();
            select.subscribe({
                complete: this.close.bind(this),
            });

            const name = nodeToMove.name;
            const title = this.translation.instant(`GOVERNANCE.MOVE-RECORD.MOVE-ITEM`, { name });

            const data: ContentNodeSelectorComponentData = {
                selectionMode: 'single',
                title: title,
                actionName: action,
                currentFolderId: nodeToMove.properties['rma:recordOriginatingLocation'],
                imageResolver: this.imageResolver.bind(this),
                rowFilter: this.rowFilter.bind(this, nodeToMove.id),
                isSelectionValid: this.isCopyMoveSelectionValid.bind(this),
                excludeSiteContent: excludeSiteContent || ContentNodeDialogService.nonDocumentSiteContent,
                select: select,
                breadcrumbTransform: this.transformNode.bind(this),
                showSearch: false,
                showDropdownSiteList: false,
            };

            const dialogReference = this.openContentNodeDialog(data, 'adf-move-record', '630px');
            dialogReference.afterClosed().subscribe({ next: () => select.complete() });

            return select;
        } else {
            const errors = new Error(JSON.stringify({ error: { statusCode: 403 } }));
            return throwError(errors);
        }
    }

    private openContentNodeDialog(data: ContentNodeSelectorComponentData, currentPanelClass: string, chosenWidth: string): MatDialogRef<ContentNodeSelectorComponent> {
        return this.dialog.open(ContentNodeSelectorComponent, {
            data,
            panelClass: currentPanelClass,
            width: chosenWidth,
        });
    }

    private imageResolver(row: ShareDataRow): string | null {
        const entry: Node = row.node.entry;
        if (!this.contentService.hasAllowableOperations(entry, 'create')) {
            return this.thumbnailService.getMimeTypeIcon('disable/folder');
        }

        return null;
    }

    private rowFilter(currentNodeId, row: ShareDataRow): boolean {
        const node: Node = row.node.entry;
        return !node.isFile;
    }

    private isCopyMoveSelectionValid(entry: Node): boolean {
        return this.hasEntityCreatePermission(entry) && !this.isSite(entry);
    }

    private hasEntityCreatePermission(entry: Node): boolean {
        return this.contentService.hasAllowableOperations(entry, 'create');
    }

    private isSite(entry) {
        return !!entry.guid || entry.nodeType === 'st:site' || entry.nodeType === 'st:sites';
    }

    private transformNode(node: Node) {
        if (node && node.path && node.path && node.path.elements instanceof Array) {
            let {
                path: { elements: elementsPath = [] },
            } = node;
            elementsPath = elementsPath.filter((path) => path.name !== 'Company Home' && path.name !== 'Sites');
            node.path.elements = elementsPath;
        }
        return node;
    }

    close() {
        this.dialog.closeAll();
    }
}
