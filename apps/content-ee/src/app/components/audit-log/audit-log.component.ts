import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { AuditAction, AuditLogEntry } from '../../interface/audit-log';

@Component({
  selector: 'acs-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './audit-log.component.html',
  styleUrl: './audit-log.component.scss'
})
export class AuditLogComponent {
  searchLogs = '';
  actionFilter: 'all' | AuditAction = 'all';
  refreshing = false;

  readonly actionOptions: Array<{ value: 'all' | AuditAction; label: string }> = [
    { value: 'all', label: 'All actions' },
    { value: 'login', label: 'Login' },
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'download', label: 'Download' },
    { value: 'share', label: 'Share' },
    { value: 'approve', label: 'Approve' }
  ];

  readonly auditEntries: AuditLogEntry[] = [
    {
      id: '1',
      time: '11 Aug 2026, 09:42 AM',
      actor: 'Somchai W.',
      action: 'login',
      entity: 'user #a1b2c3d4',
      details: '{"role":"project_admin","tenantSlug":"pttep","dashboardType":"tenant_own"}'
    },
    {
      id: '2',
      time: '11 Aug 2026, 09:38 AM',
      actor: 'Naree P.',
      action: 'create',
      entity: 'MDR-2026-0142',
      details: 'Created MDR entry for Piping Isometric drawings — Block B'
    },
    {
      id: '3',
      time: '11 Aug 2026, 09:21 AM',
      actor: 'System',
      action: 'update',
      entity: 'TR-OUT-00891',
      details: 'Transmittal status changed from Draft to Issued'
    },
    {
      id: '4',
      time: '11 Aug 2026, 08:55 AM',
      actor: 'Ananya K.',
      action: 'approve',
      entity: 'DOC-ENG-00456',
      details: 'Approved revision B of Process Flow Diagram'
    },
    {
      id: '5',
      time: '10 Aug 2026, 05:14 PM',
      actor: 'Pichai T.',
      action: 'download',
      entity: 'VDR-PKG-00321.zip',
      details: 'Downloaded vendor document package (12 files, 48.2 MB)'
    },
    {
      id: '6',
      time: '10 Aug 2026, 04:02 PM',
      actor: 'Naree P.',
      action: 'share',
      entity: 'Folder /Projects/G1/Engineering',
      details: 'Shared folder with Vendor Group — Read only'
    },
    {
      id: '7',
      time: '10 Aug 2026, 02:47 PM',
      actor: 'Admin',
      action: 'update',
      entity: 'user #e9f8d7c6',
      details: 'Updated role from contributor to collaborator'
    },
    {
      id: '8',
      time: '10 Aug 2026, 11:30 AM',
      actor: 'Somchai W.',
      action: 'delete',
      entity: 'TMP-UPLOAD-00912',
      details: 'Removed duplicate temporary upload from staging area'
    },
    {
      id: '9',
      time: '09 Aug 2026, 04:18 PM',
      actor: 'System',
      action: 'create',
      entity: 'WF-REV-00188',
      details: 'Workflow instance created for document review cycle'
    },
    {
      id: '10',
      time: '09 Aug 2026, 10:05 AM',
      actor: 'Ananya K.',
      action: 'login',
      entity: 'user #c5c56349',
      details: '{"role":"reviewer","tenantSlug":"pttep","dashboardType":"project"}'
    }
  ];

  get filteredAuditEntries(): AuditLogEntry[] {
    const search = this.searchLogs.trim().toLowerCase();
    return this.auditEntries
      .filter((entry) => this.actionFilter === 'all' || entry.action === this.actionFilter)
      .filter(
        (entry) =>
          search === '' ||
          entry.actor.toLowerCase().includes(search) ||
          entry.entity.toLowerCase().includes(search) ||
          entry.details.toLowerCase().includes(search) ||
          entry.action.toLowerCase().includes(search)
      );
  }

  get totalCount(): number {
    return this.auditEntries.length;
  }

  get filteredCount(): number {
    return this.filteredAuditEntries.length;
  }

  refresh(): void {
    this.refreshing = true;
    setTimeout(() => {
      this.refreshing = false;
    }, 600);
  }

  actionTagClass(action: AuditAction): string {
    return `al-action-tag--${action}`;
  }

  trackById(_index: number, entry: AuditLogEntry): string {
    return entry.id;
  }
}
