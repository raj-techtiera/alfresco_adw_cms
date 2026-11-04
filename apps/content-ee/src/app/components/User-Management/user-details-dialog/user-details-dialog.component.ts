import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ManagedUser, UserManagementService } from '../../../services/user-management.service';

export interface UserDetailsDialogData {
  userId: string;
  /** Optional list-row snapshot shown while full details load. */
  preview?: ManagedUser;
}

interface DetailRow {
  label: string;
  value: string;
  icon?: string;
  wide?: boolean;
  toggle?: boolean;
}

@Component({
  selector: 'acs-user-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule
  ],
  templateUrl: './user-details-dialog.component.html',
  styleUrl: './user-details-dialog.component.scss'
})
export class UserDetailsDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<UserDetailsDialogComponent>);
  private readonly userManagementService = inject(UserManagementService);
  readonly data = inject<UserDetailsDialogData>(MAT_DIALOG_DATA);

  user: ManagedUser | null = this.data.preview ?? null;
  loading = true;
  error = '';

  get identityRows(): DetailRow[] {
    const u = this.user;
    if (!u) {
      return [];
    }
    return this.rows([
      { label: 'User ID', value: u.id, icon: 'badge' },
      { label: 'First name', value: u.firstName, icon: 'person' },
      { label: 'Last name', value: u.lastName, icon: 'person_outline' },
      { label: 'Job title', value: u.jobTitle, icon: 'work_outline' },
      { label: 'Location', value: u.location, icon: 'location_on' },
      {
        label: 'Email notifications',
        value: this.boolLabel(u.emailNotificationsEnabled),
        icon: 'mark_email_read',
        toggle: typeof u.emailNotificationsEnabled === 'boolean'
      }
    ]);
  }

  get contactRows(): DetailRow[] {
    const u = this.user;
    if (!u) {
      return [];
    }
    return this.rows([
      { label: 'Email', value: u.email, icon: 'mail_outline' },
      { label: 'Mobile', value: u.mobile, icon: 'smartphone' },
      { label: 'Telephone', value: u.telephone, icon: 'call' },
      { label: 'Skype ID', value: u.skypeId, icon: 'chat_bubble_outline' },
      { label: 'Google ID', value: u.googleId, icon: 'alternate_email' },
      { label: 'Instant message ID', value: u.instantMessageId, icon: 'forum' }
    ]);
  }

  get aboutRows(): DetailRow[] {
    const u = this.user;
    if (!u) {
      return [];
    }
    return this.rows([
      { label: 'User status', value: u.userStatus, icon: 'chat', wide: true },
      { label: 'Description', value: u.description, icon: 'notes', wide: true },
      { label: 'Status updated', value: this.formatDate(u.statusUpdatedAt), icon: 'schedule' }
    ]);
  }

  get companyRows(): DetailRow[] {
    const c = this.user?.company;
    if (!c) {
      return [];
    }
    return this.rows([
      { label: 'Organization', value: c.organization || this.user?.organization, icon: 'apartment', wide: true },
      { label: 'Address', value: this.companyAddress, icon: 'home_work', wide: true },
      { label: 'Postcode', value: c.postcode, icon: 'markunread_mailbox' },
      { label: 'Telephone', value: c.telephone, icon: 'call' },
      { label: 'Fax', value: c.fax, icon: 'fax' },
      { label: 'Email', value: c.email, icon: 'mail_outline' }
    ]);
  }

  get companyAddress(): string | undefined {
    const c = this.user?.company;
    if (!c) {
      return undefined;
    }
    const parts = [c.address1, c.address2, c.address3].map((p) => (p || '').trim()).filter(Boolean);
    return parts.length ? parts.join(', ') : undefined;
  }

  get companyLocationLine(): string | undefined {
    const address = this.companyAddress;
    const postcode = (this.user?.company?.postcode || '').trim();
    if (address && postcode) {
      return `${address}, ${postcode}`;
    }
    return address || postcode || undefined;
  }

  get hasCompanyDetails(): boolean {
    return this.companyRows.length > 0;
  }

  get emailNotificationsEnabled(): boolean {
    return this.user?.emailNotificationsEnabled === true;
  }

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.user = await this.userManagementService.getUser(this.data.userId);
    } catch {
      if (!this.user) {
        this.error = 'Failed to load user details.';
      }
    } finally {
      this.loading = false;
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/);
    return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : (name || '').slice(0, 2)).toUpperCase() || '?';
  }

  private formatDate(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  }

  private boolLabel(value?: boolean): string | undefined {
    if (typeof value !== 'boolean') {
      return undefined;
    }
    return value ? 'Enabled' : 'Disabled';
  }

  private rows(
    entries: Array<{ label: string; value?: string; icon?: string; wide?: boolean; toggle?: boolean }>
  ): DetailRow[] {
    return entries
      .map((entry) => ({
        label: entry.label,
        value: (entry.value || '').trim(),
        icon: entry.icon,
        wide: entry.wide,
        toggle: entry.toggle
      }))
      .filter((row) => !!row.value);
  }
}
