import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AlfrescoService } from '../alfresco.service';

@Injectable({
  providedIn: 'root'
})
export class MetadataService {
  constructor(private alfrescoService: AlfrescoService) {}

  updateNodeMetadata(nodeId: string, metadata: any): Observable<any> {
    return this.alfrescoService.updateNodeMetadata(nodeId, metadata);
  }

  getNodeMetadata(nodeId: string): Observable<any> {
    return this.alfrescoService.getNodeMetadata(nodeId);
  }

  setClassificationMetadata(
    nodeId: string,
    classification: string,
    confidence: number,
    classifiedBy: 'AI' | 'Field Extraction' | 'Manual',
    extractedFields?: { [key: string]: any }
  ): Observable<any> {
    let description = `Classification: ${classification} | Confidence: ${(confidence * 100).toFixed(0)}% | By: ${classifiedBy}`;

    if (extractedFields && Object.keys(extractedFields).length > 0) {
      description += '\nFields: ' + JSON.stringify(extractedFields);
    }

    const metadata: any = {
      'cm:description': description
    };
    return this.updateNodeMetadata(nodeId, metadata);
  }

  setFundRelationshipMetadata(
    nodeId: string,
    umbrellaFundId: string,
    umbrellaFundName: string,
    subFundId?: string,
    subFundName?: string,
    accessLevel?: 'Umbrella' | 'SubFund' | 'Shared'
  ): Observable<any> {
    const metadata: any = {
      'ubs:umbrellaFundId': umbrellaFundId,
      'ubs:umbrellaFundName': umbrellaFundName,
      'ubs:accessLevel': accessLevel || 'Shared'
    };

    if (subFundId && subFundName) {
      metadata['ubs:subFundId'] = subFundId;
      metadata['ubs:subFundName'] = subFundName;
    }

    return this.updateNodeMetadata(nodeId, metadata);
  }

  setSubmissionMetadata(
    nodeId: string,
    submitterName: string,
    submitterEmail: string,
    formType: string,
    formData: any
  ): Observable<any> {
    const metadata = {
      'ubs:submitterName': submitterName,
      'ubs:submitterEmail': submitterEmail,
      'ubs:submissionDate': new Date().toISOString(),
      'ubs:formType': formType,
      'ubs:formData': JSON.stringify(formData),
      'ubs:reviewStatus': 'Pending'
    };
    return this.updateNodeMetadata(nodeId, metadata);
  }

  setSignatureMetadata(
    nodeId: string,
    signerEmail: string,
    signatureStatus: 'Pending' | 'Signed' | 'Rejected',
    signatureData?: string
  ): Observable<any> {
    const metadata: any = {
      'ubs:signatureRequired': true,
      'ubs:signerEmail': signerEmail,
      'ubs:signatureStatus': signatureStatus
    };

    if (signatureStatus === 'Signed' && signatureData) {
      metadata['ubs:signatureDate'] = new Date().toISOString();
      metadata['ubs:signatureData'] = signatureData;
    }

    return this.updateNodeMetadata(nodeId, metadata);
  }

  setArchiveMetadata(
    nodeId: string,
    archiveStatus: 'Ready' | 'Sent' | 'Archived' | 'Failed',
    archiveId?: string,
    archiveEndpoint?: string,
    error?: string
  ): Observable<any> {
    const metadata: any = {
      'ubs:archiveStatus': archiveStatus,
      'ubs:archiveDate': new Date().toISOString()
    };

    if (archiveId) {
      metadata['ubs:archiveId'] = archiveId;
    }
    if (archiveEndpoint) {
      metadata['ubs:archiveEndpoint'] = archiveEndpoint;
    }
    if (error) {
      metadata['ubs:archiveError'] = error;
    }

    return this.updateNodeMetadata(nodeId, metadata);
  }
}
