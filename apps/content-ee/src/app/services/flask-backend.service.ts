import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ContextEnrichmentRequest {
  file: File;
  actions: string[];
  metadata?: any;
}

export interface DataCurationRequest {
  file: File;
  options: {
    normalization: boolean;
    chunking: boolean;
    embedding: boolean;
    json_schema?: string;
  };
}

export interface EnrichmentJob {
  jobId: string;
  status: string;
}

export interface EnrichmentResult {
  jobId: string;
  inProgress: boolean;
  results?: any;
}

@Injectable({
  providedIn: 'root'
})
export class FlaskBackendService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) {}

  enrichContext(request: ContextEnrichmentRequest): Observable<EnrichmentJob> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('actions', JSON.stringify(request.actions));
    if (request.metadata) {
      formData.append('metadata_json', JSON.stringify(request.metadata));
    }

    const headers = { Accept: 'application/json' };
    return this.http.post<EnrichmentJob>(`${this.apiUrl}/context/upload`, formData, { headers });
  }

  pollContextResults(jobId: string): Observable<EnrichmentResult> {
    return this.http.get<EnrichmentResult>(`${this.apiUrl}/context/poll_results/${jobId}`);
  }

  curateData(request: DataCurationRequest): Observable<EnrichmentJob> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.options.normalization) {
      formData.append('normalization', 'on');
    }
    if (request.options.chunking) {
      formData.append('chunking', 'on');
    }
    if (request.options.embedding) {
      formData.append('embedding', 'on');
    }
    if (request.options.json_schema) {
      formData.append('json_schema', request.options.json_schema);
    }

    const headers = { Accept: 'application/json' };
    return this.http.post<EnrichmentJob>(`${this.apiUrl}/data_curation/upload`, formData, { headers });
  }

  pollCurationResults(jobId: string): Observable<EnrichmentResult> {
    return this.http.get<EnrichmentResult>(`${this.apiUrl}/data_curation/poll_results/${jobId}`);
  }
}
