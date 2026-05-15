export type SiteProofLanguage = 'en' | 'es';
export type CloudSyncStatus = 'off' | 'pending' | 'syncing' | 'synced' | 'error';

export interface SiteProofSettings {
  uiLanguage: SiteProofLanguage;
  captureLanguage: SiteProofLanguage;
  exportLanguage: SiteProofLanguage;
  cloudEnabled: boolean;
  cloudSyncStatus: CloudSyncStatus;
  stormModeEnabled: boolean;
}
