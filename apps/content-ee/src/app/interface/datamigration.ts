export type DataMigrationTab = 'import' | 'jobs' | 'numbering' | 'export';

export interface StepDef {
  num: number;
  label: string;
}

export interface DataSource {
  id: string;
  icon: string;
  name: string;
  type: string;
}

export interface TokenDef {
  key: string;
  example: string;
}

export interface ExportDataOption {
  id: string;
  icon: string;
  label: string;
}

export interface TabDef {
  key: DataMigrationTab;
  icon: string;
  label: string;
}