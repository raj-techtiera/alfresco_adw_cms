import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, Subscription, of, firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatListModule } from '@angular/material/list';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ClassificationService, ClassificationResult } from '../../services/classification.service';
import { AlfrescoService, AlfrescoNode } from '../../alfresco.service';
import { VerticalService } from '../../services/vertical.service';
import { CategoryManagementDialogComponent } from './category-management-dialog.component';
import { MetadataManagementDialogComponent } from './metadata-management-dialog.component';

@Component({
  selector: 'app-classification-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './classification-panel.component.html',
  styleUrls: ['./classification-panel.component.scss']
})
export class ClassificationPanelComponent implements OnInit, OnDestroy {
  mode: 'existing' | 'upload' = 'upload';

  documentId = '';
  documentName = '';

  searchQuery = '';
  searchResults: AlfrescoNode[] = [];
  searching = false;
  showSearchDropdown = false;
  private searchSubject = new Subject<string>();

  filePreviewUrl: string | null = null;
  filePreviewSafeUrl: SafeResourceUrl | null = null;
  filePreviewType: 'image' | 'pdf' | 'unsupported' = 'unsupported';

  selectedFile: File | null = null;
  private smartClassificationLibraryId = '4ab66070-fcf5-471b-b660-70fcf5971beb';

  targetFolderId = '4ab66070-fcf5-471b-b660-70fcf5971beb';
  folderOptions = [
    { id: '4ab66070-fcf5-471b-b660-70fcf5971beb', name: 'Smart Classification' },
    { id: '-my-', name: 'My Files' },
    { id: '-shared-', name: 'Shared Files' }
  ];

  classificationType: 'ai' | 'extract' | 'manual' = 'ai';
  selectedCategory = '';
  categories: string[] = [];

  loading = false;
  uploading = false;
  classifying = false;
  error = '';
  isDragOver = false;

  classificationResult: ClassificationResult | null = null;
  uploadedDocumentId = '';

  duplicates: AlfrescoNode[] = [];
  checkingDuplicates = false;
  duplicateResolved = false;
  fileHash = '';

  similarDocuments: AlfrescoNode[] = [];
  loadingSimilar = false;
  similarError = '';

  movingToFolder = false;
  moveSuccess = false;
  moveError = '';
  movedToFolder = '';

  private classificationSub: Subscription | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private sanitizer: DomSanitizer,
    private classificationService: ClassificationService,
    private alfrescoService: AlfrescoService,
    private dialog: MatDialog,
    public verticalService: VerticalService
  ) {}

  ngOnInit() {
    this.categories = this.classificationService.getAvailableCategories();
    this.selectedCategory = this.categories[0];

    const nodeId =
      this.route.snapshot.paramMap.get('nodeId') ||
      this.route.snapshot.queryParamMap.get('nodeId') ||
      this.route.snapshot.queryParamMap.get('documentId');
    if (nodeId) {
      this.mode = 'existing';
      this.documentId = nodeId;
      this.loadDocument();
    }

    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (query.length < 2) {
            this.searchResults = [];
            this.showSearchDropdown = false;
            this.searching = false;
            return of([]);
          }
          this.searching = true;
          const aftsQuery = `TYPE:'cm:content' AND cm:name:'*${query}*'`;
          return this.alfrescoService.searchNodes(aftsQuery, {
            include: ['properties'],
            maxItems: 10
          });
        })
      )
      .subscribe({
        next: (results) => {
          this.searchResults = results;
          this.showSearchDropdown = results.length > 0;
          this.searching = false;
        },
        error: () => {
          this.searchResults = [];
          this.searching = false;
        }
      });
  }

  onSearchInput(query: string): void {
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  selectSearchResult(node: AlfrescoNode): void {
    this.documentId = node.id;
    this.documentName = node.name;
    this.searchQuery = node.name;
    this.showSearchDropdown = false;
    this.searchResults = [];
    this.error = '';

    this.alfrescoService.getNodeContent(node.id).subscribe({
      next: (blob) => this.createPreviewFromBlob(blob, node.name),
      error: () => {}
    });
  }

  onSearchBlur(): void {
    setTimeout(() => {
      this.showSearchDropdown = false;
    }, 200);
  }

  onSearchFocus(): void {
    if (this.searchResults.length > 0) {
      this.showSearchDropdown = true;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.documentName = this.selectedFile.name;
      this.error = '';
      this.createPreviewFromFile(this.selectedFile);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      this.documentName = this.selectedFile.name;
      this.error = '';
      this.createPreviewFromFile(this.selectedFile);
    }
  }

  async uploadAndClassify() {
    if (!this.selectedFile) {
      this.error = 'Please select a file to upload';
      return;
    }

    if (this.classificationType === 'manual' && !this.selectedCategory) {
      this.error = 'Please select a category';
      return;
    }

    this.uploading = true;
    this.error = '';
    this.classificationResult = null;
    this.duplicates = [];
    this.duplicateResolved = false;

    try {
      this.fileHash = await this.computeFileHash(this.selectedFile);
    } catch {
      this.fileHash = '';
    }

    this.alfrescoService.uploadDocument(this.selectedFile, this.targetFolderId).subscribe({
      next: (node) => {
        this.uploadedDocumentId = node.id;
        this.documentId = node.id;
        this.documentName = node.name;

        if (this.fileHash) {
          this.alfrescoService
            .updateNodeMetadata(node.id, {
              'cm:title': `sha256:${this.fileHash}`
            })
            .subscribe({
              next: () => {
                this.checkForDuplicates(node.id);
              },
              error: () => {
                this.uploading = false;
                this.classify();
              }
            });
        } else {
          this.uploading = false;
          this.classify();
        }
      },
      error: (err) => {
        this.uploading = false;
        this.error = 'Upload failed: ' + (err?.message || 'Unknown error');
      }
    });
  }

  private checkForDuplicates(uploadedNodeId: string): void {
    this.checkingDuplicates = true;

    const aftsQuery = `cm:title:"sha256:${this.fileHash}" AND TYPE:'cm:content'`;
    this.alfrescoService.searchNodes(aftsQuery, {
      include: ['properties', 'path'],
      maxItems: 20
    }).subscribe({
      next: (nodes) => {
        this.duplicates = nodes.filter((n) => n.id !== uploadedNodeId);
        this.checkingDuplicates = false;
        this.uploading = false;

        if (this.duplicates.length === 0) {
          this.classify();
        }
      },
      error: () => {
        this.checkingDuplicates = false;
        this.uploading = false;
        this.classify();
      }
    });
  }

  resolveDuplicate(action: 'keep-both' | 'remove-new' | 'replace-original'): void {
    this.duplicateResolved = true;

    if (action === 'keep-both') {
      this.classify();
    } else if (action === 'remove-new') {
      this.alfrescoService.deleteNode(this.uploadedDocumentId).subscribe({
        next: () => {
          this.duplicates = [];
          this.uploadedDocumentId = '';
          this.documentId = '';
          this.documentName = '';
          this.selectedFile = null;
          this.revokePreviewUrl();
          this.error = '';
        },
        error: (err) => {
          this.error = 'Failed to remove duplicate: ' + (err?.message || 'Unknown error');
        }
      });
    } else if (action === 'replace-original') {
      const deleteOps = this.duplicates.map((dup) => firstValueFrom(this.alfrescoService.deleteNode(dup.id)));
      Promise.all(deleteOps)
        .then(() => {
          this.duplicates = [];
          this.classify();
        })
        .catch((err) => {
          this.error = 'Failed to replace original: ' + (err?.message || 'Unknown error');
        });
    }
  }

  loadDocument() {
    if (!this.documentId.trim()) {
      this.error = 'Please enter a document ID';
      return;
    }

    this.loading = true;
    this.error = '';
    this.classificationResult = null;

    this.alfrescoService.getNode(this.documentId).subscribe({
      next: (node) => {
        this.documentName = node.name;
        this.loading = false;
        this.error = '';
        this.alfrescoService.getNodeContent(this.documentId).subscribe({
          next: (blob) => this.createPreviewFromBlob(blob, node.name),
          error: () => {}
        });
      },
      error: () => {
        this.loading = false;
        this.error = 'Document not found. Please check the ID.';
      }
    });
  }

  handleClassifyClick() {
    if (this.mode === 'upload' && this.selectedFile && !this.documentId) {
      this.uploadAndClassify();
    } else {
      this.classify();
    }
  }

  cancel(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      this.router.navigateByUrl('/personal-files');
    }
  }

  classify() {
    if (!this.documentId.trim()) {
      this.error = 'Please enter a document ID';
      return;
    }

    if (this.classificationType === 'manual' && !this.selectedCategory) {
      this.error = 'Please select a category';
      return;
    }

    if (this.classificationSub) {
      this.classificationSub.unsubscribe();
      this.classificationSub = null;
    }

    this.classifying = true;
    this.error = '';
    this.classificationResult = null;
    this.moveSuccess = false;
    this.moveError = '';

    this.classificationSub = this.classificationService
      .classifyDocument({
        documentId: this.documentId,
        classificationType: this.classificationType,
        manualCategory: this.selectedCategory
      })
      .subscribe({
        next: (result) => {
          this.classificationResult = result;
          this.classifying = false;
          this.findSimilarDocuments(result.classification, this.documentId);
          this.moveToClassifiedFolder(this.documentId, result.classification);
        },
        error: (err) => {
          this.classifying = false;
          this.error = 'Classification failed: ' + (err?.message || 'Unknown error');
        }
      });
  }

  reset() {
    this.mode = 'existing';
    this.documentId = '';
    this.documentName = '';
    this.selectedFile = null;
    this.uploadedDocumentId = '';
    this.classificationResult = null;
    this.error = '';
    this.classificationType = 'ai';
    this.targetFolderId = this.smartClassificationLibraryId;
    this.revokePreviewUrl();
    this.similarDocuments = [];
    this.loadingSimilar = false;
    this.similarError = '';
    this.searchQuery = '';
    this.searchResults = [];
    this.showSearchDropdown = false;
    this.duplicates = [];
    this.checkingDuplicates = false;
    this.duplicateResolved = false;
    this.fileHash = '';
    this.movingToFolder = false;
    this.moveSuccess = false;
    this.moveError = '';
    this.movedToFolder = '';
    if (this.classificationSub) {
      this.classificationSub.unsubscribe();
      this.classificationSub = null;
    }
  }

  openInDocumentBrowser(node: AlfrescoNode): void {
    this.router.navigate(['/documents'], { queryParams: { nodeId: node.id } });
  }

  getExtractedFields(): { key: string; value: any }[] | null {
    if (!this.classificationResult?.extractedFields) {
      return null;
    }

    return Object.entries(this.classificationResult.extractedFields)
      .filter(([key]) => key !== 'classification' && key !== 'confidence_notes')
      .map(([key, value]) => ({
        key: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        value: Array.isArray(value) ? value.join(', ') : value
      }))
      .filter((f) => f.value);
  }

  private moveToClassifiedFolder(documentId: string, classification: string): void {
    if (!classification || classification === 'Unclassified') {
      return;
    }

    this.movingToFolder = true;
    this.moveError = '';
    this.moveSuccess = false;

    this.alfrescoService
      .ensureFolder('Classes', this.smartClassificationLibraryId)
      .pipe(switchMap((classesFolder) => this.alfrescoService.ensureFolder(classification, classesFolder.id)))
      .pipe(
        switchMap((categoryFolder) => {
          this.movedToFolder = `Smart Classification/Classes/${classification}`;
          return this.alfrescoService.moveNode(documentId, categoryFolder.id);
        })
      )
      .subscribe({
        next: () => {
          this.movingToFolder = false;
          this.moveSuccess = true;
        },
        error: (err) => {
          this.movingToFolder = false;
          this.moveError = `Could not move document: ${err?.message || err?.statusText || 'Unknown error'}`;
        }
      });
  }

  private findSimilarDocuments(classification: string, currentDocumentId: string): void {
    this.loadingSimilar = true;
    this.similarDocuments = [];
    this.similarError = '';

    const aftsQuery = `cm:description:"Classification: ${classification}" AND TYPE:'cm:content'`;

    this.alfrescoService.searchNodes(aftsQuery, {
      include: ['properties'],
      maxItems: 20
    }).subscribe({
      next: (nodes) => {
        this.similarDocuments = nodes.filter((node) => node.id !== currentDocumentId);
        this.loadingSimilar = false;
      },
      error: () => {
        this.similarError = 'Could not load similar documents';
        this.loadingSimilar = false;
      }
    });
  }

  ngOnDestroy() {
    this.revokePreviewUrl();
    this.searchSubject.complete();
    if (this.classificationSub) {
      this.classificationSub.unsubscribe();
    }
  }

  openCategoryManager(): void {
    const ref = this.dialog.open(CategoryManagementDialogComponent, {
      width: '460px',
      disableClose: false
    });

    ref.afterClosed().subscribe(() => {
      this.categories = this.classificationService.getAvailableCategories();
      if (!this.categories.includes(this.selectedCategory)) {
        this.selectedCategory = this.categories[0] || '';
      }
    });
  }

  openMetadataManager(): void {
    this.dialog.open(MetadataManagementDialogComponent, {
      width: '500px',
      disableClose: false
    });
  }

  getDescription(): string | null {
    if (!this.classificationResult?.metadata) {
      return null;
    }

    let results: any = this.classificationResult.metadata;
    if (Array.isArray(results) && results.length > 0) {
      results = results[0];
    }

    if (results.imageDescription?.result) {
      return results.imageDescription.result;
    }
    if (results.imageDescription?.description) {
      return results.imageDescription.description;
    }
    if (results.textDescription?.description) {
      return results.textDescription.description;
    }
    return null;
  }

  getSummary(): string | null {
    if (!this.classificationResult?.metadata) {
      return null;
    }

    let results: any = this.classificationResult.metadata;
    if (Array.isArray(results) && results.length > 0) {
      results = results[0];
    }

    if (results.textSummary?.result) {
      return results.textSummary.result;
    }
    if (results.imageSummary?.result) {
      return results.imageSummary.result;
    }
    if (results.textSummarization?.summary) {
      return results.textSummarization.summary;
    }
    if (results.imageSummarization?.summary) {
      return results.imageSummarization.summary;
    }
    return null;
  }

  private revokePreviewUrl() {
    if (this.filePreviewUrl) {
      URL.revokeObjectURL(this.filePreviewUrl);
      this.filePreviewUrl = null;
      this.filePreviewSafeUrl = null;
      this.filePreviewType = 'unsupported';
    }
  }

  private createPreviewFromFile(file: File) {
    this.revokePreviewUrl();
    this.filePreviewType = this.getPreviewType(file.name, file.type);
    if (this.filePreviewType !== 'unsupported') {
      this.filePreviewUrl = URL.createObjectURL(file);
      this.filePreviewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.filePreviewUrl);
    }
  }

  private createPreviewFromBlob(blob: Blob, filename: string) {
    this.revokePreviewUrl();
    this.filePreviewType = this.getPreviewType(filename, blob.type);
    if (this.filePreviewType !== 'unsupported') {
      this.filePreviewUrl = URL.createObjectURL(blob);
      this.filePreviewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.filePreviewUrl);
    }
  }

  private getPreviewType(filename: string, mimeType: string): 'image' | 'pdf' | 'unsupported' {
    const ext = filename.toLowerCase().split('.').pop() || '';
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff', 'tif'];
    if (imageExts.includes(ext) || mimeType.startsWith('image/')) {
      return 'image';
    }
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      return 'pdf';
    }
    return 'unsupported';
  }

  private async computeFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
