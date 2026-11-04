import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AuthenticationService, NotificationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';

export interface ForceReopenDialogData {
  projectId: string;
  projectName: string;
}

const ACS_NODES_API_BASE_URL = '/alfresco/api/-default-/public/alfresco/versions/1/nodes';

@Component({
  selector: 'adw-force-reopen-dialog',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule
  ],
  templateUrl: './force-reopen-dialog.component.html',
  styleUrl: './force-reopen-dialog.component.scss'
})
export class ForceReopenDialogComponent implements OnInit {
  readonly data = inject<ForceReopenDialogData>(MAT_DIALOG_DATA);

  submitting = false;

  readonly form = new FormGroup({
    forcedReopenReason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(2000)]
    }),
    forceReopenDate: new FormControl<Date | null>(null, Validators.required),
    forcedReopenedBy: new FormControl({ value: '', disabled: true }, { nonNullable: true })
  });

  constructor(
    private readonly dialogRef: MatDialogRef<ForceReopenDialogComponent, boolean | undefined>,
    private readonly http: HttpClient,
    private readonly authService: AuthenticationService,
    private readonly notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.form.controls.forcedReopenedBy.setValue(this.resolveAcsUsername());
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const projectId = this.data.projectId?.trim();
    if (!projectId) {
      this.notificationService.openSnackMessage('Project id is missing. Close the dialog and try again.');
      return;
    }

    const forcedReopenReason = this.form.controls.forcedReopenReason.value.trim();
    const forceReopenDate = this.form.controls.forceReopenDate.value;
    const forcedReopenedBy = this.form.controls.forcedReopenedBy.value.trim();
    if (!forceReopenDate) {
      this.form.controls.forceReopenDate.markAsTouched();
      return;
    }

    const url = `${ACS_NODES_API_BASE_URL}/${projectId}`;
    const payload = {
      properties: {
        'edms:shutdown_status': 'ACTIVE',
        'edms:forced_reopen_reason': forcedReopenReason,
        'edms:is_force_reopen': true,
        'edms:force_reopen_date': formatDate(forceReopenDate, 'dd-MM-yyyy', 'en-GB'),
        'edms:forced_reopened_by': forcedReopenedBy
      }
    };

    this.submitting = true;
    try {
      const headers = await firstValueFrom(
        this.authService.addTokenToHeader(
          url,
          new HttpHeaders({
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            Pragma: 'no-cache'
          })
        )
      );
      await firstValueFrom(this.http.put<unknown>(url, payload, { headers }));
      this.notificationService.openSnackMessage('Project Reopened Successfully.');
      this.dialogRef.close(true);
      setTimeout(() => window.location.reload(), 300);
    } catch (err: unknown) {
      const msg = ForceReopenDialogComponent.apiErrorMessage(err) || 'Failed to reopen project.';
      this.notificationService.openSnackMessage(msg);
    } finally {
      this.submitting = false;
    }
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
    return this.authService.getUsername()?.trim() ?? '';
  }

  private static apiErrorMessage(err: unknown): string {
    const anyErr = err as { error?: { error?: { briefSummary?: string; errorKey?: string; message?: string }; message?: string }; message?: string };
    const body = anyErr?.error;
    if (body?.error?.briefSummary?.trim()) {
      return body.error.briefSummary.trim();
    }
    if (body?.error?.errorKey?.trim()) {
      return body.error.errorKey.trim();
    }
    if (body?.error?.message?.trim()) {
      return body.error.message.trim();
    }
    if (typeof body?.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
    if (typeof anyErr?.message === 'string' && anyErr.message.trim()) {
      return anyErr.message.trim();
    }
    return '';
  }
}
