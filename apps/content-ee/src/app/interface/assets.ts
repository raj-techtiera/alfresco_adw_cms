export interface Step {
    id: number;
    title: string;
    subtitle: string;
  }
  
  export interface TemplateFolder {
    id: string;
    name: string;
  }
  
  export interface ValidationItem {
    label: string;
    sub: string;
    done: boolean;
  }
  
  export interface SummaryItem {
    label: string;
    value: string;
  }
  
  export type MasterDataStatus = 'Active' | 'Inactive';
  
 export interface MasterDataItem {
    id: number;
    name: string;
    code: string;
    status: MasterDataStatus;
  }

  export interface FilterConfig {
    label: string;
    key: 'region' | 'Asset_Field' | 'facility' | 'status';
    options: string[];
  }
  
  export interface KpiCard {
    value: string;
    label: string;
    sub: string;
    icon: string;
    iconBg: string;
    iconColor: string;
  }
  
  export interface DetailField {
    icon: string;
    label: string;
    value: string;
    isStatus?: boolean;
  }

  export type DetailTab = 'Details' | 'Permissions' | 'Retention & Compliance' | 'Audit Trail';
