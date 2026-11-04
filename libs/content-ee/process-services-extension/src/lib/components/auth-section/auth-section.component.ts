/*
 * Copyright © 2005-2025 Hyland Software, Inc. and its affiliates. All rights reserved.
 *
 * License rights for this program may be obtained from Hyland Software, Inc.
 * pursuant to a written agreement and any use of this program without such an
 * agreement is prohibited.
 */

import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { IntegrationAlfrescoOnPremiseApi, IntegrationSSOApi, PreferencesApi } from '@alfresco/js-api';
import { CommonModule } from '@angular/common';
import { AlfrescoApiService } from '@alfresco/adf-content-services';
import { catchError, forkJoin, from, of, take } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioGroup, MatRadioButton, MatRadioChange } from '@angular/material/radio';
import { MatDivider } from '@angular/material/list';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { APS_AUTO_AUTH_KEY } from '../../process-services-extension.module';
import { NotificationService } from '@alfresco/adf-core';

declare global {
  interface Window {
    contentAccountAuthConfirmed: () => void;
    contentAccountAuthFailed: (error: any, details: any) => void;
  }
}

@Component({
    selector: 'aps-auth-section',
    standalone: true,
    imports: [CommonModule, TranslatePipe, MatIcon, MatButtonModule, MatRadioGroup, MatRadioButton, MatDivider, MatProgressSpinner],
    templateUrl: './auth-section.component.html',
    styleUrls: ['./auth-section.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AuthSectionComponent implements OnInit {
    private _preferencesApi: PreferencesApi;
    private _integrationAlfrescoOnPremiseApi: IntegrationAlfrescoOnPremiseApi;
    private _integrationSSOApi: IntegrationSSOApi;

    autoAuthEnabled: boolean;
    autoAuthInitial: boolean;
    isLoading = true;
    editMode = false;
    sectionExpanded = false;
    ssoRepositoryId: string = null;

    get preferencesApi(): PreferencesApi {
        this._preferencesApi = this._preferencesApi ?? new PreferencesApi(this.apiService.getInstance());
        return this._preferencesApi;
    }

    get integrationAlfrescoOnPremiseApi(): IntegrationAlfrescoOnPremiseApi {
        this._integrationAlfrescoOnPremiseApi = this._integrationAlfrescoOnPremiseApi ?? new IntegrationAlfrescoOnPremiseApi(this.apiService.getInstance());
        return this._integrationAlfrescoOnPremiseApi;
    }

    get integrationSSOApi(): IntegrationSSOApi {
        this._integrationSSOApi = this._integrationSSOApi ?? new IntegrationSSOApi(this.apiService.getInstance());
        return this._integrationSSOApi;
    }

    constructor(private readonly apiService: AlfrescoApiService, private readonly notificationService: NotificationService) {}

    ngOnInit(): void {
        forkJoin({
            autoAuth: from(this.preferencesApi.getPreference('-me-', APS_AUTO_AUTH_KEY)).pipe(take(1), catchError(() => of(null))),
            repos: from(this.integrationAlfrescoOnPremiseApi.getRepositories()).pipe(take(1), catchError(() => of(null)))
        }).subscribe(({ autoAuth, repos }) => {
            this.autoAuthEnabled = autoAuth?.entry.value === 'true';
            this.autoAuthInitial = this.autoAuthEnabled;
            if (repos?.data?.length > 0) {
                const ssoInstance = repos.data.find(repo => repo.authenticationType === 'sso');
                this.ssoRepositoryId = ssoInstance?.id.toString() ?? null;
            }
            this.isLoading = false;
        });
    }

    toggleSection(): void {
        this.sectionExpanded = !this.sectionExpanded;
    }

    toggleEditMode(): void {
        this.editMode = !this.editMode;
        this.sectionExpanded = true;
    }

    cancelEditing(): void {
        this.autoAuthEnabled = this.autoAuthInitial;
        this.editMode = false;
    }

    saveChanges(): void {
        void this.preferencesApi.updatePreference('-me-', APS_AUTO_AUTH_KEY, this.autoAuthEnabled.toString());
        this.autoAuthInitial = this.autoAuthEnabled;
        if (this.autoAuthEnabled) {
            from(this.integrationSSOApi.getAccountInformation(this.ssoRepositoryId)).pipe(take(1), catchError(() => of(null))).subscribe((accountInfo) => {
                if (accountInfo?.ownerEmail === null && accountInfo?.expireDate === null) {
                    const authWindow = window.open(accountInfo.authenticationURL, '_blank', 'popup,width=600,height=600');
                    const notification = this.notificationService;
                    window.contentAccountAuthConfirmed = function () {
                        authWindow?.close();
                    };
                    window.contentAccountAuthFailed = function (error: any, details: any) {
                        notification.showError('AUTH_SECTION.AUTH_FAILED', null, { error, details });
                        authWindow?.close();
                    };
                }
            });
        }
        this.editMode = false;
    }

    autoAuthChange(event: MatRadioChange): void {
        this.autoAuthEnabled = event.value;
    }
}
