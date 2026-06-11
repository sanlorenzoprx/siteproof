import { CloudflareClient, type CloudUploadRequest, type CloudUploadResult } from './cloudflareClient';
import { SettingsService } from './settingsService';
import { LicenseService } from './licenseService';

export interface CloudSyncAttempt {
  state: 'local_only' | 'queued' | 'syncing' | 'synced' | 'error';
  result?: CloudUploadResult;
}

const CLOUD_DISABLED_MESSAGE = 'Cloud Proof Vault entitlement included. Local offline proof capture works now; cloud backup activates when your account backup is enabled.';
const CLOUD_PENDING_MESSAGE = 'Saved locally. Cloud Proof Vault will sync this proof when internet and account backup are available.';

function cloudVaultFlagEnabled(override?: boolean | null): boolean {
  if (override !== undefined && override !== null) return override;
  const env = (import.meta as ImportMeta & { env?: Record<string, string | boolean | undefined> }).env;
  return env?.VITE_SITEPROOF_CLOUD_VAULT_ENABLED === true || env?.VITE_SITEPROOF_CLOUD_VAULT_ENABLED === 'true';
}

export class CloudSyncService {
  private static cloudVaultUploadEnabledOverride: boolean | null = null;

  static setCloudVaultUploadEnabledOverride(value: boolean | null): void {
    this.cloudVaultUploadEnabledOverride = value;
  }

  static isCloudVaultUploadEnabled(): boolean {
    return cloudVaultFlagEnabled(this.cloudVaultUploadEnabledOverride);
  }

  static async upload(request: CloudUploadRequest, online = typeof navigator === 'undefined' ? true : navigator.onLine): Promise<CloudSyncAttempt> {
    const settings = await SettingsService.getSettings();
    if (!cloudVaultFlagEnabled(this.cloudVaultUploadEnabledOverride)) {
      await SettingsService.saveSettings({ ...settings, cloudSyncStatus: settings.cloudEnabled ? 'pending' : 'off' });
      return settings.cloudEnabled
        ? { state: 'queued', result: { success: false, error: CLOUD_PENDING_MESSAGE } }
        : { state: 'local_only', result: { success: false, error: CLOUD_DISABLED_MESSAGE } };
    }
    const license = await LicenseService.getLicenseState();
    if (!LicenseService.canUseCloudFeatures(license)) {
      await SettingsService.saveSettings({ ...settings, cloudSyncStatus: settings.cloudEnabled ? 'pending' : 'off' });
      return settings.cloudEnabled
        ? { state: 'queued', result: { success: false, error: CLOUD_PENDING_MESSAGE } }
        : { state: 'local_only', result: { success: false, error: 'Cloud Proof Vault is included with an active cloud entitlement.' } };
    }
    if (!settings.cloudEnabled) return { state: 'local_only', result: { success: false, error: CLOUD_DISABLED_MESSAGE } };
    if (!online) {
      await SettingsService.saveSettings({ ...settings, cloudSyncStatus: 'pending' });
      return { state: 'queued' };
    }

    await SettingsService.saveSettings({ ...settings, cloudSyncStatus: 'syncing' });
    const result = await CloudflareClient.upload({
      ...request,
      licenseId: request.licenseId ?? license.licenseId,
      companyId: request.companyId ?? license.customerEmail,
    });
    await SettingsService.saveSettings({ ...settings, cloudSyncStatus: result.success ? 'synced' : 'error' });
    return { state: result.success ? 'synced' : 'error', result };
  }
}
