import { AppSettingsService } from './appSettingsService';

export type LicenseStatus =
  | 'trial_active'
  | 'trial_expired'
  | 'licensed'
  | 'license_pending_verification'
  | 'license_invalid'
  | 'offline_grace';

export interface LicenseState {
  status: LicenseStatus;
  licenseKey?: string;
  planId?: string;
  customerEmail?: string;
  trialStartedAt?: string;
  trialEndsAt?: string;
  activatedAt?: string;
  lastVerifiedAt?: string;
  deviceId?: string;
  cloudEntitled?: boolean;
}

export interface LicenseVerificationResult {
  ok: boolean;
  state: LicenseState;
}

const LICENSE_STATE_KEY = 'license_state_v2';
const TRIAL_DAYS = 30;

function nowIso() {
  return new Date().toISOString();
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function createDeviceId() {
  return globalThis.crypto?.randomUUID?.() ?? `device-${Date.now()}`;
}

export class LicenseService {
  static createTrialState(now = new Date()): LicenseState {
    return {
      status: 'trial_active',
      trialStartedAt: now.toISOString(),
      trialEndsAt: addDays(now, TRIAL_DAYS),
      deviceId: createDeviceId(),
      cloudEntitled: false,
    };
  }

  static async getState(now = new Date()): Promise<LicenseState> {
    const saved = await AppSettingsService.getValue<LicenseState | null>(LICENSE_STATE_KEY, null);
    if (!saved) {
      const trial = this.createTrialState(now);
      await this.saveState(trial);
      return trial;
    }
    if (saved.status === 'trial_active' && saved.trialEndsAt && Date.parse(saved.trialEndsAt) < now.getTime()) {
      const expired = { ...saved, status: 'trial_expired' as const };
      await this.saveState(expired);
      return expired;
    }
    return saved;
  }

  static async saveState(state: LicenseState): Promise<void> {
    await AppSettingsService.setValue(LICENSE_STATE_KEY, state);
  }

  static async activateLocally(licenseKey: string, partial: Partial<LicenseState> = {}): Promise<LicenseState> {
    const current = await this.getState();
    const next: LicenseState = {
      ...current,
      ...partial,
      status: 'license_pending_verification',
      licenseKey,
      activatedAt: current.activatedAt ?? nowIso(),
    };
    await this.saveState(next);
    return next;
  }

  static async verify(
    verifier: (state: LicenseState) => Promise<Partial<LicenseState> & { valid: boolean }>,
  ): Promise<LicenseVerificationResult> {
    const current = await this.getState();
    if (!current.licenseKey) return { ok: false, state: current };
    try {
      const result = await verifier(current);
      const next: LicenseState = result.valid
        ? { ...current, ...result, status: 'licensed', lastVerifiedAt: nowIso() }
        : { ...current, status: 'license_invalid', lastVerifiedAt: nowIso() };
      await this.saveState(next);
      return { ok: result.valid, state: next };
    } catch {
      const next: LicenseState = current.status === 'licensed'
        ? { ...current, status: 'offline_grace' }
        : { ...current, status: 'license_pending_verification' };
      await this.saveState(next);
      return { ok: false, state: next };
    }
  }

  static allowsCoreWorkflow(state: LicenseState): boolean {
    return state.status !== 'license_invalid';
  }
}
