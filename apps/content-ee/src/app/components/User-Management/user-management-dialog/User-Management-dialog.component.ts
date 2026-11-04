import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import {
  CreateGroupInput,
  CreateUserInput,
  ManagedGroup,
  ManagedUser,
  UserManagementService
} from '../../../services/user-management.service';

export type ManagementDialogMode = 'user' | 'group' | 'members';

export interface ManagementDialogData {
  mode: ManagementDialogMode;
  /** Required when mode is 'members': the group to add users to. */
  group?: ManagedGroup;
}

export type UserDialogResult = { type: 'user' } & CreateUserInput;
export type GroupDialogResult = { type: 'group' } & CreateGroupInput;

@Component({
  selector: 'acs-user-management-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './User-Management-dialog.component.html',
  styleUrl: './User-Management-dialog.component.scss'
})
export class UserManagementDialogComponent implements OnInit {
  firstName = '';
  lastName = '';
  username = '';
  email = '';
  password = '';
  isAdmin = false;
  hidePassword = true;

  groupName = '';
  selectedMembers: string[] = [];
  memberOptions: ManagedUser[] = [];
  membersLoading = false;
  membersLoadError = '';
  existingMembers = new Set<string>();

  constructor(
    @Inject(MAT_DIALOG_DATA) readonly data: ManagementDialogData,
    private readonly dialogRef: MatDialogRef<UserManagementDialogComponent, UserDialogResult | GroupDialogResult>,
    private readonly userManagementService: UserManagementService
  ) {}

  get mode(): ManagementDialogMode {
    return this.data.mode;
  }

  get group(): ManagedGroup | undefined {
    return this.data.group;
  }

  ngOnInit(): void {
    if (this.mode === 'group') {
      this.loadMemberOptions();
    }
    if (this.mode === 'members' && this.group) {
      this.groupName = this.group.displayName;
      this.loadMembersMode(this.group.id);
    }
  }

  private async fetchAllUsers(): Promise<ManagedUser[]> {
    const pageSize = 100;
    const first = await this.userManagementService.getUsers(0, pageSize);
    const all = [...first.items];
    while (all.length < first.totalItems) {
      const page = await this.userManagementService.getUsers(all.length, pageSize);
      if (!page.items.length) {
        break;
      }
      all.push(...page.items);
    }
    return all.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }

  private async loadMemberOptions(): Promise<void> {
    this.membersLoading = true;
    try {
      this.memberOptions = await this.fetchAllUsers();
    } catch {
      this.memberOptions = [];
    } finally {
      this.membersLoading = false;
    }
  }

  /** Loads the users list and the group's current members together, pre-selecting the members. */
  private async loadMembersMode(groupId: string): Promise<void> {
    this.membersLoading = true;
    this.membersLoadError = '';
    try {
      const [options, memberIds] = await Promise.all([
        this.fetchAllUsers(),
        this.userManagementService.getGroupMemberIds(groupId).catch((error) => {
          console.error('Failed to load group members:', error);
          return null;
        })
      ]);
      this.memberOptions = options;
      if (memberIds) {
        this.existingMembers = new Set(memberIds);
        this.selectedMembers = [...memberIds];
      } else {
        this.membersLoadError = 'Could not load current members of this group';
      }
    } catch {
      this.memberOptions = [];
      this.membersLoadError = 'Could not load users';
    } finally {
      this.membersLoading = false;
    }
  }

  get newMembers(): string[] {
    return this.selectedMembers.filter((id) => !this.existingMembers.has(id));
  }

  get isValid(): boolean {
    if (this.mode === 'user') {
      return Boolean(this.username.trim() && this.firstName.trim() && this.email.trim() && this.password);
    }
    if (this.mode === 'members') {
      return this.newMembers.length > 0;
    }
    return Boolean(this.groupName.trim());
  }

  create(): void {
    if (!this.isValid) {
      return;
    }

    if (this.mode === 'user') {
      this.dialogRef.close({
        type: 'user',
        username: this.username.trim(),
        firstName: this.firstName.trim(),
        lastName: this.lastName.trim(),
        email: this.email.trim(),
        password: this.password,
        isAdmin: this.isAdmin
      });
      return;
    }

    if (this.mode === 'members') {
      // The group already exists: submit only users that were newly picked.
      this.dialogRef.close({
        type: 'group',
        groupName: this.group ? this.group.id.replace(/^GROUP_/, '') : this.groupName.trim(),
        initialMembers: this.newMembers.join(' ')
      });
      return;
    }

    this.dialogRef.close({
      type: 'group',
      groupName: this.groupName.trim(),
      initialMembers: this.selectedMembers.join(' ')
    });
  }
}
