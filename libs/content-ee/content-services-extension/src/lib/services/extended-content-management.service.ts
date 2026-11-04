/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { ContentManagementService } from '@alfresco/aca-content';
import { Injectable } from '@angular/core';
import { Node } from '@alfresco/js-api';

@Injectable({
    providedIn: 'root'
})
export class ExtendedContentManagementService extends ContentManagementService {
  private static readonly NODE_TYPES_NOT_ALLOWING_UPLOADING = ['rma:holdContainer', 'rma:hold', 'rma:transferContainer', 'rma:filePlan'];

  canUploadContent(folderNode: Node): boolean {
    return super.canUploadContent(folderNode) &&
      !ExtendedContentManagementService.NODE_TYPES_NOT_ALLOWING_UPLOADING.includes(folderNode.nodeType);
  }
}
