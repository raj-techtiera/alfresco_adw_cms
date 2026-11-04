import { Component, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthenticationService, NotificationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';
import { AlfrescoService } from '../../alfresco.service';

export interface DocNumberChangeRequestDialogData {
  nodeId: string;
  documentNumber: string;
  documentName: string;
  projectName: string;
  region: string;
  fieldAsset: string;
  facility: string;
}

@Component({
  selector: 'adw-doc-number-change-request-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './doc-number-change-request-dialog.component.html',
  styleUrl: './doc-number-change-request-dialog.component.scss'
})
export class DocNumberChangeRequestDialogComponent {
  readonly data = inject<DocNumberChangeRequestDialogData | null>(MAT_DIALOG_DATA, { optional: true });
  readonly proposedNumberControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(255)]
  });
  readonly changeReasonControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2000)]
  });
  validating = false;
  submitting = false;
  numberValidated = false;
  validationError: string | null = null;
  private validatedProposedNumber = '';

  constructor(
    private readonly dialogRef: MatDialogRef<DocNumberChangeRequestDialogComponent, boolean | undefined>,
    private readonly alfrescoService: AlfrescoService,
    private readonly authService: AuthenticationService,
    private readonly notificationService: NotificationService
  ) {}

  get canValidate(): boolean {
    return this.proposedNumberControl.value.trim().length > 0 && !this.validating && !this.submitting;
  }

  get canSubmit(): boolean {
    return (
      this.numberValidated &&
      !this.validating &&
      !this.submitting &&
      this.validatedProposedNumber === this.proposedNumberControl.value.trim() &&
      this.changeReasonControl.value.trim().length > 0 &&
      this.changeReasonControl.valid
    );
  }

  cancel(): void {
    if (this.validating || this.submitting) {
      return;
    }
    this.dialogRef.close(undefined);
  }

  onProposedNumberChanged(): void {
    this.numberValidated = false;
    this.validatedProposedNumber = '';
    this.validationError = null;
    if (this.proposedNumberControl.hasError('alreadyExists')) {
      const errors = { ...(this.proposedNumberControl.errors ?? {}) };
      delete errors['alreadyExists'];
      this.proposedNumberControl.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  async validateProposedNumber(): Promise<void> {
    if (!this.canValidate) {
      this.proposedNumberControl.markAsTouched();
      return;
    }

    const proposedNumber = this.proposedNumberControl.value.trim();
    if (!proposedNumber || this.proposedNumberControl.hasError('maxlength')) {
      this.proposedNumberControl.markAsTouched();
      this.numberValidated = false;
      this.validationError = null;
      return;
    }

    const currentNumber = this.data?.documentNumber?.trim() ?? '';
    if (currentNumber && proposedNumber.toLowerCase() === currentNumber.toLowerCase()) {
      this.numberValidated = false;
      this.validationError = 'Proposed document number must be different from the current document number.';
      this.proposedNumberControl.setErrors({
        ...(this.proposedNumberControl.errors ?? {}),
        alreadyExists: true
      });
      this.proposedNumberControl.markAsTouched();
      return;
    }

    this.validating = true;
    this.validationError = null;
    this.numberValidated = false;
    this.validatedProposedNumber = '';

    try {
      const result = await firstValueFrom(
        this.alfrescoService.searchEngineeringDocByDocumentNumber(proposedNumber)
      );

      if (result.exists) {
        this.numberValidated = false;
        this.validationError = 'Proposed document number already exists.';
        this.proposedNumberControl.setErrors({
          ...(this.proposedNumberControl.errors ?? {}),
          alreadyExists: true
        });
        this.proposedNumberControl.markAsTouched();
        return;
      }

      this.numberValidated = true;
      this.validatedProposedNumber = proposedNumber;
      this.validationError = null;
      if (this.proposedNumberControl.hasError('alreadyExists')) {
        const errors = { ...(this.proposedNumberControl.errors ?? {}) };
        delete errors['alreadyExists'];
        this.proposedNumberControl.setErrors(Object.keys(errors).length ? errors : null);
      }
    } catch (err: unknown) {
      this.numberValidated = false;
      this.validationError =
        this.readApiErrorMessage(err) || 'Failed to validate proposed document number. Please try again.';
    } finally {
      this.validating = false;
    }
  }

  async submit(): Promise<void> {
    const proposedNumber = this.proposedNumberControl.value.trim();
    const changeReason = this.changeReasonControl.value.trim();
    if (!proposedNumber || this.proposedNumberControl.invalid) {
      this.proposedNumberControl.markAsTouched();
      return;
    }
    if (!changeReason || this.changeReasonControl.invalid) {
      this.changeReasonControl.markAsTouched();
      return;
    }
    if (!this.numberValidated || this.validatedProposedNumber !== proposedNumber) {
      this.validationError = 'Please validate the proposed document number before submitting.';
      this.numberValidated = false;
      return;
    }

    const nodeId = this.data?.nodeId?.trim();
    const requestedBy = this.authService.getUsername()?.trim() ?? '';
    const requestedDate = formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss', 'en-GB');
    if (!nodeId || !requestedBy) {
      this.notificationService.openSnackMessage('Document context is missing. Close the dialog and try again.');
      return;
    }

    const currentDocumentNumber = this.data?.documentNumber?.trim() || '';
    this.submitting = true;
    try {
      await firstValueFrom(
        this.alfrescoService.startDocumentNumberChangeProcess({
          documentId: nodeId,
          documentName: this.data?.documentName?.trim() || '',
          projectName: this.data?.projectName?.trim() || '',
          region: this.data?.region?.trim() || '',
          fieldAsset: this.data?.fieldAsset?.trim() || '',
          facility: this.data?.facility?.trim() || '',
          currentDocumentNumber,
          proposedDocumentNumber: proposedNumber,
          reasonForChange: changeReason,
          requestedBy,
          requestedDate
        })
      );
      this.notificationService.openSnackMessage('Document number change request has been raised successfully.');
      this.dialogRef.close(true);
      setTimeout(() => window.location.reload(), 300);
    } catch (err: unknown) {
      const msg = this.readApiErrorMessage(err) || 'Failed to submit document number change request.';
      this.notificationService.showError(msg);
    } finally {
      this.submitting = false;
    }
  }

  private readApiErrorMessage(err: unknown): string {
    const anyErr = err as {
      error?: { error?: { briefSummary?: string; message?: string }; message?: string };
      message?: string;
    };
    const brief = anyErr?.error?.error?.briefSummary?.trim();
    if (brief) {
      return brief;
    }
    const nested = anyErr?.error?.error?.message?.trim() || anyErr?.error?.message?.trim();
    if (nested) {
      return nested;
    }
    if (typeof anyErr?.message === 'string' && anyErr.message.trim()) {
      return anyErr.message.trim();
    }
    return '';
  }
}
