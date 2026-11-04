/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewEncapsulation
} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { TranslationService } from '@alfresco/adf-core';
import { AlfrescoApiService, ContentNodeSelectorPanelComponent } from '@alfresco/adf-content-services';
import { Node } from '@alfresco/js-api';
import { Subject } from 'rxjs';

/** Same shape as ADF AttachFileWidgetDialogComponentData for dialog data */
export interface SameHostAttachFileDialogData {
  title: string;
  actionName?: string;
  selected: Subject<Node[]>;
  currentFolderId: string;
  ecmHost: string;
  context?: string;
  isSelectionValid?: (entry: Node) => boolean;
  showFilesInResult?: boolean;
  loginOnly?: boolean;
  accountIdentifier?: string;
  registerExternalHost?: (...args: any[]) => void;
}

/**
 * Attach-file dialog: content selector only, no authentication prompt.
 * Uses the main app's AlfrescoApiService; functionality unchanged.
 */
@Component({
  selector: 'aps-same-host-attach-file-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    TranslatePipe,
    ContentNodeSelectorPanelComponent
  ],
  encapsulation: ViewEncapsulation.None,
  template: `
    <header mat-dialog-title data-automation-id="content-node-selector-title">
      {{ title }}
    </header>

    <mat-dialog-content class="adf-login-dialog-content">
      <adf-content-node-selector-panel
        id="attach-file-content-node"
        [currentFolderId]="data?.currentFolderId"
        [isSelectionValid]="data?.isSelectionValid"
        [showFilesInResult]="data?.showFilesInResult"
        (select)="onSelect($event)"
        (siteChange)="onSiteChange($event)"
      />
    </mat-dialog-content>

    <mat-dialog-actions class="adf-login-dialog-actions" align="end">
      <button
        mat-button
        (click)="close()"
        data-automation-id="attach-file-dialog-actions-cancel"
      >
        {{ 'ATTACH-FILE.ACTIONS.CANCEL' | translate }}
      </button>
      <button
        mat-button
        [disabled]="!hasNodeSelected()"
        class="adf-choose-action"
        (click)="onClick()"
        data-automation-id="attach-file-dialog-actions-choose"
      >
        {{ buttonActionName | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .adf-login-dialog-actions {
        background-color: var(--theme-background-color);
        display: flex;
        justify-content: flex-end;
        color: var(--adf-theme-foreground-text-color);
      }
      .adf-login-dialog-actions button {
        text-transform: uppercase;
        font-weight: 400;
      }
      .adf-choose-action[disabled] {
        color: var(--adf-theme-foreground-secondary-text-color);
      }
      .adf-choose-action:enabled {
        color: var(--theme-primary-color);
      }
      .adf-login-dialog-actions {
        margin-left: -25px;
        margin-right: -25px;
        padding-right: 25px;
      }
      .mat-mdc-dialog-surface {
        overflow-x: hidden;
      }
      .adf-login-dialog-content {
        overflow: hidden !important;
      }
      .adf-login-dialog-content adf-content-node-selector-panel {
        display: block;
        height: 100%;
        min-height: 0;
      }
      .adf-login-dialog-content ::ng-deep .adf-content-node-selector-panel-container {
        overflow: hidden !important;
      }
      .mat-mdc-dialog-content .mdc-dialog__content .adf-login-dialog-content{
        overflow: hidden !important;
      }
    `
  ]
})
export class SameHostAttachFileDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  title = '';
  action = '';
  buttonActionName = '';
  chosenNode: Node[] = [];
  private searchFieldPatchIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly translation: TranslationService,
    @Inject(MAT_DIALOG_DATA) public data: SameHostAttachFileDialogData,
    private readonly alfrescoApiService: AlfrescoApiService,
    private readonly matDialogRef: MatDialogRef<SameHostAttachFileDialogComponent>,
    private readonly host: ElementRef<HTMLElement>
  ) {
    this.action = data.actionName ? data.actionName.toUpperCase() : 'CHOOSE';
    this.buttonActionName = `ATTACH-FILE.ACTIONS.${this.action}`;
    this.updateTitle('DROPDOWN.MY_FILES_OPTION');
  }

  ngOnInit(): void {
    // Register main API so the widget can complete upload (no auth prompt).
    if (this.data?.registerExternalHost && this.data?.accountIdentifier) {
      this.data.registerExternalHost(
        this.data.accountIdentifier,
        this.alfrescoApiService
      );
    }
    if (this.data?.loginOnly) {
      this.data.selected?.complete();
      this.matDialogRef.close();
    }
  }

  ngAfterViewInit(): void {
    this.startSearchFieldPatching();
  }

  ngOnDestroy(): void {
    this.clearSearchFieldPatching();
  }

  /** ADF search field has no placeholder; hide label in CSS and set placeholder + aria here. */
  private startSearchFieldPatching(): void {
    let attempts = 0;
    this.searchFieldPatchIntervalId = setInterval(() => {
      if (this.tryPatchContentSelectorSearchInput() || ++attempts > 40) {
        this.clearSearchFieldPatching();
      }
    }, 50);
  }

  private clearSearchFieldPatching(): void {
    if (this.searchFieldPatchIntervalId != null) {
      clearInterval(this.searchFieldPatchIntervalId);
      this.searchFieldPatchIntervalId = null;
    }
  }

  private tryPatchContentSelectorSearchInput(): boolean {
    const input = this.host.nativeElement.querySelector<HTMLInputElement>(
      '[data-automation-id="content-node-selector-search-input"]'
    );
    if (!input) {
      return false;
    }
    if (input.dataset['adwSearchPatched'] === '1') {
      return true;
    }
    const placeholder = this.translation.instant(
      'PROCESS-EXTENSION.ATTACH_FILE_CONTENT_SELECTOR.SEARCH_PLACEHOLDER'
    );
    const ariaLabel = this.translation.instant(
      'PROCESS-EXTENSION.ATTACH_FILE_CONTENT_SELECTOR.SEARCH_INPUT_ARIA_LABEL'
    );
    input.placeholder = placeholder;
    input.setAttribute('aria-label', ariaLabel);
    input.dataset['adwSearchPatched'] = '1';
    return true;
  }

  close(): void {
    this.data.selected.complete();
  }

  onSelect(nodeList: Node[]): void {
    this.chosenNode = nodeList;
  }

  onSiteChange(siteTitle: string): void {
    this.updateTitle(siteTitle);
  }

  onClick(): void {
    // Register main API so the widget can complete uploadFileFromCS (no auth prompt).
    if (this.data?.registerExternalHost && this.data?.accountIdentifier) {
      this.data.registerExternalHost(
        this.data.accountIdentifier,
        this.alfrescoApiService
      );
    }
    this.data.selected.next(this.chosenNode);
    this.data.selected.complete();
  }

  updateTitle(siteTitle: string): void {
    if (this.action === 'CHOOSE' && siteTitle) {
      this.title = this.translation.instant(
        `ATTACH-FILE.ACTIONS.${this.action}_ITEM`,
        { name: this.translation.instant(siteTitle) }
      );
    }
  }

  hasNodeSelected(): boolean {
    return !!this.chosenNode?.length;
  }
}
