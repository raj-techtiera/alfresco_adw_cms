export interface JobRequisition {
  id: string;
  jobId: string;
  jobTitle: string;
  status: string;
  departmentName: string;
  requestedBy: string;
  priority: string;
  employmentType: string;
}

export interface JobRequisitionSearchFilter {
  name?: string;
  status?: string;
}

export interface JobRequisitionDetails {
  title: string;
  status: string;
  steps: JobRequisitionStep[];
}

export interface JobRequisitionPropertyTable {
  headers: string[];
  rows: string[][];
  columnIds: string[];
}

export interface JobRequisitionPropertyRow {
  label: string;
  value: string;
  table?: JobRequisitionPropertyTable;
}

export interface JobRequisitionStep {
  id: string;
  name: string;
  sequenceNo: number;
  status: string;
  tone: 'completed' | 'current' | 'upcoming';
  properties: JobRequisitionPropertyRow[];
}

export interface jobRequesitionInput extends HrJrRequestDialogData {
  jobtitle: string;
  department: string;
  numberofpositions: number;
  priority: string;
  employmenttype: string;
  reasonforhiring: string;
  expectedjoiningdate: string;
}

export interface HrJrRequestDialogData {
  programId: string;
  programname: string;
}

export interface HrRequisitionDetailsDialogData {
  nodeId: string;
  title?: string;
  status?: string;
}

export interface HrStatusCard {
  id: string;
  label: string;
  count: number;
  filter: string;
  icon: string;
  variant: 'total' | 'approved' | 'review' | 'draft';
}

export interface HrSearchEntry {
  id: string;
  name?: string;
  properties?: Record<string, unknown>;
}

export interface HrNodeResponse {
  entry: HrSearchEntry;
}

export interface HrNodeListResponse {
  list?: { entries?: Array<{ entry: HrSearchEntry }> };
}
