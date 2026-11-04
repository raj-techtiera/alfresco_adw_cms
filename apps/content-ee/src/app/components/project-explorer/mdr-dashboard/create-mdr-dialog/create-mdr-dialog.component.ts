import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { NotificationService } from '@alfresco/adf-core';
import {
  DviComponentOption,
  DviEngineerOption,
  DviLevel,
  MdrService
} from '../../../../services/mdr.service';

export interface CreateMdrDialogData {
  projectId: string;
  projectName: string;
}

@Component({
  selector: 'adw-create-mdr-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './create-mdr-dialog.component.html',
  styleUrl: './create-mdr-dialog.component.scss'
})
export class CreateMdrDialogComponent implements OnInit {
  readonly data = inject<CreateMdrDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<CreateMdrDialogComponent, boolean | undefined>);
  private readonly mdrService = inject(MdrService);
  private readonly notificationService = inject(NotificationService);

  readonly dviLevelOptions: DviLevel[] = ['N3', 'N4'];

  components: DviComponentOption[] = [];
  componentsLoading = false;
  componentsError: string | null = null;

  engineers: DviEngineerOption[] = [];
  engineersLoading = false;
  engineersError: string | null = null;

  submitting = false;
  submitted = false;

  form = {
    dviTitle: '',
    componentId: '',
    dviLevel: 'N3' as DviLevel,
    responsibleEngineer: ''
  };

  ngOnInit(): void {
    void this.loadDropdowns();
  }

  get isValid(): boolean {
    return !!(
      this.form.dviTitle.trim() &&
      this.form.componentId.trim() &&
      this.form.dviLevel &&
      this.form.responsibleEngineer.trim() &&
      this.data?.projectId?.trim()
    );
  }

  onClose(): void {
    if (this.submitting) {
      return;
    }
    this.dialogRef.close(undefined);
  }

  async onSubmit(): Promise<void> {
    if (!this.isValid || this.submitting || this.submitted) {
      return;
    }

    const component = this.components.find((item) => item.id === this.form.componentId);
    if (!component) {
      this.notificationService.openSnackMessage('Select a component.');
      return;
    }

    this.submitting = true;
    try {
      await this.mdrService.requestDviRegistration(this.data.projectId, {
        dviTitle: this.form.dviTitle,
        componentId: component.id,
        componentNumber: component.componentNumber,
        dviLevel: this.form.dviLevel,
        responsibleEngineer: this.form.responsibleEngineer
      });
      this.submitted = true;
      this.notificationService.openSnackMessage('DVI request submitted.');
      setTimeout(() => this.dialogRef.close(true), 1000);
    } catch (err: unknown) {
      const msg = CreateMdrDialogComponent.apiErrorMessage(err) || 'Failed to request DVI.';
      this.notificationService.openSnackMessage(msg);
    } finally {
      this.submitting = false;
    }
  }

  private async loadDropdowns(): Promise<void> {
    const projectId = this.data?.projectId?.trim();
    if (!projectId) {
      return;
    }

    this.componentsLoading = true;
    this.engineersLoading = true;
    this.componentsError = null;
    this.engineersError = null;

    const [componentsResult, engineersResult] = await Promise.allSettled([
      this.mdrService.loadDviComponents(projectId),
      this.mdrService.loadDviResponsibleEngineers(projectId)
    ]);

    if (componentsResult.status === 'fulfilled') {
      this.components = componentsResult.value;
    } else {
      this.components = [];
      this.componentsError = 'Failed to load components';
    }
    this.componentsLoading = false;

    if (engineersResult.status === 'fulfilled') {
      this.engineers = engineersResult.value;
    } else {
      this.engineers = [];
      this.engineersError = 'Failed to load responsible engineers';
    }
    this.engineersLoading = false;
  }

  private static apiErrorMessage(err: unknown): string {
    const anyErr = err as {
      error?: { error?: { briefSummary?: string; errorKey?: string; message?: string }; message?: string };
      message?: string;
    };
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
