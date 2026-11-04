import { Component, inject, OnInit } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom, Observable } from 'rxjs';
import { NotificationService } from '@alfresco/adf-core';
import { AlfrescoService } from '../../alfresco.service';
import { MdrService } from '../../services/mdr.service';

const LOADING_FOLDER_RELATIVE_PATH = '06.Loading';
const REQUIRED = ['', Validators.required] as const;

export interface DocumentNamingDialogData {
  projectId?: string;
  projectName?: string;
}

interface UploadedFileEntry {
  id: string;
  file: File;
}

@Component({
  selector: 'acs-document-naming',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, ReactiveFormsModule, MatSelectModule, MatIconModule],
  templateUrl: './document-naming.component.html',
  styleUrl: './document-naming.component.scss'
})
export class DocumentNamingComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  getFiedsValue = inject(AlfrescoService);
  private readonly mdrService = inject(MdrService);
  private readonly notificationService = inject(NotificationService);
  readonly dialogRef = inject(MatDialogRef<DocumentNamingComponent>);
  readonly dialogData = inject<DocumentNamingDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  selectedCategory = '';
  engineeringDocForm!: FormGroup;
  vendorDataForm!: FormGroup;
  correspondenceForm!: FormGroup;
  openCategoryDocumentsForm!: FormGroup;
  disciplines: any[] = [];
  vendorDataCodes: any[] = [];
  recipients: any[] = [];
  categoryOptions: any[] = [];
  documentTypes: any[] = [];
  sheetNo: any[] = [];
  sourceSystemOptions = ['LIVELINK', 'KIKEH'];
  uploading = false;
  projectCode = '';
  uploadedFileEntries: UploadedFileEntry[] = [];
  readonly allowedFileTypes =
    'PDF, DWG, DXF, XLS, XLSX, DOC, DOCX, PPT, PPTX, ZIP, RAR, JPG, PNG, TIFF, TXT';
  readonly maxUploadSizeMb = 500;

  ngOnInit(): void {
    this.assignList(this.getFiedsValue.getCategories(), (items) => (this.categoryOptions = items));
    this.assignList(this.getFiedsValue.getDisciplines(), (items) => (this.disciplines = items));
    this.assignList(this.getFiedsValue.getSheetNo(), (items) => (this.sheetNo = items));
    this.getFiedsValue.getVendorcode().subscribe({
      next: (res) => (this.vendorDataCodes = this.asList(res)),
      error: () => (this.vendorDataCodes = [])
    });
    this.getFiedsValue.getRecipients().subscribe({
      next: (res) => (this.recipients = this.asList(res)),
      error: () => (this.recipients = [])
    });

    this.engineeringDocForm = this.fb.group(this.standardDocControls({ disciplineCode: REQUIRED }));
    this.vendorDataForm = this.fb.group(this.standardDocControls({ vendorDataCode: REQUIRED }));
    this.correspondenceForm = this.fb.group(
      this.standardDocControls({ vendorDataCode: REQUIRED, recipientCode: REQUIRED })
    );
    this.openCategoryDocumentsForm = this.fb.group({
      categoryCode: REQUIRED,
      freeTextDocumentNumber: REQUIRED,
      sourceSystem: REQUIRED,
      createdBy: REQUIRED
    });

    void this.loadProjectContext();
  }

  get projectName(): string {
    return this.dialogData?.projectName?.trim() || '';
  }

  get projectId(): string {
    return this.dialogData?.projectId?.trim() || '';
  }

  get canGenerateAndUpload(): boolean {
    if (!this.uploadedFileEntries.length || !this.projectId || this.uploading || !this.selectedCategory) {
      return false;
    }
    const form = this.selectedCategory === 'OPEN_CATEGORY' ? this.openCategoryDocumentsForm : this.activeDocForm;
    return !!form && form.valid;
  }

  get activeDocForm(): FormGroup {
    if (this.selectedCategory === 'VENDOR_DATA') {
      return this.vendorDataForm;
    }
    return this.selectedCategory === 'CORRESPONDENCE' ? this.correspondenceForm : this.engineeringDocForm;
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.addUploadedFiles(Array.from(input.files));
      input.value = '';
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files?.length) {
      this.addUploadedFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  removeUploadedFile(index: number): void {
    this.uploadedFileEntries = this.uploadedFileEntries.filter((_, i) => i !== index);
  }

  onClose(): void {
    this.dialogRef.close();
  }

  onReset(): void {
    this.selectedCategory = '';
    this.uploading = false;
    this.documentTypes = [];
    this.uploadedFileEntries = [];
    const createdBy = this.getCreatedBy() || '';
    this.resetStandardForm(this.engineeringDocForm, { disciplineCode: '', createdBy });
    this.resetStandardForm(this.vendorDataForm, { vendorDataCode: '', createdBy });
    this.resetStandardForm(this.correspondenceForm, { vendorDataCode: '', recipientCode: '', createdBy });
    this.openCategoryDocumentsForm.reset({
      categoryCode: '',
      freeTextDocumentNumber: '',
      sourceSystem: '',
      createdBy
    });
  }

  onCategoryChange(event: { value: string }): void {
    this.selectedCategory = event.value;
    this.uploadedFileEntries = [];
    this.getDocumentTypeByCategoryId(this.selectedCategory);
    const patch = { categoryCode: this.selectedCategory, createdBy: this.getCreatedBy() || '' };
    if (this.selectedCategory === 'ENGINEERING') {
      this.engineeringDocForm.patchValue(patch);
    } else if (this.selectedCategory === 'VENDOR_DATA') {
      this.vendorDataForm.patchValue(patch);
    } else if (this.selectedCategory === 'CORRESPONDENCE') {
      this.correspondenceForm.patchValue(patch);
    } else if (this.selectedCategory === 'OPEN_CATEGORY') {
      this.openCategoryDocumentsForm.patchValue({
        ...patch,
        freeTextDocumentNumber: '',
        sourceSystem: ''
      });
    }
  }

  getCreatedBy(): string | null {
    return localStorage.getItem('USER_PROFILE');
  }

  getDocumentTypeByCategoryId(categoryId: string): void {
    if (!categoryId) {
      this.documentTypes = [];
      return;
    }
    this.getFiedsValue.getDocumentTypeByCategoryId(categoryId).subscribe((res) => {
      this.documentTypes = this.asList(res);
    });
  }

  async onGenerateAndUpload(): Promise<void> {
    if (!this.canGenerateAndUpload) {
      return;
    }

    this.uploading = true;
    try {
      const metaData = this.buildUploadMetadata();
      if (!metaData) {
        this.showErrorNotification('Unable to build upload metadata. Please verify all required fields.');
        return;
      }
      for (const entry of this.uploadedFileEntries) {
        await firstValueFrom(this.getFiedsValue.bulkuploadDocumentFiles(entry.file, this.projectId, metaData));
      }
      this.dialogRef.close({
        success: true,
        documentNumber: '',
        uploadedCount: this.uploadedFileEntries.length
      });
    } catch (err: unknown) {
      this.showErrorNotification(err, 'Failed to upload one or more files.');
    } finally {
      this.uploading = false;
    }
  }

  optionValue(option: any, ...keys: string[]): string | number {
    if (option == null || typeof option !== 'object') {
      return option;
    }
    for (const key of keys) {
      if (option[key] != null && option[key] !== '') {
        return option[key];
      }
    }
    return option.id ?? option.code ?? option.name ?? '';
  }

  optionLabel(option: any, ...keys: string[]): string {
    if (option == null) {
      return '';
    }
    if (typeof option !== 'object') {
      return String(option);
    }
    for (const key of keys) {
      if (option[key] != null && option[key] !== '') {
        return String(option[key]);
      }
    }
    return String(option.label || option.name || option.code || option.id || '');
  }

  private standardDocControls(extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      categoryCode: REQUIRED,
      documentTypeCode: REQUIRED,
      sheetNo: ['01', Validators.required],
      createdBy: REQUIRED,
      ...extra
    };
  }

  private resetStandardForm(form: FormGroup, extra: Record<string, string>): void {
    form.reset({
      categoryCode: '',
      documentTypeCode: '',
      sheetNo: '01',
      ...extra
    });
  }

  private addUploadedFiles(files: File[]): void {
    const maxBytes = this.maxUploadSizeMb * 1024 * 1024;
    const newEntries = files
      .filter((file) => file.size <= maxBytes)
      .map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 9)}`,
        file
      }));
    this.uploadedFileEntries = [...this.uploadedFileEntries, ...newEntries];
  }

  private async loadProjectContext(): Promise<void> {
    if (!this.projectId) {
      return;
    }
    try {
      this.projectCode = (await this.mdrService.getProjectCode(this.projectId)) || this.projectName;
    } catch {
      this.projectCode = this.projectName;
    }
  }

  private assignList(source: Observable<any>, assign: (items: any[]) => void): void {
    source.subscribe((res) => assign(this.asList(res)));
  }

  private getSelectedOptionLabel(options: any[], selectedValue: any, ...preferKeys: string[]): string {
    if (selectedValue == null || selectedValue === '') {
      return '—';
    }
    const match = (options || []).find((option) =>
      preferKeys
        .flatMap((key) => [option?.[key], option?.id, option?.code])
        .some((candidate) => String(candidate) === String(selectedValue))
    );
    return match ? this.optionLabel(match, ...preferKeys, 'name', 'label') : String(selectedValue);
  }

  private buildUploadMetadata(): Record<string, string> | null {
    if (!this.projectId || !this.selectedCategory) {
      return null;
    }
    const form =
      this.selectedCategory === 'OPEN_CATEGORY' ? this.openCategoryDocumentsForm : this.activeDocForm;
    if (!form) {
      return null;
    }

    const formValue = form.getRawValue();
    const category = this.categoryOptions.find(
      (item) => String(this.optionValue(item, 'categoryCode', 'code', 'id')) === String(this.selectedCategory)
    );

    let discipline = '';
    let disciplineCode = '';
    if (this.selectedCategory === 'ENGINEERING') {
      discipline = this.getSelectedOptionLabel(
        this.disciplines,
        formValue.disciplineCode,
        'disciplineName',
        'name',
        'label',
        'disciplineCode',
        'code'
      );
      disciplineCode = String(formValue.disciplineCode ?? '');
    } else if (this.selectedCategory === 'VENDOR_DATA' || this.selectedCategory === 'CORRESPONDENCE') {
      discipline = this.getSelectedOptionLabel(
        this.vendorDataCodes,
        formValue.vendorDataCode,
        'vendorDataName',
        'name',
        'label',
        'vendorDataCode',
        'code'
      );
      disciplineCode = String(formValue.vendorDataCode ?? '');
    }

    const documentType = this.getSelectedOptionLabel(
      this.documentTypes,
      formValue.documentTypeCode,
      'documentTypeName',
      'name',
      'label',
      'documentTypeCode',
      'code'
    );

    return {
      relativePath: LOADING_FOLDER_RELATIVE_PATH,
      business_domain: category
        ? String(this.optionValue(category, 'categoryCode', 'code', 'id'))
        : String(formValue.categoryCode || this.selectedCategory || ''),
      discipline: discipline === '—' ? '' : discipline,
      discipline_code: disciplineCode === '—' ? '' : disciplineCode,
      document_type: documentType === '—' ? '' : documentType,
      document_type_code: String(formValue.documentTypeCode ?? ''),
      document_sheet_number: String(formValue.sheetNo ?? '')
    };
  }

  private showErrorNotification(source: unknown, fallback = 'Something went wrong.'): void {
    const message =
      typeof source === 'string' ? source.trim() || fallback : this.resolveSubmitError(source, fallback);
    this.notificationService.showError(message);
  }

  private resolveSubmitError(source: unknown, fallback: string): string {
    const candidates = this.collectErrorMessages(source);
    for (const raw of candidates) {
      const edmsMessage = this.extractEdmsErrorMessage(raw);
      if (edmsMessage) {
        return edmsMessage;
      }
    }
    return candidates[0] || fallback;
  }

  private collectErrorMessages(source: unknown): string[] {
    const messages: string[] = [];
    const visit = (value: unknown): void => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed && !/^Http failure response for /i.test(trimmed)) {
          messages.push(trimmed);
        }
        return;
      }
      if (!value || typeof value !== 'object') {
        return;
      }
      const record = value as Record<string, unknown>;
      visit(record['error']);
      if (record['error'] && typeof record['error'] === 'object') {
        const nested = record['error'] as Record<string, unknown>;
        visit(nested['message']);
        visit(nested['briefSummary']);
        visit(nested['errorKey']);
      }
      visit(record['message']);
    };
    visit(source);
    if (!messages.length && source && typeof source === 'object') {
      const record = source as Record<string, unknown>;
      if (typeof record['message'] === 'string' && record['message'].trim()) {
        messages.push(record['message'].trim());
      }
    }
    return messages;
  }

  private extractEdmsErrorMessage(text: string): string | null {
    return text.match(/EDMS-Start\s*(.+?)\s*EDMS-End/is)?.[1]?.trim() || null;
  }

  private asList(res: any): any[] {
    if (Array.isArray(res)) {
      return res;
    }
    if (Array.isArray(res?.data)) {
      return res.data;
    }
    if (Array.isArray(res?.entries)) {
      return res.entries;
    }
    if (Array.isArray(res?.list)) {
      return res.list;
    }
    return [];
  }
}
