import { appSettingsRepository } from '../db/repositories/appSettingsRepository';

const SPEECH_CALIBRATED_KEY = 'speech_calibrated';
const LAST_ACTIVE_JOB_KEY = 'last_active_job_id';

/**
 * Runtime settings facade backed by the canonical app_settings store.
 *
 * This replaces component-level browser persistence and removes settings from
 * the legacy SiteProofDataService path. Settings remain local/device-scoped unless a
 * caller explicitly chooses another scope.
 */
export class AppSettingsService {
  static async getValue<T>(key: string, fallback: T): Promise<T> {
    return appSettingsRepository.getByKey<T>(key, fallback);
  }

  static async setValue<T>(key: string, value: T): Promise<void> {
    await appSettingsRepository.setByKey<T>(key, value);
  }

  static async isSpeechCalibrated(): Promise<boolean> {
    return this.getValue<boolean>(SPEECH_CALIBRATED_KEY, false);
  }

  static async setSpeechCalibrated(value: boolean): Promise<void> {
    await this.setValue<boolean>(SPEECH_CALIBRATED_KEY, value);
  }

  static async getLastActiveJobId(): Promise<string | null> {
    return this.getValue<string | null>(LAST_ACTIVE_JOB_KEY, null);
  }

  static async setLastActiveJobId(id: string): Promise<void> {
    await this.setValue<string>(LAST_ACTIVE_JOB_KEY, id);
  }
}
