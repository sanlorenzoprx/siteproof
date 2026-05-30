export type SiteProofLanguage = 'en' | 'es';
export type CloudSyncStatus = 'off' | 'pending' | 'syncing' | 'synced' | 'error';
export type SiteProofUxMode = 'simple' | 'advanced';
export type SiteProofThemeMode = 'light' | 'dark' | 'system';
export type SiteProofTextSize = 'small' | 'normal' | 'large' | 'xl' | 'xxl';
export type SiteProofHintMode = 'guided' | 'minimal';

export interface SiteProofSettings {
  uiLanguage: SiteProofLanguage;
  captureLanguage: SiteProofLanguage;
  exportLanguage: SiteProofLanguage;
  uxMode: SiteProofUxMode;
  themeMode: SiteProofThemeMode;
  textSize: SiteProofTextSize;
  voiceHelpEnabled: boolean;
  hintMode: SiteProofHintMode;
  alwaysShowProofHints: boolean;
  cloudEnabled: boolean;
  cloudSyncStatus: CloudSyncStatus;
  stormModeEnabled: boolean;
}
