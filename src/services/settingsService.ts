import { AppSettingsService } from './appSettingsService';
import type { SiteProofLanguage, SiteProofSettings } from '../types/settings';

const SETTINGS_KEY = 'siteproof_settings';

export function defaultUiLanguage(): SiteProofLanguage {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function createDefaultSettings(uiLanguage = defaultUiLanguage()): SiteProofSettings {
  return {
    uiLanguage,
    captureLanguage: uiLanguage,
    exportLanguage: 'en',
    cloudEnabled: false,
    cloudSyncStatus: 'off',
    stormModeEnabled: true,
  };
}

export class SettingsService {
  static async getSettings(): Promise<SiteProofSettings> {
    const defaults = createDefaultSettings();
    const saved = await AppSettingsService.getValue<Partial<SiteProofSettings>>(SETTINGS_KEY, {});
    return { ...defaults, ...saved };
  }

  static async saveSettings(settings: SiteProofSettings): Promise<void> {
    await AppSettingsService.setValue(SETTINGS_KEY, settings);
  }
}
