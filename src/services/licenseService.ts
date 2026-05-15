import { AppSettingsService } from './appSettingsService';
import { LicenseApiClient } from './licenseApiClient';

export type LicenseStatus =
  | 'trial_active'
  | 'trial_expired'
  | 'licensed'
  | 'license_pending_verification'
  | 'offline_grace'
  | 'unlicensed'
  | 'revoked';

export interface SiteProofLicenseState {
  status: LicenseStatus;
  trialStartedAt?: string;
  trialEndsAt?: string;
  licenseKey?: string;
  licenseId?: string;
  activatedAt?: string;
  lastVerifiedAt?: string;
  lastVerificationAttemptAt?: string;
  offlineGraceEndsAt?: string;
  deviceId: string;
  appVersion?: string;
  errorMessage?: string;
  planId?: string;
  customerEmail?: string;
  cloudEntitled?: boolean;
}

export type LicenseState = SiteProofLicenseState;

export interface LicenseVerificationResult {
  ok: boolean;
  state: SiteProofLicenseState;
}

const LICENSE_STATE_KEY = 'license_state_v2';
const DEVICE_ID_KEY = 'license_device_id_v1';
const TRIAL_DAYS = 30;
const OFFLINE_GRACE_DAYS = 14;

function nowIso() {
  return new Date().toISOString();
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function parseTime(value?: string): number {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(time) ? time : 0;
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AppSettingsService.getValue<string | null>(DEVICE_ID_KEY, null);
  if (existing) return existing;
  const deviceId = globalThis.crypto?.randomUUID?.() ?? `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AppSettingsService.setValue(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

function normalizeStatus(state: SiteProofLicenseState, now = new Date()): SiteProofLicenseState {
  if (state.status === 'revoked') return state;
  if (state.status === 'trial_active' && state.trialEndsAt && parseTime(state.trialEndsAt) <= now.getTime()) {
    return { ...state, status: 'trial_expired' };
  }
  if (state.status === 'offline_grace' && state.offlineGraceEndsAt && parseTime(state.offlineGraceEndsAt) <= now.getTime()) {
    return { ...state, status: 'license_pending_verification', errorMessage: 'Offline grace expired. Please verify license.' };
  }
  return state;
}

export class LicenseService {
  static async createTrialState(now = new Date()): Promise<SiteProofLicenseState> {
    return {
      status: 'trial_active',
      trialStartedAt: now.toISOString(),
      trialEndsAt: addDays(now, TRIAL_DAYS),
      deviceId: await getOrCreateDeviceId(),
      cloudEntitled: false,
    };
  }

  static async createTrialIfNeeded(now = new Date()): Promise<SiteProofLicenseState> {
    const saved = await AppSettingsService.getValue<SiteProofLicenseState | null>(LICENSE_STATE_KEY, null);
    if (saved) return this.getLicenseState(now);
    const trial = await this.createTrialState(now);
    await this.saveState(trial);
    return trial;
  }

  static async getLicenseState(now = new Date()): Promise<SiteProofLicenseState> {
    const saved = await AppSettingsService.getValue<SiteProofLicenseState | null>(LICENSE_STATE_KEY, null);
    if (!saved) return this.createTrialIfNeeded(now);
    const withDevice = { ...saved, deviceId: saved.deviceId || await getOrCreateDeviceId() };
    const normalized = normalizeStatus(withDevice, now);
    if (normalized.status !== saved.status || normalized.deviceId !== saved.deviceId) await this.saveState(normalized);
    return normalized;
  }

  static async getState(now = new Date()): Promise<SiteProofLicenseState> {
    return this.getLicenseState(now);
  }

  static async saveState(state: SiteProofLicenseState): Promise<void> {
    await AppSettingsService.setValue(LICENSE_STATE_KEY, state);
  }

  static getDaysRemaining(state: SiteProofLicenseState, now = new Date()): number {
    const end = state.status === 'offline_grace' ? state.offlineGraceEndsAt : state.trialEndsAt;
    if (!end) return 0;
    return Math.max(0, Math.ceil((parseTime(end) - now.getTime()) / (24 * 60 * 60 * 1000)));
  }

  static canCreateJob(state: SiteProofLicenseState): boolean {
    return ['trial_active', 'licensed', 'license_pending_verification', 'offline_grace'].includes(state.status);
  }

  static canGenerateReport(state: SiteProofLicenseState): boolean {
    return this.canCreateJob(state);
  }

  static canUseCloudFeatures(state: SiteProofLicenseState): boolean {
    return state.status === 'licensed' && state.cloudEntitled === true;
  }

  static async markPendingVerification(licenseKey: string): Promise<SiteProofLicenseState> {
    const current = await this.getLicenseState();
    const next: SiteProofLicenseState = {
      ...current,
      status: 'license_pending_verification',
      licenseKey,
      activatedAt: current.activatedAt ?? nowIso(),
      lastVerificationAttemptAt: nowIso(),
      errorMessage: 'License saved. Verification will complete when internet is available.',
    };
    await this.saveState(next);
    return next;
  }

  static async activateLocally(licenseKey: string, partial: Partial<SiteProofLicenseState> = {}): Promise<SiteProofLicenseState> {
    const pending = await this.markPendingVerification(licenseKey);
    const next = { ...pending, ...partial };
    await this.saveState(next);
    return next;
  }

  static async activateLicense(licenseKey: string): Promise<SiteProofLicenseState> {
    const pending = await this.markPendingVerification(licenseKey);
    try {
      await LicenseApiClient.activate(pending);
      const verified = await this.verifyLicense();
      return verified.state;
    } catch (error) {
      const next = { ...pending, errorMessage: error instanceof Error ? error.message : pending.errorMessage };
      await this.saveState(next);
      return next;
    }
  }

  static async verifyLicense(): Promise<LicenseVerificationResult> {
    return this.verify((state) => LicenseApiClient.verify(state));
  }

  static async verify(
    verifier: (state: SiteProofLicenseState) => Promise<Partial<SiteProofLicenseState> & { valid?: boolean; status?: LicenseStatus }>,
  ): Promise<LicenseVerificationResult> {
    const current = await this.getLicenseState();
    if (!current.licenseKey) return { ok: false, state: current };
    const attemptedAt = nowIso();

    try {
      const result = await verifier(current);
      const revoked = result.status === 'revoked';
      const valid = result.valid === true || result.status === 'licensed';
      const next: SiteProofLicenseState = revoked
        ? { ...current, ...result, status: 'revoked', lastVerificationAttemptAt: attemptedAt, lastVerifiedAt: attemptedAt }
        : valid
          ? { ...current, ...result, status: 'licensed', lastVerificationAttemptAt: attemptedAt, lastVerifiedAt: attemptedAt, offlineGraceEndsAt: undefined, errorMessage: undefined }
          : { ...current, status: 'license_pending_verification', lastVerificationAttemptAt: attemptedAt, errorMessage: 'License verification did not complete.' };
      await this.saveState(next);
      return { ok: next.status === 'licensed', state: next };
    } catch (error) {
      const next: SiteProofLicenseState = current.status === 'licensed' || current.lastVerifiedAt
        ? {
          ...current,
          status: 'offline_grace',
          lastVerificationAttemptAt: attemptedAt,
          offlineGraceEndsAt: current.offlineGraceEndsAt ?? addDays(new Date(), OFFLINE_GRACE_DAYS),
          errorMessage: 'Offline grace active. SiteProof will verify your license when internet is available.',
        }
        : {
          ...current,
          status: 'license_pending_verification',
          lastVerificationAttemptAt: attemptedAt,
          errorMessage: 'License saved. Verification will complete when internet is available.',
        };
      await this.saveState(next);
      return { ok: false, state: next };
    }
  }

  static allowsCoreWorkflow(state: SiteProofLicenseState): boolean {
    return this.canCreateJob(state);
  }
}
