import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { NotificationService } from '@alfresco/adf-core';
import { HrManagementService } from '../../../services/hr-management.service';
import { HrJrRequestDialogData, jobRequesitionInput } from '../../../interface/hrManagement';

const required = { nonNullable: true, validators: [Validators.required] };

@Component({
  standalone: true,
  selector: 'adw-hr-jr-request-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatSelectModule],
  templateUrl: './hr-jr-request-dialog.component.html',
  styleUrl: './hr-jr-request-dialog.component.scss'
})
export class HrJrRequestDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<HrJrRequestDialogComponent>);
  private readonly data = inject<HrJrRequestDialogData>(MAT_DIALOG_DATA);
  private readonly hrManagement = inject(HrManagementService);
  private readonly notification = inject(NotificationService);

  submitting = false;
  readonly departmentOptions = ['Engineering', 'Manufacturing', 'Quality', 'SCM', 'HR'];
  readonly priorityOptions = ['High', 'Medium', 'Low'];
  readonly employmentTypeOptions = ['Permanent', 'Contract', 'Temporary'];
  readonly form = new FormGroup({
    jobtitle: new FormControl('', required),
    department: new FormControl('', required),
    numberofpositions: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    priority: new FormControl('', required),
    employmenttype: new FormControl('', required),
    reasonforhiring: new FormControl('', required),
    expectedjoiningdate: new FormControl('', required)
  });

  isInvalid(name: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[name];
    return control.touched && control.invalid;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting = true;
    try {
      await this.hrManagement.startJobRequisitionRequest({ ...this.data, ...this.form.getRawValue() } as jobRequesitionInput);
      this.notification.openSnackMessage('JR Request submitted.');
      this.dialogRef.close(true);
    } catch (error) {
      this.notification.openSnackMessage(error instanceof Error ? error.message : 'Unable to submit JR Request.');
    } finally {
      this.submitting = false;
    }
  }
}
