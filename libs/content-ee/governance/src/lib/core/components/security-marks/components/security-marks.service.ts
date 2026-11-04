/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
    SecurityGroup,
    SecurityGroupsApi,
    SecurityMark,
    SecurityMarkPaging,
    SecurityMarksApi,
    NodeSecurityMarksApi,
    NodeSecurityMarkBody
} from '@alfresco/js-api';
import { SecurityGroupResponse } from './security-group-response.interface';
import { SecurityMarkResponse } from './security-mark-response.interface';
import { NotificationService } from '@alfresco/adf-core';
import { Injectable } from '@angular/core';
import { Subject, throwError } from 'rxjs';
import { AlfrescoApiService } from '@alfresco/adf-content-services';

@Injectable({ providedIn: 'root' })
export class SecurityMarksService {
    private securityDataMap$ = new Subject<Map<SecurityGroup, SecurityMark[]>>();
    private securityGroup: SecurityGroupsApi;
    private securityMark: SecurityMarksApi;
    private nodeSecurityMark: NodeSecurityMarksApi;
    private mapOfSecurityGroupAndMark = new Map<SecurityGroup, SecurityMark[]>();

    securityDataMapObservable = this.securityDataMap$.asObservable();

    constructor(private apiService: AlfrescoApiService, private notificationService: NotificationService) {}

    get nodeMarksApi(): NodeSecurityMarksApi {
        return this.nodeSecurityMark || (this.nodeSecurityMark = new NodeSecurityMarksApi(this.apiService.getInstance()));
    }

    get groupsApi(): SecurityGroupsApi {
        return this.securityGroup || (this.securityGroup = new SecurityGroupsApi(this.apiService.getInstance()));
    }

    getSecurityMarks(groups: SecurityGroup[]) {
        this.mapOfSecurityGroupAndMark.clear();
        const securityMarkPromises = [];

        groups.forEach((group) => {
            securityMarkPromises.push(this.getSecurityMark(group.id).then((marks) => this.mapOfSecurityGroupAndMark.set(group, marks.entries)));
        });

        Promise.all(securityMarkPromises)
            .then(() => {
                this.mapOfSecurityGroupAndMark = new Map(
                    [...this.mapOfSecurityGroupAndMark.entries()].sort((entry1, entry2) => entry1[0].groupName.localeCompare(entry2[0].groupName))
                );
                this.securityDataMap$.next(this.mapOfSecurityGroupAndMark);
            })
            .catch((error) => throwError(error));
    }

    get marksApi(): SecurityMarksApi {
        return this.securityMark || (this.securityMark = new SecurityMarksApi(this.apiService.getInstance()));
    }

    getSecurityGroup(): Promise<SecurityGroupResponse> {
        return new Promise((resolve, reject) => {
            this.groupsApi
                .getSecurityGroups({
                    include: 'inUse'
                })
                .then((response) => {
                    const securityGroupResponse = {
                        entries: response?.list?.entries?.filter((groupEntry) => !groupEntry.entry.systemGroup)?.map((group) => group.entry)
                    };
                    resolve(securityGroupResponse);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    getSecurityMark(securityGroupId: string): Promise<SecurityMarkResponse> {
        return new Promise((resolve, reject) => {
            this.marksApi
                .getSecurityMarks(securityGroupId)
                .then((response) => {
                    const securityMarkResponse = {
                        entries: response?.list?.entries?.map((mark) => mark.entry)
                    };
                    securityMarkResponse.entries.sort((mark1, mark2) => mark1.name.localeCompare(mark2.name));
                    resolve(securityMarkResponse);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    onSave(nodeId: string, array: Array<NodeSecurityMarkBody>) {
        this.nodeMarksApi.manageSecurityMarksOnNode(nodeId, array).catch(() => {
            this.notificationService.showError('GOVERNANCE.SECURITY_MARKS.EDIT_SECURITY_MARKS_ERROR');
        });
    }

    getNodeSecurityMarks(nodeId: string): Promise<SecurityMarkPaging> {
        return this.nodeMarksApi.getSecurityMarksOnNode(nodeId);
    }
}
