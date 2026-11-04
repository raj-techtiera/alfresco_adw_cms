import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface BusinessUnitPropertyRow {
  key: string;
  label: string;
  value: string;
}

export interface BusinessUnitGroupRow {
  name: string;
  role: string;
}

export interface BusinessUnitPropertiesDialogData {
  title: string;
  nodeId: string;
  nodeType?: string;
  createdAt?: string | null;
  modifiedAt?: string | null;
  createdBy?: string;
  modifiedBy?: string;
  rows: BusinessUnitPropertyRow[];
  /** Raw Alfresco properties — used to parse business unit groups. */
  properties?: Record<string, unknown>;
}

type DetailTabId = 'basic' | 'business' | 'groups';

interface DetailTab {
  id: DetailTabId;
  title: string;
  icon: string;
}

@Component({
  standalone: true,
  selector: 'adw-business-unit-properties-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './business-unit-properties-dialog.component.html',
  styleUrl: './business-unit-properties-dialog.component.scss'
})
export class BusinessUnitPropertiesDialogComponent implements OnInit {
  readonly data = inject<BusinessUnitPropertiesDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<BusinessUnitPropertiesDialogComponent>);

  readonly tabs: DetailTab[] = [
    { id: 'basic', title: 'Basic Details', icon: 'bookmark' },
    { id: 'business', title: 'Business information', icon: 'business_center' },
    { id: 'groups', title: 'Business Groups', icon: 'group' }
  ];

  activeTab: DetailTabId = 'basic';
  businessRows: BusinessUnitPropertyRow[] = [];
  groupRows: BusinessUnitGroupRow[] = [];

  ngOnInit(): void {
    this.businessRows = (this.data.rows || []).filter((r) => !this.isGroupsPropertyKey(r.key));
    this.groupRows = this.parseGroupRows(this.data.properties || {});
  }

  get humanNodeType(): string {
    const raw = (this.data.nodeType || '').trim();
    if (!raw) {
      return '';
    }
    const known: Record<string, string> = {
      'edms:businessUnit': 'Business Unit',
      'cm:folder': 'Folder',
      'cm:content': 'Content'
    };
    if (known[raw]) {
      return known[raw];
    }
    const withoutNs = raw.replace(/^[a-zA-Z0-9]+:/, '');
    const spaced = withoutNs
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .trim();
    if (!spaced) {
      return raw;
    }
    return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  selectTab(id: DetailTabId): void {
    this.activeTab = id;
  }

  close(): void {
    this.dialogRef.close();
  }

  private isGroupsPropertyKey(key: string): boolean {
    const n = key
      .replace(/^[a-zA-Z0-9]+:/, '')
      .replace(/[_-]+/g, '')
      .toLowerCase();
    return (
      n === 'businessunitgroups' ||
      n === 'businessgroups' ||
      n === 'businessunitgroup' ||
      n === 'groups'
    );
  }

  private parseGroupRows(properties: Record<string, unknown>): BusinessUnitGroupRow[] {
    const raw = this.findGroupsRaw(properties);
    if (raw == null || raw === '') {
      return [];
    }

    let parsed: unknown = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return null;
        }
        const obj = item as Record<string, unknown>;
        const name = String(obj['name'] ?? obj['group'] ?? obj['groupName'] ?? '').trim();
        const role = String(obj['role'] ?? obj['permission'] ?? obj['authority'] ?? '').trim();
        if (!name && !role) {
          return null;
        }
        return { name: name || '—', role: role || '—' };
      })
      .filter((r): r is BusinessUnitGroupRow => r != null);
  }

  private findGroupsRaw(source: Record<string, unknown>): unknown {
    const directKeys = [
      'edms:business_unit_groups',
      'edms:businessUnitGroups',
      'edms:business_groups',
      'edms:businessGroups',
      'tt:business_unit_groups',
      'business_unit_groups',
      'businessUnitGroups'
    ];
    for (const key of directKeys) {
      if (source[key] != null && source[key] !== '') {
        return source[key];
      }
    }
    for (const [key, value] of Object.entries(source)) {
      if (this.isGroupsPropertyKey(key) && value != null && value !== '') {
        return value;
      }
    }
    return undefined;
  }
}
