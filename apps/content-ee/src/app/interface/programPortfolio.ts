export interface CreateProgramWizardStepMeta {
  step: number;
  title: string;
  desc: string;
  icon: string;
}

export interface GroupPermissionRow {
  id: string;
  /** Alfresco group id (e.g. GROUP_xxx). */
  groupId: string;
  /** Display name shown in the UI. */
  name: string;
  /** Single selected role (Viewer / Contributor / Editor / Document Controller). */
  permission: string;
}

export interface FlagField {
  key: string;
  label: string;
}

export interface DviMatrixRow {
  id: string;
  dviValue: string;
  groupId: string;
  groupName: string;
}

export interface EngineeringMatrixRow {
  id: string;
  discipline: string;
  reviewerGroupId: string;
  reviewerGroupName: string;
  approverGroupId: string;
  approverGroupName: string;
}

export interface ReviewField {
  key: string;
  label: string;
  block?: boolean;
  date?: boolean;
}

export interface ReviewSection {
  title: string;
  fields: ReviewField[];
}

export interface ProcessOutcome {
  responseKey: string;
  responseDesc: string;
}

export interface CreateProgramPayload {
  processDefinitionKey: string;
  name: string;
  businessKey: string;
  variables: Array<{ name: string; value: string | boolean }>;
}

export interface ProgramCard {
  id: string;
  title: string;
  reference: string;
  projectType: string;
  projectScope: string;
  projectDiscipline: string;
  projectDuration: string;
  client: string;
  businessUnit: string;
  estimatedBudget: string;
  plannedStartDate: string | null;
  targetCompletionDate: string | null;
  complianceStandards: string;
  businessJustification: string;
  defaultDaysExternalResponse: string;
  defaultDaysReviewComment: string;
  defaultDaysProjectResponse: string;
  shutdownStatus: string;
  createdAt?: string;
  createdBy: string;
  modifiedAt?: string;
  modifiedBy: string;
  image: string;
  imageRef?: string | { id?: string };
  imageLoadedOnDemand?: boolean;
  projectGroups: string;
  rawEntry?: unknown;
}

export interface ProjectDetailsDialogData {
  project: Record<string, unknown>;
}

export interface ProjectDetailRow {
  key: string;
  label: string;
  value: string;
  multiline: boolean;
}

export interface ProjectDetailSection {
  title: string;
  icon: string;
  rows: ProjectDetailRow[];
}

export interface GroupPermissionRows {
  name: string;
  role: string;
}

export interface MatrixSection {
  title: string;
  columns: string[];
  rows: string[][];
}

export interface SearchEntry {
  name?: string;
  createdAt?: string;
  modifiedAt?: string;
  createdByUser?: { displayName?: string };
  modifiedByUser?: { displayName?: string };
  properties?: Record<string, unknown>;
}

export interface DetailTab {
  id: string;
  title: string;
  icon: string;
}


export interface AlfrescoSearchRequest {
  query: {
    query: string;
    language: 'afts';
  };
  include: string[];
  paging: {
    maxItems: number;
    skipCount: number;
  };
  sort: Array<{
    type: 'FIELD';
    field: string;
    ascending: boolean;
  }>;
}

export interface MdrKpiCard {
  key: string;
  label: string;
  value: number;
  subtext: string;
  tone: 'blue' | 'teal' | 'orange' | 'green' | 'rose' | 'slate' | 'amber' | 'violet';
}

export interface MdrFilters {
  documentClass: string;
  discipline: string;
  deliverableType: string;
  status: string;
  handoverRequired: string;
  plannedFrom: string;
  plannedTo: string;
  search: string;
}

export type DviFlowTone = 'completed' | 'current' | 'upcoming';

export interface DviStepPropertyRow {
  label: string;
  value: string;
}

export interface DviFlowStep {
  id: string;
  name: string;
  sequenceNo: number;
  status: string;
  tone: DviFlowTone;
  properties: DviStepPropertyRow[];
}

export interface ViewTrackDialogData {
  dviId: string;
  title?: string;
}