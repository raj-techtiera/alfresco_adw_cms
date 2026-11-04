import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '@alfresco/adf-core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  ManagedGroup,
  SiteGroupMembershipBody,
  UserManagementService
} from '../../../services/user-management.service';

export interface AddSiteMemberDialogData {
  siteId: string;
  siteLabel?: string;
}

export interface AddSiteMemberDialogResult {
  members: SiteGroupMembershipBody[];
}

interface SiteMemberRow {
  id: string;
  groupId: string;
  role: string;
}

interface RoleOption {
  value: string;
  label: string;
  description: string;
  icon: string;
}

@Component({
  selector: 'acs-add-site-member-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './add-site-member-dialog.component.html',
  styleUrl: './add-site-member-dialog.component.scss'
})
export class AddSiteMemberDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<AddSiteMemberDialogComponent, AddSiteMemberDialogResult | undefined>);
  private readonly userManagementService = inject(UserManagementService);
  private readonly notificationService = inject(NotificationService);
  readonly data = inject<AddSiteMemberDialogData>(MAT_DIALOG_DATA);

  readonly roleOptions: ReadonlyArray<RoleOption> = [
    {
      value: 'SiteManager',
      label: 'Manager',
      icon: 'workspace_premium',
      description:
        'Manager has full rights to all site content - what they have created themselves and what other site members have created.'
    },
    {
      value: 'SiteCollaborator',
      label: 'Collaborator',
      icon: 'groups',
      description:
        'Collaborator has full rights to the site content that they own; they have rights to edit but not delete content created by other site members.'
    },
    {
      value: 'SiteContributor',
      label: 'Contributor',
      icon: 'edit_note',
      description:
        'Contributor has full rights to the site content that they own; they cannot edit or delete content created by other site members.'
    },
    {
      value: 'SiteConsumer',
      label: 'Consumer',
      icon: 'visibility',
      description: 'Consumer has view-only rights in a site; they cannot create their own content.'
    }
  ];

  rows: SiteMemberRow[] = [];
  draft: SiteMemberRow = this.createEmptyRow();
  availableGroups: ManagedGroup[] = [];
  groupsLoading = false;
  groupsError = '';
  submitting = false;
  groupSelectSearch = '';

  get canAddDraft(): boolean {
    return !!this.draft.groupId && !!this.draft.role;
  }

  get canSubmit(): boolean {
    return !this.submitting && this.rows.length > 0 && this.rows.every((row) => !!row.groupId && !!row.role);
  }

  get dialogTitle(): string {
    const label = (this.data.siteLabel || this.data.siteId || '').trim();
    return label ? `Manage Permissions for ${label}` : 'Manage Permissions';
  }

  ngOnInit(): void {
    void this.loadGroups();
  }

  async loadGroups(): Promise<void> {
    this.groupsLoading = true;
    this.groupsError = '';
    try {
      const pageSize = 100;
      let skipCount = 0;
      let totalItems = Number.POSITIVE_INFINITY;
      const all: ManagedGroup[] = [];
      while (skipCount < totalItems) {
        const result = await this.userManagementService.getGroups(skipCount, pageSize);
        all.push(...result.items);
        totalItems = result.totalItems;
        skipCount += result.items.length;
        if (!result.items.length) {
          break;
        }
      }
      this.availableGroups = all.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } catch {
      this.groupsError = 'Failed to load groups.';
      this.availableGroups = [];
    } finally {
      this.groupsLoading = false;
    }
  }

  groupsForDraft(): ManagedGroup[] {
    const selected = new Set(this.rows.map((r) => r.groupId));
    return this.availableGroups.filter((g) => !selected.has(g.id));
  }

  matchesGroupSearch(group: ManagedGroup): boolean {
    const q = this.groupSelectSearch.trim().toLowerCase();
    if (!q) {
      return true;
    }
    return group.displayName.toLowerCase().includes(q) || group.id.toLowerCase().includes(q);
  }

  hasMatchingGroupsForDraft(): boolean {
    return this.groupsForDraft().some((group) => this.matchesGroupSearch(group));
  }

  onGroupSelectOpened(opened: boolean): void {
    if (!opened) {
      this.groupSelectSearch = '';
    }
  }

  addDraft(): void {
    if (!this.canAddDraft || this.submitting) {
      return;
    }
    this.rows = [
      ...this.rows,
      {
        id: this.draft.id,
        groupId: this.draft.groupId,
        role: this.draft.role
      }
    ];
    this.draft = this.createEmptyRow();
    this.groupSelectSearch = '';
  }

  clearDraft(): void {
    this.draft = this.createEmptyRow();
    this.groupSelectSearch = '';
  }

  removeRow(id: string): void {
    this.rows = this.rows.filter((row) => row.id !== id);
  }

  groupLabel(groupId: string): string {
    return this.availableGroups.find((g) => g.id === groupId)?.displayName || groupId;
  }

  roleLabel(role: string): string {
    return this.roleOptions.find((opt) => opt.value === role)?.label || role;
  }

  roleIcon(role: string): string {
    return this.roleOptions.find((opt) => opt.value === role)?.icon || 'verified_user';
  }

  trackRow(_index: number, row: SiteMemberRow): string {
    return row.id;
  }

  trackGroup(_index: number, group: ManagedGroup): string {
    return group.id;
  }

  close(): void {
    if (this.submitting) {
      return;
    }
    this.dialogRef.close(undefined);
  }

  async create(): Promise<void> {
    if (!this.canSubmit) {
      return;
    }
    const siteId = (this.data.siteId || '').trim();
    if (!siteId) {
      this.showErrorToast('Site id is not configured.');
      return;
    }

    const members: SiteGroupMembershipBody[] = this.rows.map((row) => ({
      role: row.role,
      id: row.groupId
    }));

    this.submitting = true;
    try {
      await this.userManagementService.addSiteGroupMembers(siteId, members);
      this.dialogRef.close({ members });
    } catch (err) {
      this.showErrorToast(this.resolveErrorMessage(err, 'Failed to add site members.'));
    } finally {
      this.submitting = false;
    }
  }

  private showErrorToast(message: string): void {
    this.notificationService.showError(message);
  }

  private createEmptyRow(): SiteMemberRow {
    return {
      id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      groupId: '',
      role: ''
    };
  }

  private resolveErrorMessage(err: unknown, fallback: string): string {
    const e = err as {
      message?: string;
      error?: {
        error?: { briefSummary?: string; description?: string; message?: string; errorKey?: string };
        briefSummary?: string;
        description?: string;
        message?: string;
      };
    };
    const nested = e?.error?.error;
    const top = e?.error;
    const message =
      nested?.briefSummary ||
      nested?.description ||
      nested?.message ||
      top?.briefSummary ||
      top?.description ||
      (typeof top?.message === 'string' ? top.message : undefined) ||
      e?.message ||
      fallback;
    return String(message).trim() || fallback;
  }
}
