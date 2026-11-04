import { Injectable } from '@angular/core';

export interface UiTheme {
  id: string;
  name: string;
  description: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  navBg: string;
  accent: string;
}

const STORAGE_KEY = 'adw-ui-theme';
const CUSTOM_COLOR_KEY = 'adw-ui-theme-color';
const CUSTOM_ID = 'custom';

export const UI_THEMES: readonly UiTheme[] = [
  {
    id: 'pttep-navy',
    name: 'PTTEP Navy',
    description: 'Default workspace palette',
    primary: '#1b1464',
    primaryDark: '#14104f',
    primaryLight: '#252878',
    navBg: '#e0f7fd',
    accent: '#00aeef'
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Deep blue with a bright accent',
    primary: '#0b3d91',
    primaryDark: '#072c6b',
    primaryLight: '#1d4fa8',
    navBg: '#e7f0ff',
    accent: '#3b82f6'
  },
  {
    id: 'teal',
    name: 'Teal',
    description: 'Calm teal across navigation and actions',
    primary: '#0f6e6b',
    primaryDark: '#0a524f',
    primaryLight: '#148f8b',
    navBg: '#e6f7f6',
    accent: '#14b8a6'
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Green palette for a quieter workspace',
    primary: '#1b5e3b',
    primaryDark: '#13462c',
    primaryLight: '#247a4e',
    navBg: '#e8f6ee',
    accent: '#22c55e'
  },
  {
    id: 'plum',
    name: 'Plum',
    description: 'Rich purple with a soft highlight',
    primary: '#5b2c6f',
    primaryDark: '#3f1e4d',
    primaryLight: '#7a3d94',
    navBg: '#f6eef9',
    accent: '#a855f7'
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Neutral charcoal with cool accents',
    primary: '#1f2937',
    primaryDark: '#111827',
    primaryLight: '#374151',
    navBg: '#eef2f7',
    accent: '#64748b'
  }
];

function themeById(id: string | null): UiTheme | undefined {
  return UI_THEMES.find((theme) => theme.id === id);
}

export function readUiThemeId(storage: Storage | undefined = safeStorage()): string {
  const stored = storage?.getItem(STORAGE_KEY) ?? null;
  if (stored === CUSTOM_ID && normalizeHex(storage?.getItem(CUSTOM_COLOR_KEY) ?? '')) {
    return CUSTOM_ID;
  }
  return themeById(stored)?.id ?? UI_THEMES[0].id;
}

export function readCustomThemeColor(storage: Storage | undefined = safeStorage()): string {
  return normalizeHex(storage?.getItem(CUSTOM_COLOR_KEY) ?? '') ?? UI_THEMES[0].primary;
}

/** Apply a saved theme before the first paint. */
export function applyStoredUiTheme(): string {
  const storage = safeStorage();
  const id = readUiThemeId(storage);
  if (id === CUSTOM_ID) {
    return applyCustomUiTheme(readCustomThemeColor(storage), { persist: false });
  }
  return applyUiTheme(id, { persist: false });
}

export function applyUiTheme(id: string, options: { persist?: boolean } = {}): string {
  const theme = themeById(id) ?? UI_THEMES[0];
  paintTheme(theme);
  if (options.persist !== false) {
    const storage = safeStorage();
    storage?.setItem(STORAGE_KEY, theme.id);
    storage?.removeItem(CUSTOM_COLOR_KEY);
  }
  return theme.id;
}

export function applyCustomUiTheme(hex: string, options: { persist?: boolean } = {}): string {
  const primary = normalizeHex(hex) ?? UI_THEMES[0].primary;
  paintTheme(deriveTheme(primary));
  if (options.persist !== false) {
    const storage = safeStorage();
    storage?.setItem(STORAGE_KEY, CUSTOM_ID);
    storage?.setItem(CUSTOM_COLOR_KEY, primary);
  }
  return CUSTOM_ID;
}

function paintTheme(theme: UiTheme): void {
  const root = typeof document !== 'undefined' ? document.documentElement : null;
  if (!root) {
    return;
  }
  const accentLight = mixHex(theme.accent, '#ffffff', 0.35);
  const accentMuted = mixHex(theme.accent, '#000000', 0.18);
  const vars: Record<string, string> = {
    '--adw-color-brand-primary': theme.primary,
    '--adw-color-brand-primary-dark': theme.primaryDark,
    '--adw-color-brand-primary-light': theme.primaryLight,
    '--adw-color-heading': theme.primary,
    '--adw-color-nav-active-bg': theme.navBg,
    '--adw-color-nav-active-text': theme.primary,
    '--adw-color-accent-sky': theme.accent,
    '--adw-color-accent-sky-light': accentLight,
    '--adw-color-accent-sky-muted': accentMuted,
    '--adw-glass-card-soft': theme.navBg,
    '--adw-glass-card-banner': `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryLight} 48%, ${theme.accent} 100%)`,
    '--adw-glass-row-bg': `color-mix(in srgb, ${theme.navBg} 70%, transparent)`,
    '--adw-glass-row-bg-hover': `color-mix(in srgb, ${theme.navBg} 88%, white)`,
    '--adw-glass-row-bg-active': theme.navBg,
    '--adw-glass-row-edge': `color-mix(in srgb, ${theme.primary} 14%, transparent)`,
    '--adw-glass-row-title': theme.primary,
    '--adw-glass-card-title': theme.primary,
    '--adw-glass-card-border': `color-mix(in srgb, ${theme.primary} 32%, transparent)`,
    '--adw-glass-card-bg': `color-mix(in srgb, ${theme.navBg} 50%, white)`,
    '--adw-sidenav-text': theme.primary,
    '--adw-sidenav-icon': theme.primary,
    '--adw-sidenav-bg': `color-mix(in srgb, ${theme.primary} 20%, white)`,
    '--epc-sidebar-bg-1': `color-mix(in srgb, ${theme.primary} 16%, white)`,
    '--epc-sidebar-bg-2': `color-mix(in srgb, ${theme.navBg} 80%, white)`,
    '--epc-text': theme.primary,
    '--epc-icon': theme.primary,
    '--epc-heading-muted': theme.primary,
    '--epc-accent': theme.accent,
    '--epc-active-bg': `color-mix(in srgb, ${theme.accent} 16%, transparent)`,
    '--epc-active-border': theme.accent,
    '--adw-card-title': theme.primary,
    '--adw-card-border': `color-mix(in srgb, ${theme.primary} 34%, #dbe4ee)`,
    '--adw-card-bg': `color-mix(in srgb, ${theme.navBg} 58%, white)`,
    '--adw-card-shadow': `0 8px 28px color-mix(in srgb, ${theme.primary} 14%, transparent)`,
    '--adw-page-wash': `color-mix(in srgb, ${theme.navBg} 72%, white)`,
    '--theme-primary-color': theme.primary,
    '--theme-accent-color': theme.accent,
    '--theme-focus-color': theme.accent,
    '--theme-blue-border-color': theme.primary,
    '--theme-sidenav-background-color': theme.primary
  };
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  root.dataset['adwTheme'] = theme.id;
}

function deriveTheme(primary: string): UiTheme {
  const { h, s, l } = hexToHsl(primary);
  return {
    id: CUSTOM_ID,
    name: 'Custom',
    description: 'Your chosen colour',
    primary,
    primaryDark: hslToHex(h, s, Math.max(8, l * 0.72)),
    primaryLight: hslToHex(h, Math.max(20, s - 8), Math.min(68, l + 14)),
    navBg: hslToHex(h, Math.min(s, 42), 94),
    accent: hslToHex(h, Math.min(90, s + 8), Math.min(58, Math.max(42, l + 18)))
  };
}

function normalizeHex(value: string): string | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return match ? `#${match[1].toLowerCase()}` : null;
}

function mixHex(source: string, target: string, amount: number): string {
  const a = hexToRgb(source);
  const b = hexToRgb(target);
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount
  });
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const channel = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) {
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
    } else if (max === gn) {
      h = (bn - rn) / d + 2;
    } else {
      h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const lig = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    [r, g, b] = [c, x, 0];
  } else if (hue < 120) {
    [r, g, b] = [x, c, 0];
  } else if (hue < 180) {
    [r, g, b] = [0, c, x];
  } else if (hue < 240) {
    [r, g, b] = [0, x, c];
  } else if (hue < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }
  return rgbToHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 });
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

@Injectable({ providedIn: 'root' })
export class UiThemeService {
  readonly themes = UI_THEMES;

  currentId(): string {
    return readUiThemeId();
  }

  currentColor(): string {
    const id = this.currentId();
    if (id === CUSTOM_ID) {
      return readCustomThemeColor();
    }
    return themeById(id)?.primary ?? UI_THEMES[0].primary;
  }

  apply(id: string): string {
    return applyUiTheme(id);
  }

  applyCustom(hex: string): string {
    return applyCustomUiTheme(hex);
  }
}
