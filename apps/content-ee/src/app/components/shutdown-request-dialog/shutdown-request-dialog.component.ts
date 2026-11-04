import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AuthenticationService, NotificationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';

export type ShutdownType = 'FULL_FACILITY_SHUTDOWN' | 'PARTIAL_SHUTDOWN' | 'EMERGENCY_SHUTDOWN';

export interface ShutdownRequestDialogData {
  projectId: string;
  projectName: string;
}

export interface ShutdownRequestDialogResult {
  projectName: string;
  shutdownType: ShutdownType;
  shutdownReason: string;
  shutdownInitiatedDate: string;
  reopenDate: string;
  shutdownInitiatedBy: string;
}

const PROCESS_INSTANCES_URL = '/activiti-app/api/enterprise/process-instances';
const PROCESS_DEFINITION_KEY = 'EDMS-TAR-Shutdown-V1';

@Component({
  selector: 'adw-shutdown-request-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule
  ],
  templateUrl: './shutdown-request-dialog.component.html',
  styleUrl: './shutdown-request-dialog.component.scss'
})
export class ShutdownRequestDialogComponent implements OnInit {
  readonly data = inject<ShutdownRequestDialogData>(MAT_DIALOG_DATA);

  submitting = false;

  readonly shutdownTypeOptions: ReadonlyArray<{ value: ShutdownType; label: string }> = [
    { value: 'FULL_FACILITY_SHUTDOWN', label: 'Full facility shutdown' },
    { value: 'PARTIAL_SHUTDOWN', label: 'Partial shutdown' },
    { value: 'EMERGENCY_SHUTDOWN', label: 'Emergency shutdown' }
  ];

  readonly form = new FormGroup({
    shutdownType: new FormControl<ShutdownType | null>(null, Validators.required),
    shutdownReason: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    shutdownInitiatedDate: new FormControl<Date | null>(null, Validators.required),
    reopenDate: new FormControl<Date | null>(null),
    shutdownInitiatedBy: new FormControl({ value: '', disabled: true }, { nonNullable: true })
  });

  constructor(
    private readonly dialogRef: MatDialogRef<ShutdownRequestDialogComponent, ShutdownRequestDialogResult | undefined>,
    private readonly http: HttpClient,
    private readonly authService: AuthenticationService,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.form.controls.shutdownInitiatedBy.setValue(this.resolveAcsUsername());
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const shutdownType = this.form.controls.shutdownType.value;
    if (!shutdownType) {
      this.form.controls.shutdownType.markAsTouched();
      return;
    }

    const projectId = this.data.projectId?.trim();
    if (!projectId) {
      this.notificationService.openSnackMessage('Project id is missing. Reopen Shutdown Request from a project folder.');
      return;
    }

    const shutdownReason = this.form.controls.shutdownReason.value.trim();
    const shutdownInitiatedBy = this.form.controls.shutdownInitiatedBy.value.trim();
    const shutdownInitiatedDate = this.formatDateValue(this.form.controls.shutdownInitiatedDate.value);
    const reopenDate = this.formatDateValue(this.form.controls.reopenDate.value);

    const body = {
      processDefinitionKey: PROCESS_DEFINITION_KEY,
      name: 'Shutdown Request',
      businessKey: PROCESS_DEFINITION_KEY,
      variables: [
        { name: 'projectid', value: projectId },
        { name: 'shutdowntype', value: shutdownType },
        { name: 'shutdownreason', value: shutdownReason },
        { name: 'shutdowninitiatedby', value: shutdownInitiatedBy },
        { name: 'shutdowninitiateddate', value: shutdownInitiatedDate },
        { name: 'reopendate', value: reopenDate }
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
      const tokenHeaders = await firstValueFrom(this.authService.addTokenToHeader(PROCESS_INSTANCES_URL, baseHeaders));
      try {
        await firstValueFrom(
          this.http.post(PROCESS_INSTANCES_URL, body, {
            headers: tokenHeaders,
            withCredentials: true
          })
        );
      } catch (firstErr: unknown) {
        if (!ShutdownRequestDialogComponent.isAuthFailure(firstErr)) {
          throw firstErr;
        }
        const basic = localStorage.getItem('alf_auth');
        if (basic) {
          const basicHeaders = baseHeaders.set('Authorization', `Basic ${basic}`);
          try {
            await firstValueFrom(
              this.http.post(PROCESS_INSTANCES_URL, body, {
                headers: basicHeaders,
                withCredentials: true
              })
            );
            this.notificationService.openSnackMessage('Shutdown Request submitted successfully.');
            this.dialogRef.close({
              projectName: this.data.projectName,
              shutdownType,
              shutdownReason,
              shutdownInitiatedDate,
              reopenDate,
              shutdownInitiatedBy
            });
            return;
          } catch (secondErr: unknown) {
            if (!ShutdownRequestDialogComponent.isAuthFailure(secondErr)) {
              throw secondErr;
            }
          }
        }

        await firstValueFrom(
          this.http.post(PROCESS_INSTANCES_URL, body, {
            headers: baseHeaders,
            withCredentials: true
          })
        );
      }

      this.notificationService.openSnackMessage('Shutdown Request submitted successfully.');
      this.dialogRef.close({
        projectName: this.data.projectName,
        shutdownType,
        shutdownReason,
        shutdownInitiatedDate,
        reopenDate,
        shutdownInitiatedBy
      });
    } catch (err: unknown) {
      const msg = ShutdownRequestDialogComponent.apiErrorMessage(err) || 'Failed to submit shutdown request.';
      this.notificationService.openSnackMessage(msg);
    } finally {
      this.submitting = false;
    }
  }

  private formatDateValue(date: Date | null): string {
    if (!date) {
      return '';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private resolveAcsUsername(): string {
    try {
      const fromStorage = localStorage.getItem('ACS_USERNAME')?.trim();
      if (fromStorage) {
        return fromStorage;
      }
    } catch {
      /* ignore */
    }
    return '';
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
