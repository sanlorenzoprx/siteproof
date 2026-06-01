import { AppSettingsService } from './appSettingsService';
import { LicenseApiClient } from './licenseApiClient';

export type LicenseStatus =
  | 'trial_active'
  | 'trial_expired'
  | 'licensed'
  | 'license_pending_verification'
  | 'offline_grace'
  | 'unlicensed'
  | 'revoked'
  | 'expired'
  | 'device_limit_exceeded';

export interface SiteProofLicenseState {
  status: LicenseStatus;
  trialStartedAt?: string;
  trialEndsAt?: string;
  trialJobLimit?: number;
  trialJobsCreatedCount?: number;
  trialConsumedJobIds?: string[];
  licenseKey?: string;
  licenseId?: string;
  activatedAt?: string;
  lastVerifiedAt?: string;
  lastVerificationAttemptAt?: string;
  offlineGraceEndsAt?: string;
  deviceId: string;
  deviceLabel?: string;
  appVersion?: string;
  errorMessage?: string;
  tier?: string;
  planId?: string;
  customerEmail?: string;
  seatLimit?: number;
  cloudEntitled?: boolean;
  cloudVaultEnabled?: boolean;
  brandedReportsEnabled?: boolean;
  currentPeriodEndsAt?: string;
  verificationCredential?: string;
}

export type LicenseState = SiteProofLicenseState;

export interface LicenseVerificationResult {
  ok: boolean;
  state: SiteProofLicenseState;
}

const LICENSE_STATE_KEY = 'license_state_v2';
const DEVICE_ID_KEY = 'license_device_id_v1';
const TRIAL_DAYS = 30;
const TRIAL_JOB_LIMIT = 3;
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

function getDeviceLabel(): string {
  const platform = typeof navigator !== 'undefined' ? navigator.platform || 'web' : 'web';
  return `SiteProof ${platform}`.slice(0, 80);
}

function normalizeStatus(state: SiteProofLicenseState, now = new Date()): SiteProofLicenseState {
  if (['revoked', 'expired', 'device_limit_exceeded'].includes(state.status)) return state;
  if (state.status === 'trial_active' && state.trialEndsAt && parseTime(state.trialEndsAt) <= now.getTime()) {
    return { ...state, status: 'trial_expired', errorMessage: 'Your 30-day field trial has ended. Upgrade to keep creating job proof packages.' };
  }
  if (state.status === 'trial_active' && (state.trialJobsCreatedCount ?? 0) >= (state.trialJobLimit ?? TRIAL_JOB_LIMIT)) {
    return { ...state, status: 'trial_expired', errorMessage: 'Your 3 free jobs are used. Upgrade to keep creating job proof packages.' };
  }
  if (state.status === 'offline_grace' && state.offlineGraceEndsAt && parseTime(state.offlineGraceEndsAt) <= now.getTime()) {
    return { ...state, status: 'license_pending_verification', errorMessage: 'Offline grace expired. Please verify license.' };
  }
  return state;
}

function statusMessage(status: LicenseStatus): string | undefined {
  if (status === 'revoked') return 'License revoked. Contact support if this looks wrong.';
  if (status === 'expired') return 'License expired. Renew SiteProof to continue paid features.';
  if (status === 'device_limit_exceeded') return 'Device limit reached. Remove another device or contact support.';
  if (status === 'license_pending_verification') return 'License saved. Verification will complete when internet is available.';
  return undefined;
}

export class LicenseService {
  static readonly TRIAL_JOB_LIMIT = TRIAL_JOB_LIMIT;

  static async createTrialState(now = new Date()): Promise<SiteProofLicenseState> {
    return {
      status: 'trial_active',
      trialStartedAt: now.toISOString(),
      trialEndsAt: addDays(now, TRIAL_DAYS),
      trialJobLimit: TRIAL_JOB_LIMIT,
      trialJobsCreatedCount: 0,
      trialConsumedJobIds: [],
      deviceId: await getOrCreateDeviceId(),
      deviceLabel: getDeviceLabel(),
      cloudEntitled: false,
      cloudVaultEnabled: false,
      brandedReportsEnabled: false,
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
    const consumedJobIds = saved.trialConsumedJobIds ?? [];
    const withDevice = {
      ...saved,
      trialJobLimit: saved.trialJobLimit ?? TRIAL_JOB_LIMIT,
      trialJobsCreatedCount: saved.trialJobsCreatedCount ?? consumedJobIds.length,
      trialConsumedJobIds: consumedJobIds,
      deviceId: saved.deviceId || await getOrCreateDeviceId(),
      deviceLabel: saved.deviceLabel || getDeviceLabel(),
    };
    const normalized = normalizeStatus(withDevice, now);
    if (
      normalized.status !== saved.status ||
      normalized.deviceId !== saved.deviceId ||
      normalized.deviceLabel !== saved.deviceLabel ||
      normalized.trialJobLimit !== saved.trialJobLimit ||
      normalized.trialJobsCreatedCount !== saved.trialJobsCreatedCount ||
      normalized.trialConsumedJobIds !== saved.trialConsumedJobIds
    ) await this.saveState(normalized);
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

  static getTrialJobsUsed(state: SiteProofLicenseState): number {
    return state.trialJobsCreatedCount ?? state.trialConsumedJobIds?.length ?? 0;
  }

  static getTrialJobLimit(state: SiteProofLicenseState): number {
    return state.trialJobLimit ?? TRIAL_JOB_LIMIT;
  }

  static getTrialStatusMessage(state: SiteProofLicenseState, now = new Date()): string {
    if (state.status === 'trial_expired' && this.getTrialJobsUsed(state) >= this.getTrialJobLimit(state)) {
      return 'Your 3 free jobs are used. Upgrade to keep creating job proof packages.';
    }
    if (state.status === 'trial_expired' || (state.trialEndsAt && parseTime(state.trialEndsAt) <= now.getTime())) {
      return 'Your 30-day field trial has ended. Upgrade to keep creating job proof packages.';
    }
    return `${this.getTrialJobsUsed(state)} of ${this.getTrialJobLimit(state)} free jobs used. ${this.getDaysRemaining(state, now)} days left in field trial.`;
  }

  static canCreateJob(state: SiteProofLicenseState): boolean {
    if (state.status === 'licensed' || state.status === 'license_pending_verification' || state.status === 'offline_grace') return true;
    if (state.status !== 'trial_active') return false;
    return this.getDaysRemaining(state) > 0 && this.getTrialJobsUsed(state) < this.getTrialJobLimit(state);
  }

  static canGenerateReport(state: SiteProofLicenseState): boolean {
    return this.canCreateJob(state);
  }

  static canUseCloudFeatures(state: SiteProofLicenseState): boolean {
    return state.status === 'licensed' && (state.cloudVaultEnabled === true || state.cloudEntitled === true);
  }

  static async recordTrialJobCreated(jobId: string): Promise<SiteProofLicenseState> {
    const current = await this.getLicenseState();
    if (current.status !== 'trial_active') return current;
    const consumed = current.trialConsumedJobIds ?? [];
    if (consumed.includes(jobId)) return current;
    const nextConsumed = [...consumed, jobId];
    const next = normalizeStatus({
      ...current,
      trialJobLimit: current.trialJobLimit ?? TRIAL_JOB_LIMIT,
      trialConsumedJobIds: nextConsumed,
      trialJobsCreatedCount: nextConsumed.length,
    });
    await this.saveState(next);
    return next;
  }

  static async markPendingVerification(licenseKey?: string): Promise<SiteProofLicenseState> {
    const current = await this.getLicenseState();
    const next: SiteProofLicenseState = {
      ...current,
      status: 'license_pending_verification',
      licenseKey: licenseKey ?? current.licenseKey,
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

  static mapActivationResponse(
    current: SiteProofLicenseState,
    result: Partial<SiteProofLicenseState> & {
      valid?: boolean;
      status?: LicenseStatus;
      seatsIncluded?: number;
      licenseKey?: string;
      verificationCredential?: string;
      cloudEntitled?: boolean;
      cloudVaultEnabled?: boolean;
      error?: string;
    },
    verifiedAt = nowIso(),
  ): SiteProofLicenseState {
    const status = result.status === 'licensed' || result.valid === true
      ? 'licensed'
      : result.status === 'revoked' || result.status === 'expired' || result.status === 'device_limit_exceeded'
        ? result.status
        : 'license_pending_verification';
    return {
      ...current,
      ...result,
      status,
      licenseKey: result.licenseKey ?? current.licenseKey,
      verificationCredential: result.verificationCredential ?? current.verificationCredential,
      seatLimit: result.seatLimit ?? result.seatsIncluded ?? current.seatLimit,
      cloudVaultEnabled: result.cloudVaultEnabled ?? result.cloudEntitled ?? current.cloudVaultEnabled,
      cloudEntitled: result.cloudEntitled ?? result.cloudVaultEnabled ?? current.cloudEntitled,
      lastVerificationAttemptAt: verifiedAt,
      lastVerifiedAt: status === 'licensed' || status === 'revoked' || status === 'expired' || status === 'device_limit_exceeded' ? verifiedAt : current.lastVerifiedAt,
      offlineGraceEndsAt: status === 'licensed' ? undefined : current.offlineGraceEndsAt,
      errorMessage: status === 'licensed' ? undefined : result.error ?? statusMessage(status),
    };
  }

  static async activateLicense(licenseKey: string): Promise<SiteProofLicenseState> {
    const pending = await this.markPendingVerification(licenseKey);
    try {
      const activated = LicenseService.mapActivationResponse(pending, await LicenseApiClient.activate(pending));
      await this.saveState(activated);
      if (activated.status === 'licensed') {
        const verified = await this.verifyLicense();
        return verified.state;
      }
      return activated;
    } catch (error) {
      const next = { ...pending, errorMessage: error instanceof Error ? error.message : pending.errorMessage };
      await this.saveState(next);
      return next;
    }
  }

  static async activateToken(activationToken: string): Promise<SiteProofLicenseState> {
    const pending = await this.markPendingVerification();
    try {
      const activated = LicenseService.mapActivationResponse(
        pending,
        await LicenseApiClient.activateWithToken(activationToken, pending.deviceId, pending.deviceLabel),
      );
      await this.saveState(activated);
      if (activated.status === 'licensed' && activated.licenseKey) {
        const verified = await this.verifyLicense();
        return verified.state;
      }
      return activated;
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
      const terminal = result.status === 'revoked' || result.status === 'expired' || result.status === 'device_limit_exceeded';
      const valid = result.valid === true || result.status === 'licensed';
      const next: SiteProofLicenseState = terminal
        ? LicenseService.mapActivationResponse(current, result, attemptedAt)
        : valid
          ? LicenseService.mapActivationResponse(current, result, attemptedAt)
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
