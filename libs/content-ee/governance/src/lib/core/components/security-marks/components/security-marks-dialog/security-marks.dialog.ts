/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { NodeSecurityMarkBody, SecurityGroup, SecurityMark } from '@alfresco/js-api';
import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { throwError } from 'rxjs';
import { AppStore, ReloadDocumentListAction } from '@alfresco/aca-shared/store';
import { Store } from '@ngrx/store';
import { SecurityMarkResponse } from '../security-mark-response.interface';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { SecurityMarksHelpComponent } from '../security-marks-help/security-marks-help.component';
import { SecurityMarksService } from '../security-marks.service';

export interface SecurityMarksDialogData {
    title: string;
    nodeId: string;
    isMarksDialogEnabled: boolean;
    isHelpDialogEnabled: boolean;
}

@Component({
    selector: 'aga-security-mark-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        TranslatePipe,
        MatProgressSpinnerModule,
        MatDividerModule,
        MatChipsModule
    ],
    templateUrl: './security-marks.dialog.html',
    styleUrls: ['./security-marks.dialog.scss'],
    host: {
        class: 'aga-security-mark-dialog'
    },
    encapsulation: ViewEncapsulation.None
})
export class SecurityMarksDialogComponent implements OnInit {
    /*
    this map stores the security groups and marks
    which are available for that particular user
    */
    availableGroupAndMarkMap = new Map<SecurityGroup, SecurityMark[]>();

    /*
    this map stores the security groups and marks
    which are assigned on that specific node
    key : security group id
    value : Set<security mark id>
    */
    assignedGroupAndMarkOnNodeMap = new Map<string, Set<string>>();

    /*
    this map stores the security groups and marks on
    which the user has clicked to add or remove the
    security mark
    key : security group id
    value : Map<security mark id, NodeSecurityMarkBody>
    */
    newlySelectedGroupAndMarkMap = new Map<string, Map<string, NodeSecurityMarkBody>>();

    showLoadingSpinner = false;
    isSecurityMarksSelected = false;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: SecurityMarksDialogData,
        private securityMarksService: SecurityMarksService,
        private dialogRef: MatDialogRef<SecurityMarksDialogComponent>,
        private dialog: MatDialog,
        private store: Store<AppStore>
    ) {}

    ngOnInit() {
        this.showLoadingSpinner = true;
        this.securityMarksService
            .getSecurityGroup()
            .then((data) => {
                const securityMarksPromiseList: Promise<SecurityMarkResponse>[] = [];
                data.entries.forEach((securityGroupEntry) => {
                    securityMarksPromiseList.push(
                        this.securityMarksService.getSecurityMark(securityGroupEntry.id).then((securityMarkEntry) => {
                            this.availableGroupAndMarkMap.set(securityGroupEntry, securityMarkEntry.entries);
                            return securityMarkEntry;
                        })
                    );
                });
                Promise.all(securityMarksPromiseList)
                    .then(() => {
                        this.availableGroupAndMarkMap = this.sortAvailableGroups();
                        this.showLoadingSpinner = false;
                    })
                    .catch((error) => {
                        this.showLoadingSpinner = false;
                        throwError(error);
                    });
            })
            .catch((error) => {
                this.showLoadingSpinner = false;
                throwError(error);
            });
        this.getSecurityMarksAssignedOnNode();
    }

    private sortAvailableGroups(): Map<SecurityGroup, SecurityMark[]> {
        return new Map([...this.availableGroupAndMarkMap.entries()].sort((entry1, entry2) => entry1[0].groupName.localeCompare(entry2[0].groupName)));
    }

    handleCancel() {
        this.availableGroupAndMarkMap.clear();
        this.newlySelectedGroupAndMarkMap.clear();
        this.assignedGroupAndMarkOnNodeMap.clear();
    }

    /*
    this method is called whenever user clicks on the security
    marks in the dialog box. This method further compares the data with
    the already assigned security marks map (assignedGroupAndMarkOnNodeMap)
    and then decide whether to add or remove that mark from that node
  */
    manageSecurityMarksList(securityMark: SecurityMark, securityGroup: SecurityGroup) {
        let securityMarkMap: Map<string, NodeSecurityMarkBody> = this.newlySelectedGroupAndMarkMap.get(securityGroup.id);

        if (securityGroup.groupType === 'HIERARCHICAL') {
            this.handleHierarchicalGroup(securityMark.id, securityGroup.id, securityMarkMap);
        } else if (securityMarkMap && securityMarkMap.has(securityMark.id)) {
            this.sameSecurityMarkSelectedEventHandler(securityMarkMap, securityMark.id, securityGroup.id);
        } else {
            securityMarkMap = !securityMarkMap ? new Map<string, NodeSecurityMarkBody>() : securityMarkMap;

            this.manageSecurityMarkEventHandler(securityMarkMap, securityMark.id, securityGroup.id);
        }
    }

    private handleHierarchicalGroup(securityMarkId: string, securityGroupId: string, securityMarkMap: Map<string, NodeSecurityMarkBody>) {
        securityMarkMap = securityMarkMap ? securityMarkMap : new Map<string, NodeSecurityMarkBody>();
        let previouslySelectedMarkId = '';
        if (this.assignedGroupAndMarkOnNodeMap.has(securityGroupId)) {
            for (const markId of this.assignedGroupAndMarkOnNodeMap.get(securityGroupId)) {
                previouslySelectedMarkId = markId;
            }
        }

        // Security Marks not assigned and not edited at least once
        if (securityMarkMap.size === 0 && !this.assignedGroupAndMarkOnNodeMap.has(securityGroupId)) {
            this.setPayloadBasedOnOperation(securityMarkMap, securityMarkId, securityGroupId, 'ADD');

            this.newlySelectedGroupAndMarkMap.set(securityGroupId, securityMarkMap);
        } else if (this.assignedGroupAndMarkOnNodeMap.has(securityGroupId) && !this.newlySelectedGroupAndMarkMap.has(securityGroupId)) {
            // Security Marks assigned but not edited

            if (previouslySelectedMarkId !== securityMarkId) {
                this.setPayloadBasedOnOperation(securityMarkMap, securityMarkId, securityGroupId, 'ADD');
            }

            this.setPayloadBasedOnOperation(securityMarkMap, previouslySelectedMarkId, securityGroupId, 'REMOVE');

            this.newlySelectedGroupAndMarkMap.set(securityGroupId, securityMarkMap);
        } else if (this.assignedGroupAndMarkOnNodeMap.has(securityGroupId) && this.newlySelectedGroupAndMarkMap.has(securityGroupId)) {
            // Security Marks assigned and edited at least once

            securityMarkMap = new Map<string, NodeSecurityMarkBody>();

            if (previouslySelectedMarkId !== securityMarkId) {
                if (!this.newlySelectedGroupAndMarkMap.get(securityGroupId).has(securityMarkId)) {
                    this.setPayloadBasedOnOperation(securityMarkMap, securityMarkId, securityGroupId, 'ADD');
                }

                this.setPayloadBasedOnOperation(securityMarkMap, previouslySelectedMarkId, securityGroupId, 'REMOVE');

                this.newlySelectedGroupAndMarkMap.set(securityGroupId, securityMarkMap);
            } else {
                this.newlySelectedGroupAndMarkMap.delete(securityGroupId);
            }
        } else {
            // Security Marks not assigned but edited at least once
            if (this.newlySelectedGroupAndMarkMap.get(securityGroupId).has(securityMarkId)) {
                this.newlySelectedGroupAndMarkMap.delete(securityGroupId);
            } else {
                securityMarkMap = new Map<string, NodeSecurityMarkBody>();

                this.setPayloadBasedOnOperation(securityMarkMap, securityMarkId, securityGroupId, 'ADD');

                this.newlySelectedGroupAndMarkMap.set(securityGroupId, securityMarkMap);
            }
        }
        this.isSecurityMarksSelected = this.newlySelectedGroupAndMarkMap.size > 0;
    }

    private sameSecurityMarkSelectedEventHandler(
        securityMarkMap: Map<string, NodeSecurityMarkBody>,
        securityMarkId: string,
        securityGroupId: string
    ) {
        securityMarkMap.delete(securityMarkId);
        this.newlySelectedGroupAndMarkMap.set(securityGroupId, securityMarkMap);

        if (this.newlySelectedGroupAndMarkMap.get(securityGroupId)?.size === 0) {
            this.newlySelectedGroupAndMarkMap.delete(securityGroupId);
        }
        this.isSecurityMarksSelected = this.newlySelectedGroupAndMarkMap.size > 0;
    }

    private manageSecurityMarkEventHandler(securityMarkMap: Map<string, NodeSecurityMarkBody>, securityMarkId: string, securityGroupId: string) {
        if (this.assignedGroupAndMarkOnNodeMap.get(securityGroupId)?.has(securityMarkId)) {
            this.setPayloadBasedOnOperation(securityMarkMap, securityMarkId, securityGroupId, 'REMOVE');
        } else {
            this.setPayloadBasedOnOperation(securityMarkMap, securityMarkId, securityGroupId, 'ADD');
        }

        this.newlySelectedGroupAndMarkMap.set(securityGroupId, securityMarkMap);
        this.isSecurityMarksSelected = true;
    }

    private setPayloadBasedOnOperation(
        securityMarkMap: Map<string, NodeSecurityMarkBody>,
        securityMarkId: string,
        securityGroupId: string,
        operation: string
    ) {
        securityMarkMap.set(securityMarkId, { id: securityMarkId, groupId: securityGroupId, op: operation } as NodeSecurityMarkBody);
    }

    onSave() {
        const array: Array<NodeSecurityMarkBody> = [];
        this.newlySelectedGroupAndMarkMap.forEach(function (value) {
            value.forEach((securityMarkBody) => array.push(securityMarkBody));
        });

        if (array.length > 0) {
            this.securityMarksService.onSave(this.data.nodeId, array);
        }

        this.dialogRef.close();
        this.store.dispatch(new ReloadDocumentListAction());
    }

    showHelpDialog() {
        this.dialog.open(SecurityMarksHelpComponent, {
            width: '400px',
            panelClass: 'security-mat-dialog'
        });
    }

    getSecurityMarksAssignedOnNode() {
        this.assignedGroupAndMarkOnNodeMap.clear();

        this.securityMarksService
            .getNodeSecurityMarks(this.data.nodeId)
            .then((securityMarkPaging) => {
                const securityMarkResponse = {
                    entries: securityMarkPaging.list.entries.map((mark) => mark.entry)
                };

                securityMarkResponse.entries.forEach((securityMark) => {
                    let securityMarkSet = this.assignedGroupAndMarkOnNodeMap.get(securityMark.groupId);
                    securityMarkSet = !securityMarkSet || securityMarkSet.size === 0 ? new Set<string>() : securityMarkSet;
                    securityMarkSet.add(securityMark.id);
                    this.assignedGroupAndMarkOnNodeMap.set(securityMark.groupId, securityMarkSet);
                });
            })
            .catch((error) => {
                throwError(error);
            });
    }

    /*
    this method decides if the security marks are
    (assigned or selected) or (unassigned or unselected)
  */
    isSelected(securityMarkId: string, securityGroupId: string): boolean {
        if (this.newlySelectedGroupAndMarkMap.get(securityGroupId)?.has(securityMarkId)) {
            const markBody = this.newlySelectedGroupAndMarkMap.get(securityGroupId)?.get(securityMarkId);
            return markBody?.op === 'ADD';
        } else if (this.assignedGroupAndMarkOnNodeMap.get(securityGroupId)?.has(securityMarkId)) {
            return true;
        }
        return false;
    }
}
