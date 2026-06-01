import { Job, JobPhoto, VoiceNote, BusinessProfile, UserProfile } from '../domain/models';
import { SyncOperation } from '../db/schema';
import { AppSettingsService } from './appSettingsService';
import { sanitizeSyncOperation } from './sync/payloadWhitelist';

export interface SyncPayload {
  jobs: Job[];
  photos: JobPhoto[];
  voiceNotes: VoiceNote[];
  businessProfile?: BusinessProfile | null;
  userProfile?: UserProfile | null;
  runtimeOperations?: SyncOperation[];
}

interface CloudConfiguration {
  url: string;
  key: string;
}

const CLOUD_CONFIG_KEY = 'cloud_configuration';
const EMPTY_CLOUD_CONFIG: CloudConfiguration = { url: '', key: '' };

/**
 * Cloud sync adapter.
 *
 * Configuration is cached in memory for synchronous UI status reads, but the
 * durable source is the canonical app_settings repository. This removes direct
 * browser-storage persistence from the cloud layer while preserving the old
 * synchronous call shape used by current field screens.
 */
export class CloudService {
  private static config: CloudConfiguration = EMPTY_CLOUD_CONFIG;
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;
    this.config = await AppSettingsService.getValue<CloudConfiguration>(CLOUD_CONFIG_KEY, EMPTY_CLOUD_CONFIG);
    this.initialized = true;
  }

  static getConfiguration(): CloudConfiguration {
    return this.config;
  }

  static setConfiguration(config: CloudConfiguration): void {
    this.config = { url: config.url.trim(), key: config.key.trim() };
    this.initialized = true;
    void AppSettingsService.setValue<CloudConfiguration>(CLOUD_CONFIG_KEY, this.config);
  }

  static isConfigured(): boolean {
    return !!this.config.url;
  }

  private static async requireConfiguration(): Promise<CloudConfiguration> {
    await this.initialize();
    if (!this.config.url) throw new Error('Cloud URL not configured');
    return this.config;
  }

  static async sync(payload: SyncPayload) {
    const { url, key } = await this.requireConfiguration();

    const response = await fetch(`${url}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Cloud sync failed');
    return response.json();
  }

  static async syncRuntimeOperations(runtimeOperations: SyncOperation[]) {
    const { url, key } = await this.requireConfiguration();
    const sanitizedOps = runtimeOperations.map((op) => sanitizeSyncOperation(op));

    const response = await fetch(`${url}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        jobs: [],
        photos: [],
        voiceNotes: [],
        runtimeOperations: sanitizedOps,
      })
    });

    if (!response.ok) throw new Error('Cloud runtime sync failed');
    return response.json();
  }

  static async uploadPhoto(photo: JobPhoto) {
    await this.initialize();
    const { url, key } = this.config;
    if (!url) return;

    try {
      let blob = photo.blob;
      if (!blob && photo.dataUrl) {
        blob = await fetch(photo.dataUrl).then(r => r.blob());
      }
      
      if (!blob) return;

      const formData = new FormData();
      formData.append('file', blob, `${photo.id}.jpg`);
      formData.append('jobId', photo.jobId);
      formData.append('category', photo.category);

      await fetch(`${url}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}` },
        body: formData
      });
    } catch (e) {
      console.error('Cloud upload failed', e);
      throw e;
    }
  }

  static async sendRemoteReport(jobId: string, email: string, customerName: string) {
    await this.initialize();
    const { url, key } = this.config;
    if (!url) return;
    
    await fetch(`${url}/send-report`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({ jobId, customerEmail: email, customerName })
    });
  }
}
