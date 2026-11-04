import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService } from '@alfresco/adf-core';
import { Observable, from, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const ACTIVITI_CONTENT_RAW_URL = '/activiti-app/api/enterprise/content/raw';
const BULK_PROCESS_NAME = 'Upload Bulk Project Documents';

export interface ActivitiRelatedContent {
  id: number | string;
  name?: string;
}

export interface BulkProjectDocumentProcessPayload {
  processDefinitionKey: string;
  name: string;
  businessKey: string;
  values: {
    bulkprojectdocuments: string;
    bulkprojectdocumentmetadata: string;
    projectFolderId: string;
  };
}

@Injectable({ providedIn: 'root' })
export class BulkUploadService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthenticationService);

  /**
   * Upload a file to Activiti related content (`/api/enterprise/content/raw`).
   * Returns the content `id` from the response.
   */
  uploadRawContent(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return from(
      this.authService.addTokenToHeader(
        ACTIVITI_CONTENT_RAW_URL,
        new HttpHeaders({
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
    ).pipe(
      switchMap((headers) =>
        this.http.post<ActivitiRelatedContent>(ACTIVITI_CONTENT_RAW_URL, formData, { headers })
      ),
      map((response) => {
        const id = response?.id;
        if (id == null || String(id).trim() === '') {
          throw new Error('Content upload succeeded but no id was returned.');
        }
        return String(id);
      })
    );
  }

  /**
   * Start bulk project document process (`NG_APP_BULK_PROCESS_DEFINITION_KEY`).
   * - `bulkprojectdocuments` = ZIP content id
   * - `bulkprojectdocumentmetadata` = CSV content id
   */
  startBulkProjectDocumentProcess(
    zipContentId: string,
    csvContentId: string,
    projectFolderId: string
  ): Observable<unknown> {
    const key = environment.bulkProcessDefinitionKey;
    const payload: BulkProjectDocumentProcessPayload = {
      processDefinitionKey: key,
      name: BULK_PROCESS_NAME,
      businessKey: key,
      values: {
        bulkprojectdocuments: String(zipContentId),
        bulkprojectdocumentmetadata: String(csvContentId),
        projectFolderId: String(projectFolderId)
      }
    };

    return from(
      this.authService.addTokenToHeader(
        environment.processInstancesUrl,
        new HttpHeaders({
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
    ).pipe(switchMap((headers) => this.http.post(environment.processInstancesUrl, payload, { headers })));
  }
}
