import { Injectable } from '@angular/core';
import { Observable, interval, throwError, of } from 'rxjs';
import { switchMap, filter, take, timeout, catchError, map } from 'rxjs/operators';
import { AlfrescoService } from '../alfresco.service';
import { FlaskBackendService, EnrichmentResult } from './flask-backend.service';
import { MetadataService } from './metadata.service';

export interface ClassificationRequest {
  documentId: string;
  classificationType: 'ai' | 'extract' | 'manual';
  manualCategory?: string;
}

export interface ClassificationResult {
  documentId: string;
  classification: string;
  confidence: number;
  metadata: any;
  timestamp: Date;
  classifiedBy: 'AI' | 'Field Extraction' | 'Manual';
  extractedFields?: { [key: string]: any };
}

@Injectable({
  providedIn: 'root'
})
export class ClassificationService {
  private readonly STORAGE_KEY = 'classification_categories';
  private readonly METADATA_FIELDS_STORAGE_KEY = 'classification_metadata_fields';

  private defaultCategories = [
    'Compliance Document',
    'Marketing Material',
    'Client Form',
    'Investment Report',
    'Legal Document',
    'Financial Statement',
    'Risk Disclosure',
    'Fund Prospectus',
    'Birth Certificate',
    'Invoice',
    'Cat'
  ];

  private defaultMetadataFields = [
    'document_number',
    'document_type',
    'full_name',
    'date_of_birth',
    'date_of_issue',
    'place_of_issue',
    'issuing_authority',
    'language'
  ];

  private categories: string[];
  private metadataFields: string[];

  constructor(
    private alfrescoService: AlfrescoService,
    private flaskBackend: FlaskBackendService,
    private metadataService: MetadataService
  ) {
    this.categories = this.readStoredArray(this.STORAGE_KEY, this.defaultCategories);
    this.metadataFields = this.readStoredArray(this.METADATA_FIELDS_STORAGE_KEY, this.defaultMetadataFields);
  }

  getAvailableCategories(): string[] {
    return this.categories;
  }

  addCategory(name: string): void {
    const trimmed = name.trim();
    if (trimmed && !this.categories.includes(trimmed)) {
      this.categories = [...this.categories, trimmed];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.categories));
    }
  }

  removeCategory(name: string): void {
    this.categories = this.categories.filter((c) => c !== name);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.categories));
  }

  resetToDefaults(): void {
    this.categories = [...this.defaultCategories];
    localStorage.removeItem(this.STORAGE_KEY);
  }

  getAvailableMetadataFields(): string[] {
    return this.metadataFields;
  }

  addMetadataField(name: string): void {
    const normalized = this.normalizeMetadataFieldName(name);
    if (normalized && !this.metadataFields.includes(normalized)) {
      this.metadataFields = [...this.metadataFields, normalized];
      localStorage.setItem(this.METADATA_FIELDS_STORAGE_KEY, JSON.stringify(this.metadataFields));
    }
  }

  removeMetadataField(name: string): void {
    this.metadataFields = this.metadataFields.filter((f) => f !== name);
    localStorage.setItem(this.METADATA_FIELDS_STORAGE_KEY, JSON.stringify(this.metadataFields));
  }

  resetMetadataFieldsToDefaults(): void {
    this.metadataFields = [...this.defaultMetadataFields];
    localStorage.removeItem(this.METADATA_FIELDS_STORAGE_KEY);
  }

  normalizeMetadataFieldName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  classifyDocument(request: ClassificationRequest): Observable<ClassificationResult> {
    if (request.classificationType === 'manual') {
      return this.classifyManually(request.documentId, request.manualCategory || this.defaultCategories[0]);
    } else if (request.classificationType === 'ai') {
      return this.classifyWithAI(request.documentId);
    } else {
      return this.classifyWithFieldExtraction(request.documentId);
    }
  }

  private classifyManually(documentId: string, category: string): Observable<ClassificationResult> {
    const result: ClassificationResult = {
      documentId,
      classification: category,
      confidence: 1.0,
      metadata: {},
      timestamp: new Date(),
      classifiedBy: 'Manual'
    };

    return this.metadataService.setClassificationMetadata(documentId, category, 1.0, 'Manual').pipe(map(() => result));
  }

  private classifyWithAI(documentId: string): Observable<ClassificationResult> {
    return this.alfrescoService.getNodeContent(documentId).pipe(
      switchMap((blob) =>
        this.alfrescoService.getNode(documentId).pipe(
          map((node) => ({
            blob,
            filename: node.name,
            mimeType: node.content?.mimeType || this.getMimeTypeFromFilename(node.name)
          }))
        )
      ),
      switchMap(({ blob, filename, mimeType }) => {
        const file = new File([blob], filename, { type: mimeType });
        const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filename);
        const actions = isImage
          ? ['imageClassification', 'imageDescription', 'imageMetadataGeneration']
          : ['textClassification', 'textSummarization', 'textMetadataGeneration'];

        return this.flaskBackend.enrichContext({
          file,
          actions,
          metadata: {
            classes: this.categories
          }
        });
      }),
      switchMap((job) => this.pollForResults(job.jobId, 60)),
      switchMap((apiResult) => this.parseAndSaveClassification(documentId, apiResult, 'AI')),
      catchError((error) => {
        console.error('AI Classification failed:', error);
        return throwError(() => new Error('AI classification failed: ' + (error?.message || 'Unknown error')));
      })
    );
  }

  private classifyWithFieldExtraction(documentId: string): Observable<ClassificationResult> {
    return this.alfrescoService.getNodeContent(documentId).pipe(
      switchMap((blob) =>
        this.alfrescoService.getNode(documentId).pipe(
          map((node) => ({
            blob,
            filename: node.name,
            mimeType: node.content?.mimeType || this.getMimeTypeFromFilename(node.name)
          }))
        )
      ),
      switchMap(({ blob, filename, mimeType }) => {
        const file = new File([blob], filename, { type: mimeType });
        const isImage = mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(filename);
        const actions = isImage
          ? ['imageClassification', 'imageDescription', 'imageMetadataGeneration']
          : ['textClassification', 'textSummarization', 'textMetadataGeneration'];

        return this.flaskBackend.enrichContext({
          file,
          actions,
          metadata: this.buildFieldExtractionMetadata()
        });
      }),
      switchMap((job) => this.pollForResults(job.jobId, 60)),
      switchMap((apiResult) => this.parseFieldExtractionFromContext(documentId, apiResult)),
      catchError((error) => {
        console.error('Field Extraction failed:', error);
        return throwError(() => new Error('Field extraction failed: ' + (error?.message || 'Unknown error')));
      })
    );
  }

  private parseFieldExtractionFromContext(documentId: string, apiResult: EnrichmentResult): Observable<ClassificationResult> {
    let results: any = apiResult.results || {};
    if (Array.isArray(results) && results.length > 0) {
      results = results[0];
    }

    const classification = this.extractClassification(apiResult);
    const confidence = this.extractConfidence(apiResult);
    const extractedFields: any = {};

    const metadataResult = results.textMetadata || results.imageMetadata;
    if (metadataResult) {
      const generated = metadataResult.kSimilarMetadata || metadataResult.result || metadataResult;

      const extractFromObject = (obj: any) => {
        for (const [key, value] of Object.entries(obj)) {
          if (['classes', 'isSuccess', 'objectKey', 'processingId'].includes(key)) {
            continue;
          }
          if (value === null || value === undefined || value === '') {
            continue;
          }
          extractedFields[key] = value;
        }
      };

      if (Array.isArray(generated) && generated.length > 0) {
        extractFromObject(generated[0]);
      } else if (typeof generated === 'object' && !Array.isArray(generated)) {
        extractFromObject(generated);
      }
    }

    delete extractedFields.description;
    delete extractedFields.summary;

    const result: ClassificationResult = {
      documentId,
      classification,
      confidence,
      metadata: results,
      timestamp: new Date(),
      classifiedBy: 'Field Extraction',
      extractedFields
    };

    return this.metadataService
      .setClassificationMetadata(documentId, classification, confidence, 'Field Extraction', extractedFields)
      .pipe(
        map(() => result),
        catchError(() => of(result))
      );
  }

  private buildFieldExtractionMetadata(): { [key: string]: string | string[] } {
    const metadata: { [key: string]: string | string[] } = {
      classes: this.categories
    };
    this.metadataFields.forEach((field) => {
      metadata[field] = '';
    });
    return metadata;
  }

  private readStoredArray(storageKey: string, defaults: string[]): string[] {
    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...defaults];
    } catch {
      return [...defaults];
    }
  }

  private pollForResults(jobId: string, maxAttempts: number): Observable<EnrichmentResult> {
    return interval(2000).pipe(
      take(maxAttempts),
      switchMap(() => this.flaskBackend.pollContextResults(jobId)),
      filter((result) => !result.inProgress),
      take(1),
      timeout(300000),
      catchError((error) => {
        console.error('Polling failed:', error);
        return throwError(() => new Error('Classification timed out or failed'));
      })
    );
  }

  private parseAndSaveClassification(
    documentId: string,
    apiResult: EnrichmentResult,
    classifiedBy: 'AI'
  ): Observable<ClassificationResult> {
    let resultsData = apiResult.results;
    if (Array.isArray(resultsData) && resultsData.length > 0) {
      resultsData = resultsData[0];
    }

    const classification = this.extractClassification(apiResult);
    const confidence = this.extractConfidence(apiResult);

    const result: ClassificationResult = {
      documentId,
      classification,
      confidence,
      metadata: resultsData || {},
      timestamp: new Date(),
      classifiedBy
    };

    return this.metadataService.setClassificationMetadata(documentId, classification, confidence, classifiedBy).pipe(
      map(() => result),
      catchError((error) => {
        console.warn('Could not save metadata to Alfresco (custom properties may not exist):', error);
        return of(result);
      })
    );
  }

  private extractClassification(apiResult: EnrichmentResult): string {
    let results: any = apiResult.results || {};
    if (Array.isArray(results) && results.length > 0) {
      results = results[0];
    }

    if (results.textClassification?.result) {
      return results.textClassification.result;
    }
    if (results.imageClassification?.result) {
      return results.imageClassification.result;
    }
    if (results.textClassification?.classification) {
      return results.textClassification.classification;
    }
    if (results.imageClassification?.classification) {
      return results.imageClassification.classification;
    }
    if (results.metadataGeneration?.category) {
      return results.metadataGeneration.category;
    }

    return 'Unclassified';
  }

  private extractConfidence(apiResult: EnrichmentResult): number {
    let results: any = apiResult.results || {};
    if (Array.isArray(results) && results.length > 0) {
      results = results[0];
    }

    if (results.textClassification?.isSuccess && results.textClassification?.result) {
      return 0.95;
    }
    if (results.imageClassification?.isSuccess && results.imageClassification?.result) {
      return 0.95;
    }
    if (results.textClassification?.confidence) {
      return results.textClassification.confidence;
    }
    if (results.imageClassification?.confidence) {
      return results.imageClassification.confidence;
    }

    return 0.5;
  }

  getClassificationHistory(documentId: string): Observable<any> {
    return this.alfrescoService.getNodeMetadata(documentId).pipe(
      map((metadata) => {
        const desc = metadata['cm:description'] || '';
        const match = desc.match(/Classification: (.+?) \| Confidence: (\d+)% \| By: (\w+)/);
        return {
          classification: match ? match[1] : null,
          confidence: match ? parseInt(match[2], 10) / 100 : null,
          classifiedBy: match ? match[3] : null,
          classifiedDate: null
        };
      })
    );
  }

  private getMimeTypeFromFilename(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp',
      webp: 'image/webp',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain'
    };
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }
}
