/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { ContentApiService } from '@alfresco/aca-shared';
import { AppConfigService } from '@alfresco/adf-core';
import { TagService } from '@alfresco/adf-content-services';
import { NodeEntry, ResultNode, SearchRequest, Tag } from '@alfresco/js-api';
import { map, Observable, of } from 'rxjs';

export interface TagSummary {
    id: string;
    name: string;
    count: number;
}

export interface TaggedDocument {
    id: string;
    name: string;
    title: string;
    nodeType: string;
    isFile: boolean;
    modifiedAt: Date | null;
    modifiedBy: string;
    size: number | null;
    path: string;
    securityMarks: string[];
    tags: string[];
    node: NodeEntry;
}

@Injectable({ providedIn: 'root' })
export class TagsWorkspaceService {
    constructor(
        private readonly tagService: TagService,
        private readonly contentApi: ContentApiService,
        private readonly appConfig: AppConfigService
    ) {}

    areTagsEnabled(): boolean {
        const configFlag = this.appConfig.get<boolean | string>('plugins.tagsEnabled', true);
        return (configFlag === true || configFlag === 'true') && this.tagService.areTagsEnabled();
    }

    getTags(): Observable<TagSummary[]> {
        if (!this.areTagsEnabled()) {
            return of([]);
        }

        return this.tagService.getAllTheTags({ maxItems: 1000, skipCount: 0 }, true).pipe(
            map((response) =>
                (response.list?.entries ?? [])
                    .map((entry) => this.toTagSummary(entry.entry))
                    .filter((tag) => !!tag.name)
                    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
            )
        );
    }

    getDocumentsByTag(tagName: string): Observable<TaggedDocument[]> {
        const request: SearchRequest = {
            query: {
                query: `TAG:'${this.escapeAftsValue(tagName)}' AND TYPE:'cm:content'`,
                language: 'afts'
            },
            include: ['allowableOperations', 'association', 'isFavorite', 'isLink', 'isLocked', 'path', 'permissions', 'properties'],
            paging: {
                maxItems: 100,
                skipCount: 0
            }
        };

        return this.contentApi.search(request).pipe(
            map((result) =>
                (result.list?.entries ?? [])
                    .map((entry) => this.toTaggedDocument(entry.entry))
                    .sort((a, b) => a.title.localeCompare(b.title))
            )
        );
    }

    private toTagSummary(tag: Tag): TagSummary {
        return {
            id: tag.id || tag.tag,
            name: tag.tag || '',
            count: tag.count ?? 0
        };
    }

    private escapeAftsValue(value: string): string {
        return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    private toTaggedDocument(node: ResultNode): TaggedDocument {
        const properties = node.properties ?? {};

        return {
            id: node.id,
            name: node.name,
            title: this.getStringValue(properties['cm:title']) || node.name,
            nodeType: node.nodeType,
            isFile: node.isFile,
            modifiedAt: node.modifiedAt ? new Date(node.modifiedAt) : null,
            modifiedBy: node.modifiedByUser?.displayName || node.modifiedByUser?.id || '',
            size: node.content?.sizeInBytes ?? null,
            path: node.path?.name || '',
            securityMarks: this.getSecurityMarks(properties),
            tags: this.getStringListValue(properties['cm:taggable']),
            node: { entry: node } as NodeEntry
        };
    }

    private getStringValue(value: unknown): string {
        return value === null || value === undefined ? '' : String(value).trim();
    }

    private getStringListValue(value: unknown): string[] {
        if (Array.isArray(value)) {
            return value.map((item) => this.getStringValue(item)).filter(Boolean);
        }

        const stringValue = this.getStringValue(value);
        return stringValue ? [stringValue] : [];
    }

    private getSecurityMarks(properties: Record<string, unknown>): string[] {
        const propertyNames = ['sm:securityMarks', 'security:marks', 'sec:securityMarks', 'cm:securityMarks'];
        const marks = propertyNames.flatMap((propertyName) => this.getStringListValue(properties[propertyName]));
        return Array.from(new Set(marks));
    }
}
