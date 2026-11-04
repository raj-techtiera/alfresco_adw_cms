export interface BulkUploadDialogData {
    /** Alfresco project folder node id (segment after Projects). */
    projectFolderId: string;
    projectName?: string;
  }
  
  export interface BulkUploadDialogResult {
    success: boolean;
  }
  
  export type BulkUploadKind = 'zip' | 'csv';
  
  export interface BulkUploadSlot {
    kind: BulkUploadKind;
    label: string;
    hint: string;
    file: File | null;
    error: string | null;
  }
  

  export interface GroupPermissionRow {
    id: string;
    groupId: string;
    name: string;
    role: string;
  }
  
  export interface BusinessUnitCreationResult {
    status: string | null;
    message: string;
  }