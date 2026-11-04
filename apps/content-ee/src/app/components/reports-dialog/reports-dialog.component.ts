import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService, NotificationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ReportsDialogReportType = 'Handover Gap Report' | 'Compile Handover Report';

export interface ReportsDialogData {
  projectId?: string;
}

export interface ReportsDialogResult {
  reportType: ReportsDialogReportType;
}

@Component({
  selector: 'adw-reports-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './reports-dialog.component.html',
  styleUrl: './reports-dialog.component.scss'
})
export class ReportsDialogComponent {
  readonly reportTypeControl = new FormControl<ReportsDialogReportType | null>(null, Validators.required);
  submitting = false;
  readonly data = inject<ReportsDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  readonly reportOptions: ReadonlyArray<{ value: ReportsDialogReportType; label: string }> = [
    { value: 'Handover Gap Report', label: 'Handover Gap Report' },
    { value: 'Compile Handover Report', label: 'Compile Handover Report' }
  ];

  constructor(
    private readonly dialogRef: MatDialogRef<ReportsDialogComponent, ReportsDialogResult | undefined>,
    private readonly http: HttpClient,
    private readonly authService: AuthenticationService,
    private readonly notificationService: NotificationService
  ) {}

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  async confirm(): Promise<void> {
    const v = this.reportTypeControl.value;
    if (v == null || this.reportTypeControl.invalid) {
      this.reportTypeControl.markAsTouched();
      return;
    }
    const projectId = this.data?.projectId?.trim();
    if (!projectId) {
      this.notificationService.openSnackMessage('Project id is missing. Reopen Reports from a project folder.');
      return;
    }

    const processInstancesUrl = environment.processInstancesUrl;
    const processDefinitionKey = environment.processDefinitionKey;
    const body = {
      processDefinitionKey,
      name: v,
      businessKey: processDefinitionKey,
      variables: [
        { name: 'projectid', value: projectId },
        { name: 'reporttype', value: v }
      ]
    };

    this.submitting = true;
    try {
      const baseHeaders = new HttpHeaders({
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        Pragma: 'no-cache'
      });
      const tokenHeaders = await firstValueFrom(this.authService.addTokenToHeader(processInstancesUrl, baseHeaders));
      try {
        await firstValueFrom(
          this.http.post(processInstancesUrl, body, {
            headers: tokenHeaders,
            withCredentials: true
          })
        );
      } catch (firstErr: unknown) {
        if (!ReportsDialogComponent.isAuthFailure(firstErr)) {
          throw firstErr;
        }
        const basic = localStorage.getItem('alf_auth');
        if (basic) {
          const basicHeaders = baseHeaders.set('Authorization', `Basic ${basic}`);
          try {
            await firstValueFrom(
              this.http.post(processInstancesUrl, body, {
                headers: basicHeaders,
                withCredentials: true
              })
            );
            this.notificationService.openSnackMessage('Report request submitted successfully.');
            this.dialogRef.close({ reportType: v });
            return;
          } catch (secondErr: unknown) {
            if (!ReportsDialogComponent.isAuthFailure(secondErr)) {
              throw secondErr;
            }
          }
        }

        // Final fallback: cookie session only (no Authorization header), some APS setups reject explicit auth headers.
        await firstValueFrom(
          this.http.post(processInstancesUrl, body, {
            headers: baseHeaders,
            withCredentials: true
          })
        );
      }
      this.notificationService.openSnackMessage('Report request submitted successfully.');
      this.dialogRef.close({ reportType: v });
    } catch (err: unknown) {
      const msg = ReportsDialogComponent.apiErrorMessage(err) || 'Failed to submit report request.';
      this.notificationService.openSnackMessage(msg);
    } finally {
      this.submitting = false;
    }
  }

  private static apiErrorMessage(err: unknown): string {
    const hiddenStackTraceMessage =
      'For security reasons the stack trace is no longer displayed, but the property is kept for previous versions.';
    const anyErr = err as any;
    const body = anyErr?.error;
    if (body && typeof body === 'object') {
      const apiError = body.error;
      if (apiError && typeof apiError === 'object') {
        if (typeof apiError.errorKey === 'string' && apiError.errorKey.trim()) {
          return apiError.errorKey.trim();
        }
        if (typeof apiError.briefSummary === 'string' && apiError.briefSummary.trim()) {
          return apiError.briefSummary.trim();
        }
        if (typeof apiError.message === 'string' && apiError.message.trim()) {
          const msg = apiError.message.trim();
          if (msg !== hiddenStackTraceMessage) {
            return msg;
          }
        }
      }
      if (typeof body.message === 'string' && body.message.trim()) {
        const msg = body.message.trim();
        if (msg !== hiddenStackTraceMessage) {
          return msg;
        }
      }
      if (typeof body.messageKey === 'string' && body.messageKey.trim()) {
        return body.messageKey.trim();
      }
    }
    if (typeof anyErr?.message === 'string' && anyErr.message.trim()) {
      return anyErr.message.trim();
    }
    return '';
  }

  private static isAuthFailure(err: unknown): boolean {
    const anyErr = err as any;
    const status = Number(anyErr?.status);
    return status === 401 || status === 403;
  }
}
