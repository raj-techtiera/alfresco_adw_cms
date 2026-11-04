import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandingTab, ThemeOption, ThemeOptionDef } from '../../interface/branding';

@Component({
  selector: 'acs-branding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './branding.component.html',
  styleUrl: './branding.component.scss'
})
export class BrandingComponent {
  activeTab: BrandingTab = 'company';

  displayName = 'bhavath';
  customDomain = 'docs.yourfirm.com';
  showPoweredBy = true;
  primaryColour = '#f59c0b';
  accentColour = '#60a5fa';
  selectedTheme: ThemeOption = 'light';
  logoLight: string | null = null;
  logoDark: string | null = null;

  readonly themeOptions: ThemeOptionDef[] = [
    { key: 'light', emoji: '☀️', label: 'Light', desc: 'White background, dark text' },
    { key: 'dark', emoji: '🌙', label: 'Dark', desc: 'Dark background, light text' },
    { key: 'auto', emoji: '💻', label: 'Auto', desc: 'Follows your OS/browser setting' }
  ];

  setTab(tab: BrandingTab): void {
    this.activeTab = tab;
  }

  togglePoweredBy(): void {
    this.showPoweredBy = !this.showPoweredBy;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onLogoDrop(event: DragEvent, target: 'light' | 'dark'): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.setLogo(target, URL.createObjectURL(file));
    }
  }

  onLogoInput(event: Event, target: 'light' | 'dark'): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.setLogo(target, URL.createObjectURL(file));
    }
  }

  trackByKey(_index: number, item: ThemeOptionDef): string {
    return item.key;
  }

  private setLogo(target: 'light' | 'dark', url: string): void {
    if (target === 'light') {
      this.logoLight = url;
    } else {
      this.logoDark = url;
    }
  }
}
