export interface DmsDashboardFilters {
  search: string;
  status: string;
  discipline: string;
  documentType: string;
}

export interface DmsSearchResponse {
  list?: { entries?: Array<{ entry?: Record<string, unknown> }> };
}

export interface DmsDashboardRow {
  nodeId: string;
  name: string;
  title: string;
  discipline: string;
  documentType: string;
  status: string;
  sheetNumber: string;
  createdDate: string;
}

export interface DmsDocumentDetailsDialogData {
  nodeId: string;
}

export interface DmsDocumentDetailRow {
  label: string;
  value: string;
  multiline: boolean;
}

export interface DmsDocumentPropertyGroup {
  id: string;
  label: string;
  icon: string;
  rows: DmsDocumentDetailRow[];
}

export type DmsPreviewMode = 'idle' | 'loading' | 'pdf' | 'image' | 'text' | 'cad' | 'unsupported' | 'error';

export interface DmsPropertyGroupDef {
  id: string;
  label: string;
  icon: string;
  keys?: string[];
  existingOnly?: boolean;
  prefixes?: string[];
}

export interface DmsDonutChart {
  title: string;
  empty: string;
  labels: string[];
  datasets: import('chart.js').ChartDataset<'doughnut'>[];
  total: number;
}
