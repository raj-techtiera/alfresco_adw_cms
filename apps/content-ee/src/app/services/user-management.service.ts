import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthenticationService } from '@alfresco/adf-core';
import { firstValueFrom } from 'rxjs';

const PEOPLE_API_URL = '/alfresco/api/-default-/public/alfresco/versions/1/people';
const GROUPS_API_URL = '/alfresco/api/-default-/public/alfresco/versions/1/groups';
const SITES_API_URL = '/alfresco/api/-default-/public/alfresco/versions/1/sites';
const PROCESS_INSTANCES_URL = '/activiti-app/api/enterprise/process-instances';
const CREATE_USERS_PROCESS_KEY = 'EDMS-Create-Users';
const CREATE_GROUPS_PROCESS_KEY = 'EDMS-Create-Groups';

export interface ManagedUser {
  id: string;
  displayName: string;
  email?: string;
  jobTitle?: string;
  location?: string;
  enabled: boolean;
  organization?: string;
  firstName?: string;
  lastName?: string;
  description?: string;
  mobile?: string;
  telephone?: string;
  skypeId?: string;
  googleId?: string;
  instantMessageId?: string;
  userStatus?: string;
  statusUpdatedAt?: string;
  emailNotificationsEnabled?: boolean;
  company?: {
    organization?: string;
    address1?: string;
    address2?: string;
    address3?: string;
    postcode?: string;
    telephone?: string;
    fax?: string;
    email?: string;
  };
}

export interface ManagedGroup {
  id: string;
  displayName: string;
  isRoot: boolean;
  /** Present when loaded from site group-members. */
  role?: string;
}

export interface GroupMember {
  id: string;
  displayName: string;
}

export interface PagedResult<T> {
  items: T[];
  totalItems: number;
}

export interface CreateUserInput {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  isAdmin: boolean;
}

export interface CreateGroupInput {
  groupName: string;
  /** Space-separated usernames, e.g. "lastuser-01 lastuser-02". */
  initialMembers: string;
}

export interface SiteGroupMembershipBody {
  role: string;
  id: string;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthenticationService
  ) {}

  async getUsers(skipCount = 0, maxItems = 100): Promise<PagedResult<ManagedUser>> {
    const url = `${PEOPLE_API_URL}?skipCount=${skipCount}&maxItems=${maxItems}`;
    const response = await this.getJson(url);
    const entries: any[] = response?.list?.entries ?? [];
    return {
      items: entries.map((item) => this.mapUser(item?.entry)).filter((user): user is ManagedUser => !!user),
      totalItems: response?.list?.pagination?.totalItems ?? entries.length
    };
  }

  /** Full person record from `GET /people/{personId}`. */
  async getUser(personId: string): Promise<ManagedUser> {
    const id = (personId || '').trim();
    if (!id) {
      throw new Error('Person id is required.');
    }
    const url = `${PEOPLE_API_URL}/${encodeURIComponent(id)}`;
    const response = await this.getJson(url);
    const user = this.mapUser(response?.entry ?? response);
    if (!user) {
      throw new Error('User not found.');
    }
    return user;
  }

  async getGroups(skipCount = 0, maxItems = 100): Promise<PagedResult<ManagedGroup>> {
    const url = `${GROUPS_API_URL}?skipCount=${skipCount}&maxItems=${maxItems}`;
    const response = await this.getJson(url);
    const entries: any[] = response?.list?.entries ?? [];
    return {
      items: entries.map((item) => this.mapGroup(item?.entry)).filter((group): group is ManagedGroup => !!group),
      totalItems: response?.list?.pagination?.totalItems ?? entries.length
    };
  }

  /**
   * Groups that are members of an Alfresco site (`GET /sites/{siteId}/group-members`).
   * Used by Create Project → Group permission dropdown.
   */
  async getSiteGroupMembers(siteId: string, skipCount = 0, maxItems = 100): Promise<PagedResult<ManagedGroup>> {
    const id = (siteId || '').trim();
    if (!id) {
      return { items: [], totalItems: 0 };
    }
    const url = `${SITES_API_URL}/${encodeURIComponent(id)}/group-members?skipCount=${skipCount}&maxItems=${maxItems}`;
    const response = await this.getJson(url);
    const entries: any[] = response?.list?.entries ?? [];
    return {
      items: entries
        .map((item) => this.mapSiteGroupMember(item?.entry))
        .filter((group): group is ManagedGroup => !!group),
      totalItems: response?.list?.pagination?.totalItems ?? entries.length
    };
  }

  /** Returns the people that are members of the group. */
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const pageSize = 50;
    const members: GroupMember[] = [];
    let skipCount = 0;
    let hasMoreItems = true;

    while (hasMoreItems) {
      const url = `${GROUPS_API_URL}/${encodeURIComponent(groupId)}/members?maxItems=${pageSize}&skipCount=${skipCount}`;
      const response = await this.getJson(url);
      const entries: any[] = response?.list?.entries ?? [];
      members.push(
        ...entries
          .map((item) => item?.entry)
          .filter((entry) => entry?.memberType === 'PERSON' && entry?.id)
          .map((entry) => ({ id: entry.id as string, displayName: (entry.displayName as string) || (entry.id as string) }))
      );
      hasMoreItems = response?.list?.pagination?.hasMoreItems === true && entries.length > 0;
      skipCount += entries.length;
    }

    return members;
  }

  /** Returns the usernames of people that are already members of the group. */
  async getGroupMemberIds(groupId: string): Promise<string[]> {
    return (await this.getGroupMembers(groupId)).map((member) => member.id);
  }

  /**
   * Add group memberships to a site.
   * Body entries: `{ "role": "SiteCollaborator", "id": "GROUP_xxx" }`.
   * Posts each membership to `POST /sites/{siteId}/group-members`.
   */
  async addSiteGroupMembers(siteId: string, members: SiteGroupMembershipBody[]): Promise<void> {
    const id = (siteId || '').trim();
    if (!id) {
      throw new Error('Site id is required.');
    }
    const payload = (members || [])
      .map((m) => ({
        role: String(m?.role ?? '').trim(),
        id: String(m?.id ?? '').trim()
      }))
      .filter((m) => m.role && m.id);
    if (!payload.length) {
      throw new Error('At least one group membership is required.');
    }

    const url = `${SITES_API_URL}/${encodeURIComponent(id)}/group-members`;
    // Body: [{ "role": "SiteCollaborator", "id": "GROUP_..." }, ...]
    await this.postJson(url, payload);
  }

  /** Starts the EDMS-Create-Users Activiti process. */
  createUser(input: CreateUserInput): Promise<void> {
    return this.startProcess(CREATE_USERS_PROCESS_KEY, 'Create User', [
      { name: 'username', value: input.username },
      { name: 'firstName', value: input.firstName },
      { name: 'lastName', value: input.lastName },
      { name: 'email', value: input.email },
      { name: 'password', value: input.password },
      { name: 'isAdmin', value: input.isAdmin }
    ]);
  }

  /** Starts the EDMS-Create-Groups Activiti process. */
  createGroup(input: CreateGroupInput): Promise<void> {
    return this.startProcess(CREATE_GROUPS_PROCESS_KEY, 'Create Group', [
      { name: 'groupName', value: input.groupName },
      { name: 'initialMembers', value: input.initialMembers }
    ]);
  }

  private async startProcess(
    processDefinitionKey: string,
    name: string,
    variables: { name: string; value: string | boolean }[]
  ): Promise<void> {
    const payload = {
      processDefinitionKey,
      name,
      businessKey: processDefinitionKey,
      variables
    };
    const headers = await firstValueFrom(
      this.authService.addTokenToHeader(
        PROCESS_INSTANCES_URL,
        new HttpHeaders({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
    );
    await firstValueFrom(this.http.post(PROCESS_INSTANCES_URL, payload, { headers }));
  }

  private async getJson(url: string): Promise<any> {
    const headers = await firstValueFrom(
      this.authService.addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
    );
    return firstValueFrom(this.http.get<any>(url, { headers }));
  }

  private async postJson(url: string, body: unknown): Promise<any> {
    const headers = await firstValueFrom(
      this.authService.addTokenToHeader(
        url,
        new HttpHeaders({
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          Pragma: 'no-cache'
        })
      )
    );
    return firstValueFrom(this.http.post<any>(url, body, { headers }));
  }

  private mapUser(entry: any): ManagedUser | null {
    if (!entry?.id) {
      return null;
    }
    const rawCompany = entry.company && typeof entry.company === 'object' ? entry.company : undefined;
    const company = this.mapCompany(rawCompany);
    const displayName =
      entry.displayName?.trim() || [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim() || entry.id;
    return {
      id: entry.id,
      displayName,
      email: entry.email || undefined,
      jobTitle: entry.jobTitle || undefined,
      location: entry.location || undefined,
      enabled: entry.enabled !== false,
      organization: company?.organization || undefined,
      firstName: entry.firstName || undefined,
      lastName: entry.lastName || undefined,
      description: entry.description || undefined,
      mobile: entry.mobile || undefined,
      telephone: entry.telephone || undefined,
      skypeId: entry.skypeId || undefined,
      googleId: entry.googleId || undefined,
      instantMessageId: entry.instantMessageId || undefined,
      userStatus: entry.userStatus || undefined,
      statusUpdatedAt: entry.statusUpdatedAt || undefined,
      emailNotificationsEnabled:
        typeof entry.emailNotificationsEnabled === 'boolean' ? entry.emailNotificationsEnabled : undefined,
      company
    };
  }

  private mapCompany(company: any): ManagedUser['company'] | undefined {
    if (!company || typeof company !== 'object') {
      return undefined;
    }
    const mapped = {
      organization: (company.organization as string) || undefined,
      address1: (company.address1 as string) || undefined,
      address2: (company.address2 as string) || undefined,
      address3: (company.address3 as string) || undefined,
      postcode: (company.postcode as string) || undefined,
      telephone: (company.telephone as string) || undefined,
      fax: (company.fax as string) || undefined,
      email: (company.email as string) || undefined
    };
    return Object.values(mapped).some((value) => !!value) ? mapped : undefined;
  }

  private mapGroup(entry: any): ManagedGroup | null {
    if (!entry?.id) {
      return null;
    }
    return {
      id: entry.id,
      displayName: entry.displayName || entry.id,
      isRoot: entry.isRoot === true
    };
  }

  private mapSiteGroupMember(entry: any): ManagedGroup | null {
    if (!entry?.id) {
      return null;
    }
    const id = String(entry.id);
    const displayName =
      (typeof entry.displayName === 'string' && entry.displayName.trim()) ||
      id.replace(/^GROUP_/, '');
    const role = typeof entry.role === 'string' && entry.role.trim() ? entry.role.trim() : undefined;
    return {
      id,
      displayName,
      isRoot: false,
      role
    };
  }
}
