import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { firstValueFrom } from 'rxjs';
import { AddWatermarkDialogComponent } from './add-watermark-dialog/add-watermark-dialog.component';
import {
  WatermarkTemplate,
  WatermarkTemplateKind,
  SettingsService
} from '../../services/settings.service';
import { UiTheme, UiThemeService } from '../../services/ui-theme.service';

type SubNavIcon =
  | 'user'
  | 'building'
  | 'envelope'
  | 'storage'
  | 'globe'
  | 'card'
  | 'lock'
  | 'key'
  | 'link'
  | 'watermark'
  | 'palette';

interface SubNavItem {
  key: string;
  label: string;
  icon: SubNavIcon;
}

interface OrgStat {
  label: string;
  value: string;
}

interface WatermarkListState {
  items: WatermarkTemplate[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
}

@Component({
  selector: 'acs-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTabsModule, MatDialogModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  private readonly settingsService = inject(SettingsService);
  private readonly dialog = inject(MatDialog);
  private readonly uiThemeService = inject(UiThemeService);

  readonly subNavItems: SubNavItem[] = [
    { key: 'profile', label: 'Profile', icon: 'user' },
    { key: 'organisation', label: 'Organisation', icon: 'building' },
    { key: 'email-smtp', label: 'Email & SMTP', icon: 'envelope' },
    { key: 'storage', label: 'Storage', icon: 'storage' },
    { key: 'custom-domain', label: 'Custom domain', icon: 'globe' },
    { key: 'billing', label: 'Billing & plan', icon: 'card' },
    { key: 'security', label: 'Security', icon: 'lock' },
    { key: 'api-keys', label: 'API keys', icon: 'key' },
    { key: 'webhooks', label: 'Webhooks', icon: 'link' },
    { key: 'watermark', label: 'Watermark', icon: 'watermark' },
    { key: 'ui-theme', label: 'UI Theme Change', icon: 'palette' }
  ];

  readonly orgStats: OrgStat[] = [
    { label: 'DOCUMENTS', value: '0' },
    { label: 'PROJECTS', value: '1' },
    { label: 'TEAM MEMBERS', value: '1' },
    { label: 'TRANSMITTALS', value: '0' }
  ];

  activeSection = 'profile';

  // Profile
  fullName = 'Raj';
  mobileNumber = '+91 98765 43210';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  saveSuccess = false;
  passwordSuccess = false;

  // Organisation
  orgName = 'bhavath';
  customDomainOrg = '';
  orgSaveSuccess = false;

  // Email & SMTP
  emailProvider: 'epcdoc' | 'own' = 'epcdoc';
  emailSaveSuccess = false;

  // Storage
  storageProvider: 'epcdoc' | 's3' | 'azure' | 'onprem' = 'epcdoc';
  storageSaveSuccess = false;

  // Custom domain
  customDomain = '';
  domainSaveSuccess = false;

  // Security
  secCurrentPassword = '';
  secNewPassword = '';
  secConfirmPassword = '';
  secPasswordSuccess = false;

  // Watermark
  watermarkTabIndex = 0;
  readonly watermarkTabs = [
    { kind: 'text' as const, label: 'Text Watermark', heading: 'Text watermark', sub: 'Templates from Watermark Templates / Text' },
    { kind: 'image' as const, label: 'Image Watermark', heading: 'Image watermark', sub: 'Templates from Watermark Templates / Images' }
  ];
  readonly watermarkLists: Record<WatermarkTemplateKind, WatermarkListState> = {
    text: { items: [], loading: false, error: null, loaded: false },
    image: { items: [], loading: false, error: null, loaded: false }
  };

  readonly uiThemes: readonly UiTheme[] = this.uiThemeService.themes;
  selectedThemeId = this.uiThemeService.currentId();
  customThemeColor = this.uiThemeService.currentColor();
  themeApplied = false;

  get activeLabel(): string {
    return this.subNavItems.find((i) => i.key === this.activeSection)?.label ?? '';
  }

  setSection(key: string): void {
    this.activeSection = key;
    if (key === 'watermark') {
      void this.loadWatermarkTemplates(this.watermarkTabs[this.watermarkTabIndex]?.kind ?? 'text');
    }
  }

  handleSaveChanges(): void {
    this.flash('saveSuccess');
  }

  handleChangePassword(): void {
    if (this.newPassword && this.newPassword === this.confirmPassword) {
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
      this.flash('passwordSuccess');
    }
  }

  handleOrgSave(): void {
    this.flash('orgSaveSuccess');
  }

  handleEmailSave(): void {
    this.flash('emailSaveSuccess');
  }

  handleStorageSave(): void {
    this.flash('storageSaveSuccess');
  }

  handleDomainSave(): void {
    this.flash('domainSaveSuccess');
  }

  selectTheme(id: string): void {
    this.selectedThemeId = this.uiThemeService.apply(id);
    this.customThemeColor = this.uiThemeService.currentColor();
    this.flash('themeApplied');
  }

  previewCustomTheme(hex: string): void {
    this.customThemeColor = hex;
    this.selectedThemeId = this.uiThemeService.applyCustom(hex);
  }

  commitCustomTheme(): void {
    this.flash('themeApplied');
  }

  handleSecChangePassword(): void {
    if (this.secNewPassword && this.secNewPassword === this.secConfirmPassword) {
      this.secCurrentPassword = '';
      this.secNewPassword = '';
      this.secConfirmPassword = '';
      this.flash('secPasswordSuccess');
    }
  }

  onWatermarkTabChange(index: number): void {
    this.watermarkTabIndex = index;
    void this.loadWatermarkTemplates(this.watermarkTabs[index]?.kind ?? 'text');
  }

  async openAddWatermarkDialog(): Promise<void> {
    const ref = this.dialog.open(AddWatermarkDialogComponent, {
      width: '520px',
      autoFocus: false,
      panelClass: 'adw-add-watermark-dialog-panel'
    });
    const kind = await firstValueFrom(ref.afterClosed());
    if (kind === 'text' || kind === 'image') {
      this.watermarkTabIndex = kind === 'image' ? 1 : 0;
      await this.loadWatermarkTemplates(kind, true);
    }
  }

  private async loadWatermarkTemplates(kind: WatermarkTemplateKind, force = false): Promise<void> {
    const state = this.watermarkLists[kind];
    if (force) {
      state.loaded = false;
    }
    if (state.loaded || state.loading) {
      return;
    }
    state.loading = true;
    state.error = null;
    try {
      state.items = await this.settingsService.listTemplates(kind);
      state.loaded = true;
    } catch {
      state.items = [];
      state.error = `Failed to load ${kind} watermarks.`;
    } finally {
      state.loading = false;
    }
  }

  trackByKey(_index: number, item: SubNavItem): string {
    return item.key;
  }

  trackByLabel(_index: number, item: OrgStat): string {
    return item.label;
  }

  trackByTheme(_index: number, item: UiTheme): string {
    return item.id;
  }

  private flash(flag: 'saveSuccess' | 'passwordSuccess' | 'orgSaveSuccess' | 'emailSaveSuccess' | 'storageSaveSuccess' | 'domainSaveSuccess' | 'secPasswordSuccess' | 'themeApplied'): void {
    this[flag] = true;
    setTimeout(() => (this[flag] = false), 2500);
  }
}
