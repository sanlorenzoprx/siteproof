import { CloudflareClient, type CloudUploadRequest, type CloudUploadResult } from './cloudflareClient';
import { SettingsService } from './settingsService';

export interface CloudSyncAttempt {
  state: 'local_only' | 'queued' | 'syncing' | 'synced' | 'error';
  result?: CloudUploadResult;
}

export class CloudSyncService {
  static async upload(request: CloudUploadRequest, online = typeof navigator === 'undefined' ? true : navigator.onLine): Promise<CloudSyncAttempt> {
    const settings = await SettingsService.getSettings();
    if (!settings.cloudEnabled) return { state: 'local_only' };
    if (!online) {
      await SettingsService.saveSettings({ ...settings, cloudSyncStatus: 'pending' });
      return { state: 'queued' };
    }

    await SettingsService.saveSettings({ ...settings, cloudSyncStatus: 'syncing' });
    const result = await CloudflareClient.upload(request);
    await SettingsService.saveSettings({ ...settings, cloudSyncStatus: result.success ? 'synced' : 'error' });
    return { state: result.success ? 'synced' : 'error', result };
  }
}
