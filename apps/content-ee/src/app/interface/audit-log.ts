export type AuditAction = 'login' | 'create' | 'update' | 'delete' | 'download' | 'share' | 'approve';

export interface AuditLogEntry {
  id: string;
  time: string;
  actor: string;
  action: AuditAction;
  entity: string;
  details: string;
}
