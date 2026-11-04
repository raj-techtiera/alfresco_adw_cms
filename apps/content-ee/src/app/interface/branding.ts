export type BrandingTab = 'company' | 'theme';
export type ThemeOption = 'light' | 'dark' | 'auto';

export interface ThemeOptionDef {
  key: ThemeOption;
  emoji: string;
  label: string;
  desc: string;
}
