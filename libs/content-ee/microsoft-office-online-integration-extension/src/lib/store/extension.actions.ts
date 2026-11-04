/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Action } from '@ngrx/store';
import { NodeChildAssociationEntry } from '@alfresco/js-api';

export const START_SESSION = 'START_SESSION';
export const RESUME_SESSION = 'RESUME_SESSION';
export const END_SESSION = 'END_SESSION';
export const END_EDITING = 'END_EDITING';
export const CANCEL_SESSION = 'CANCEL_SESSION';
export const CREATE_DOCUMENT = 'CREATE_DOCUMENT';
export const CREATE_DOCUMENT_AND_OPEN_VIEWER = 'CREATE_DOCUMENT_AND_OPEN_VIEWER';
export const CREATE_DOCUMENT_AND_START_SESSION = 'CREATE_DOCUMENT_AND_START_SESSION';
export const WORD = 'WORD';
export const EXCEL = 'EXCEL';
export const POWERPOINT = 'POWERPOINT';

export class StartSessionOfficeAction implements Action {
    readonly type = START_SESSION;
    constructor(public payload: NodeChildAssociationEntry) {}
}
export class ResumeSessionOfficeAction implements Action {
    readonly type = RESUME_SESSION;
    constructor(public payload: NodeChildAssociationEntry) {}
}
export class EndSessionOfficeAction implements Action {
    readonly type = END_SESSION;
    constructor(public payload: { node: NodeChildAssociationEntry; isMajor: boolean; comment?: string }) {}
}

export class EndEditingOfficeAction implements Action {
    readonly type = END_EDITING;
    constructor(public payload: NodeChildAssociationEntry) {}
}

export class CancelSessionOfficeAction implements Action {
    readonly type = CANCEL_SESSION;
    constructor(public payload: NodeChildAssociationEntry) {}
}
export class CreateOfficeDocumentAction implements Action {
    readonly type = CREATE_DOCUMENT;
    constructor(public payload: string) {}
}

export class CreateOfficeDocumentAndOpenViewerAction implements Action {
    readonly type = CREATE_DOCUMENT_AND_OPEN_VIEWER;
    constructor(public filePath: string, public fileName: string, public properties: any) {}
}

export class CreateOfficeDocumentAndStartSessionAction implements Action {
    readonly type = CREATE_DOCUMENT_AND_START_SESSION;
    constructor(public filePath: string, public fileName: string, public properties: any) {}
}
