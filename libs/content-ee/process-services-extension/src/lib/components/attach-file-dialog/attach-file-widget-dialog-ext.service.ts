/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { TranslationService } from '@alfresco/adf-core';
import { AttachFileWidgetDialogService } from '@alfresco/adf-process-services';
import { AlfrescoEndpointRepresentation, Node } from '@alfresco/js-api';
import { SameHostAttachFileDialogComponent } from './same-host-attach-file-dialog.component';

/**
 * When the attach-file dialog is opened for a repository that uses the same ECM host
 * as the app, opens a dialog that uses the main AlfrescoApiService so the user is
 * already logged in (fixes login form showing on PTTEP outgoing transmittal upload).
 */
@Injectable({ providedIn: 'root' })
export class AttachFileWidgetDialogExtService extends AttachFileWidgetDialogService {
  private readonly matDialog: MatDialog;
  private readonly translationService: TranslationService;

  constructor(
    dialog: MatDialog,
    translation: TranslationService
  ) {
    super();
    this.matDialog = dialog;
    this.translationService = translation;
  }

  override openLogin(
    repository: AlfrescoEndpointRepresentation,
    currentFolderId = '-my-',
    accountIdentifier?: string
  ): Observable<Node[]> {
    const data = this.buildPayload(repository);
    const payload = {
      ...data,
      currentFolderId,
      isSelectionValid: (entry: Node) => entry.isFile,
      showFilesInResult: true,
      accountIdentifier
    };

    // Always use our dialog so upload works with the main app's session (no login prompt).
    this.matDialog.open(SameHostAttachFileDialogComponent, {
      data: payload,
      panelClass: 'adf-attach-file-widget-dialog',
      maxWidth: 'calc(100vw - 16px)',
      width: 'min(1120px, calc(100vw - 24px))',
      maxHeight: 'calc(100dvh - 16px)'
    });
    return payload.selected.asObservable() as Observable<Node[]>;
  }

  private buildPayload(repository: AlfrescoEndpointRepresentation): {
    title: string;
    ecmHost: string;
    selected: Subject<Node[]>;
    registerExternalHost: (id: string, api: unknown) => void;
    accountIdentifier: string;
  } {
    const accountIdentifier = `alfresco-${repository.id}-${repository.name}`;
    const ecmHost = repository.repositoryUrl.replace('/alfresco', '');
    const selected = new Subject<Node[]>();
    selected.subscribe({ complete: () => this.close() });
    const title = this.translationService.instant('ATTACH-FILE.DIALOG.LOGIN', {
      ecmHost
    });
    const registerExternalHost = this.addService.bind(this);
    return {
      ecmHost,
      accountIdentifier,
      selected,
      title,
      registerExternalHost
    };
  }
}
