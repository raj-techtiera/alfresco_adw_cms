export interface Certificate {
    id: string;
    name: string;
    standard: string;
    issuedBy: string;
    issueDate: string;
    expiryDate: string;
    status: string;
  }
  
  export interface RegulatorySubmission {
    id: string;
    title: string;
    authority: string;
    submittedDate: string;
    dueDate: string;
    status: string;
  }
  
  export type KpiIcon = 'check-badge' | 'clock' | 'warning' | 'clipboard';
  
  export interface KpiCard {
    label: string;
    value: number;
    icon: KpiIcon;
    color: string;
    accentClass: string;
  }

  export type PreviewMode = 'idle' | 'loading' | 'pdf' | 'image' | 'text' | 'unsupported' | 'error';

  export interface ConstructionDocumentDetailsDialogData {
      nodeId: string;
  }
  
  export interface ConstructionDocumentDetailRow {
      label: string;
      value: string;
      multiline: boolean;
  }
  
  /** Row for construction document search (Alfresco public search API). */
export interface ConstructionDocumentRow {
    nodeId: string;
    title: string;
    project: string;
    poNumber: string;
    vdrLineItemId: string;
    documentStatus: string;
    mimeType: string;
}

export type ConstructionStatusKey = 'approved' | 'under-review' | 'draft' | 'as-built' | 'ifc' | 'other';

export interface ConstructionStatusOption {
    value: string;
    label: string;
    aliases: string[];
}

export interface ConstructionStatusDashboardCard {
    id: string;
    label: string;
    count: number;
    filterValue: string;
    icon: string;
    variant: 'total' | 'approved' | 'review' | 'draft' | 'as-built' | 'ifc' | 'pending' | 'rejected' | 'other' | 'unset';
    selectable: boolean;
}
