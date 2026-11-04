import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  GroupMember,
  ManagedGroup,
  ManagedUser,
  UserManagementService
} from '../../../services/user-management.service';
import {
  GroupDialogResult,
  ManagementDialogData,
  UserDialogResult,
  UserManagementDialogComponent
} from '../user-management-dialog/User-Management-dialog.component';
import {
  AddSiteMemberDialogComponent,
  AddSiteMemberDialogData
} from '../add-site-member-dialog/add-site-member-dialog.component';
import { UserDetailsDialogComponent, UserDetailsDialogData } from '../user-details-dialog/user-details-dialog.component';

@Component({
  selector: 'acs-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule
  ],
  templateUrl: './User-Management.component.html',
  styleUrl: './User-Management.component.scss'
})
export class UserManagementComponent implements OnInit {
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly userManagementService = inject(UserManagementService);

  readonly userColumns = ['user', 'id', 'email', 'jobTitle', 'location', 'status', 'actions'];
  readonly groupColumns = ['displayName', 'id', 'isRoot', 'actions'];
  readonly siteMemberColumns = ['displayName', 'id', 'role', 'actions'];

  users: ManagedUser[] = [];
  groups: ManagedGroup[] = [];
  siteMembers: ManagedGroup[] = [];
  userTotal = 0;
  groupTotal = 0;
  siteMemberTotal = 0;
  usersLoading = false;
  groupsLoading = false;
  siteMembersLoading = false;
  usersError = '';
  groupsError = '';
  siteMembersError = '';

  activeTab = 0;
  search = '';
  userFilter: 'all' | 'active' = 'all';
  groupSearch = '';
  siteMemberSearch = '';

  selectedGroup: ManagedGroup | null = null;
  groupMembers: GroupMember[] = [];
  groupMembersLoading = false;
  groupMembersError = '';

  /** Site Members tab: show users panel for a site group (no Add Users). */
  selectedSiteGroup: ManagedGroup | null = null;
  siteGroupMembers: GroupMember[] = [];
  siteGroupMembersLoading = false;
  siteGroupMembersError = '';

  readonly pageSizeOptions: number[] = [10, 20, 50, 100];
  userPageSize = 20;
  userPageIndex = 0;
  groupPageSize = 20;
  groupPageIndex = 0;
  siteMemberPageSize = 20;
  siteMemberPageIndex = 0;

  get edmsCentralSiteId(): string {
    return 'DMS';
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadGroups();
    this.loadSiteMembers();
  }

  async loadUsers(): Promise<void> {
    this.usersLoading = true;
    this.usersError = '';
    try {
      const result = await this.userManagementService.getUsers(this.userPageIndex * this.userPageSize, this.userPageSize);
      this.users = result.items;
      this.userTotal = result.totalItems;
    } catch {
      this.usersError = 'Failed to load users. Please try again.';
    } finally {
      this.usersLoading = false;
    }
  }

  async loadGroups(): Promise<void> {
    this.groupsLoading = true;
    this.groupsError = '';
    try {
      const result = await this.userManagementService.getGroups(this.groupPageIndex * this.groupPageSize, this.groupPageSize);
      this.groups = result.items;
      this.groupTotal = result.totalItems;
    } catch {
      this.groupsError = 'Failed to load groups. Please try again.';
    } finally {
      this.groupsLoading = false;
    }
  }

  async loadSiteMembers(): Promise<void> {
    this.siteMembersLoading = true;
    this.siteMembersError = '';
    try {
      const result = await this.userManagementService.getSiteGroupMembers(
        this.edmsCentralSiteId,
        this.siteMemberPageIndex * this.siteMemberPageSize,
        this.siteMemberPageSize
      );
      this.siteMembers = result.items;
      this.siteMemberTotal = result.totalItems;
    } catch {
      this.siteMembersError = 'Failed to load site members. Please try again.';
      this.siteMembers = [];
      this.siteMemberTotal = 0;
    } finally {
      this.siteMembersLoading = false;
    }
  }

  onUserPageChange(event: PageEvent): void {
    this.userPageSize = event.pageSize;
    this.userPageIndex = event.pageIndex;
    this.loadUsers();
  }

  onGroupPageChange(event: PageEvent): void {
    this.groupPageSize = event.pageSize;
    this.groupPageIndex = event.pageIndex;
    this.loadGroups();
  }

  onSiteMemberPageChange(event: PageEvent): void {
    this.siteMemberPageSize = event.pageSize;
    this.siteMemberPageIndex = event.pageIndex;
    this.loadSiteMembers();
  }

  openUserDetails(user: ManagedUser): void {
    const data: UserDetailsDialogData = {
      userId: user.id,
      preview: user
    };
    this.dialog.open(UserDetailsDialogComponent, {
      data,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      panelClass: 'user-details-dialog-panel',
      width: 'min(680px, calc(100vw - 32px))'
    });
  }

  openAddSiteMemberDialog(): void {
    const siteId = this.edmsCentralSiteId;
    if (!siteId) {
      this.snackBar.open('EDMS central site id is not configured.', 'Dismiss', { duration: 5000 });
      return;
    }

    const data: AddSiteMemberDialogData = {
      siteId,
      siteLabel: siteId
    };

    this.dialog
      .open(AddSiteMemberDialogComponent, {
        data,
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        panelClass: 'add-site-member-dialog-panel',
        width: 'min(960px, calc(100vw - 32px))'
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.members?.length) {
          this.snackBar.open('Site members added successfully.', 'OK', { duration: 4000 });
          this.siteMemberPageIndex = 0;
          void this.loadSiteMembers();
        }
      });
  }

  async showGroupMembers(group: ManagedGroup): Promise<void> {
    this.selectedGroup = group;
    this.groupMembersLoading = true;
    this.groupMembersError = '';
    this.groupMembers = [];
    try {
      const members = await this.userManagementService.getGroupMembers(group.id);
      // Ignore the response if another group was opened meanwhile.
      if (this.selectedGroup?.id === group.id) {
        this.groupMembers = members.sort((a, b) => a.displayName.localeCompare(b.displayName));
      }
    } catch {
      if (this.selectedGroup?.id === group.id) {
        this.groupMembersError = 'Failed to load users for this group.';
      }
    } finally {
      if (this.selectedGroup?.id === group.id) {
        this.groupMembersLoading = false;
      }
    }
  }

  closeGroupMembers(): void {
    this.selectedGroup = null;
    this.groupMembers = [];
    this.groupMembersError = '';
  }

  async showSiteGroupMembers(group: ManagedGroup): Promise<void> {
    this.selectedSiteGroup = group;
    this.siteGroupMembersLoading = true;
    this.siteGroupMembersError = '';
    this.siteGroupMembers = [];
    try {
      const members = await this.userManagementService.getGroupMembers(group.id);
      if (this.selectedSiteGroup?.id === group.id) {
        this.siteGroupMembers = members.sort((a, b) => a.displayName.localeCompare(b.displayName));
      }
    } catch {
      if (this.selectedSiteGroup?.id === group.id) {
        this.siteGroupMembersError = 'Failed to load users for this group.';
      }
    } finally {
      if (this.selectedSiteGroup?.id === group.id) {
        this.siteGroupMembersLoading = false;
      }
    }
  }

  closeSiteGroupMembers(): void {
    this.selectedSiteGroup = null;
    this.siteGroupMembers = [];
    this.siteGroupMembersError = '';
  }

  openCreateDialog(mode: 'user' | 'group'): void {
    this.openDialog({ mode });
  }

  openAddMembersDialog(group: ManagedGroup): void {
    this.openDialog({ mode: 'members', group }, `Adding users to ${group.displayName} started. The list will refresh shortly.`);
  }

  private openDialog(data: ManagementDialogData, successMessage?: string): void {
    this.dialog
      .open<UserManagementDialogComponent, ManagementDialogData, UserDialogResult | GroupDialogResult>(UserManagementDialogComponent, {
        data,
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        panelClass: 'user-management-dialog'
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) {
          this.create(result, successMessage);
        }
      });
  }

  private async create(result: UserDialogResult | GroupDialogResult, successMessage?: string): Promise<void> {
    const label = result.type === 'user' ? 'User' : 'Group';
    try {
      if (result.type === 'user') {
        const { type: _type, ...input } = result;
        await this.userManagementService.createUser(input);
      } else {
        const { type: _type, ...input } = result;
        await this.userManagementService.createGroup(input);
      }
      this.snackBar.open(successMessage ?? `${label} creation started. The list will refresh shortly.`, 'OK', { duration: 5000 });
      // The Activiti process provisions asynchronously; give it a moment before refreshing.
      setTimeout(() => (result.type === 'user' ? this.loadUsers() : this.loadGroups()), 4000);
    } catch {
      this.snackBar.open(`Failed to start ${label.toLowerCase()} creation. Please try again.`, 'Dismiss', { duration: 6000 });
    }
  }

  get activeCount(): number {
    return this.users.filter((user) => user.enabled).length;
  }

  get disabledCount(): number {
    return this.users.length - this.activeCount;
  }

  get rootGroupCount(): number {
    return this.groups.filter((group) => group.isRoot).length;
  }

  get filteredUsers(): ManagedUser[] {
    const query = this.search.trim().toLowerCase();
    return this.users.filter((user) => {
      const matchesStatus = this.userFilter === 'all' || user.enabled;
      const values = [user.displayName, user.id, user.email, user.jobTitle, user.location];
      return matchesStatus && (!query || values.some((value) => value?.toLowerCase().includes(query)));
    });
  }

  get filteredGroups(): ManagedGroup[] {
    const query = this.groupSearch.trim().toLowerCase();
    return this.groups.filter((group) => !query || group.displayName.toLowerCase().includes(query) || group.id.toLowerCase().includes(query));
  }

  get filteredSiteMembers(): ManagedGroup[] {
    const query = this.siteMemberSearch.trim().toLowerCase();
    return this.siteMembers.filter(
      (member) =>
        !query ||
        member.displayName.toLowerCase().includes(query) ||
        member.id.toLowerCase().includes(query) ||
        (member.role ?? '').toLowerCase().includes(query)
    );
  }

  formatSiteRole(role?: string): string {
    if (!role) {
      return '—';
    }
    return role
      .replace(/^Site/, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim() || role;
  }

  initials(name: string): string {
    const parts = name.trim().split(/\s+/);
    return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)).toUpperCase();
  }

  avatarColor(id: string): string {
    const colors = ['#0056b3', '#9b2d6f', '#d97706', '#0f766e', '#7c3aed', '#dc2626', '#0891b2', '#65a30d', '#ea580c', '#6d28d9'];
    const hash = [...id].reduce((value, character) => character.charCodeAt(0) + ((value << 5) - value), 0);
    return colors[Math.abs(hash) % colors.length];
  }
}
