import { AppSettingsService } from './appSettingsService';
import type {
  CloudSyncStatus,
  FontSizePreference,
  ProofHintMode,
  SiteProofLanguage,
  SiteProofSettings,
  SiteProofTextSize,
} from '../types/settings';

const SETTINGS_KEY = 'siteproof_settings';

export function defaultUiLanguage(): SiteProofLanguage {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

function accessibilityFontToLegacy(value: FontSizePreference): SiteProofTextSize {
  if (value === 'xs' || value === 'sm') return 'small';
  if (value === 'lg') return 'large';
  if (value === 'xl') return 'xl';
  return 'normal';
}

function legacyFontToAccessibility(value: unknown): FontSizePreference {
  if (value === 'small') return 'sm';
  if (value === 'large') return 'lg';
  if (value === 'xl' || value === 'xxl') return 'xl';
  return 'base';
}

function proofHintToLegacy(value: ProofHintMode): 'guided' | 'minimal' {
  return value === 'minimal' ? 'minimal' : 'guided';
}

export function createDefaultSettings(uiLanguage = defaultUiLanguage()): SiteProofSettings {
  return {
    schemaVersion: 2,
    uiLanguage,
    captureLanguage: uiLanguage,
    exportLanguage: 'en',
    stormModeEnabled: true,
    companyProfile: {
      companyName: '',
      ownerAdminName: '',
      businessPhone: '',
      businessEmail: '',
      businessAddress: '',
      website: '',
      logoUri: null,
      licenseNumber: null,
      insuranceNote: null,
      serviceArea: '',
      primaryTrade: '',
    },
    reportDefaults: {
      defaultReportLanguage: 'en',
      customerFacingContactInfo: 'company',
      customCustomerFacingName: '',
      customCustomerFacingPhone: '',
      customCustomerFacingEmail: '',
      paymentTerms: 'Due upon completion unless otherwise stated.',
      estimateExpirationDays: 30,
      warrantyServiceNote: '',
      defaultDisclaimer: 'SiteProof helps contractors capture stronger jobsite proof. The contractor still verifies final code, permit, and inspection requirements with the local authority.',
      signatureRequiredByDefault: false,
    },
    tradeWorkflowDefaults: {
      primaryTrade: '',
      topWorkflows: [],
      defaultWorkflowId: null,
      customWorkflows: [],
      bidMetricDefaults: ['labor', 'materials', 'timeline'],
      inspectionProofDefaults: ['permit', 'inspection_card', 'final_photo'],
    },
    cloudLicense: {
      licenseStatus: 'trial',
      planId: null,
      includedCloudStorage: null,
      cloudEnabled: false,
      cloudSyncStatus: 'off',
      seatsIncluded: null,
      activeDeviceCount: null,
      shareLinkDefaultVisibility: 'private',
    },
    accessibility: {
      theme: 'system',
      fontSize: 'base',
      voiceHelpEnabled: true,
      proofHintMode: 'guided',
    },
    biddingDefaults: {
      defaultBidPrivacy: 'internal_only',
      customerBidFields: ['scope', 'price', 'timeline', 'assumptions'],
      defaultAssumptions: [],
      defaultExclusions: [],
      paymentTerms: 'Deposit due on approval. Balance due upon completion.',
      estimateExpirationDays: 30,
    },
    videoDefaults: {
      videoEnabled: true,
      maxVideoDurationSeconds: 60,
      maxVideoFileSizeMb: 100,
      uploadVideoOverWifiOnly: true,
      includeVideoLinksInReports: true,
      generateVideoThumbnail: true,
      preferredMimeTypes: ['video/webm', 'video/mp4'],
    },
    uxMode: 'simple',
    themeMode: 'system',
    textSize: 'normal',
    voiceHelpEnabled: true,
    hintMode: 'guided',
    alwaysShowProofHints: true,
    cloudEnabled: false,
    cloudSyncStatus: 'off',
  };
}

export function normalizeSettings(saved: Partial<SiteProofSettings> | Record<string, unknown> = {}, uiLanguage = defaultUiLanguage()): SiteProofSettings {
  const defaults = createDefaultSettings(uiLanguage);
  const raw = saved as Partial<SiteProofSettings> & Record<string, unknown>;
  const cloudEnabled = Boolean(raw.cloudEnabled ?? raw.cloudLicense?.cloudEnabled ?? defaults.cloudLicense.cloudEnabled);
  const cloudSyncStatus = (raw.cloudSyncStatus ?? raw.cloudLicense?.cloudSyncStatus ?? defaults.cloudLicense.cloudSyncStatus) as CloudSyncStatus;
  const themeMode = (raw.themeMode ?? raw.accessibility?.theme ?? defaults.themeMode) as SiteProofSettings['themeMode'];
  const textSize = (raw.textSize ?? accessibilityFontToLegacy(raw.accessibility?.fontSize ?? defaults.accessibility.fontSize)) as SiteProofTextSize;
  const proofHintMode = (raw.accessibility?.proofHintMode ?? raw.hintMode ?? defaults.accessibility.proofHintMode) as ProofHintMode;
  const hintMode = proofHintToLegacy(proofHintMode);
  const voiceHelpEnabled = Boolean(raw.voiceHelpEnabled ?? raw.accessibility?.voiceHelpEnabled ?? defaults.voiceHelpEnabled);
  const exportLanguage = (raw.exportLanguage ?? raw.reportDefaults?.defaultReportLanguage ?? defaults.exportLanguage) as SiteProofLanguage;
  const alwaysShowProofHints = raw.alwaysShowProofHints !== undefined
    ? Boolean(raw.alwaysShowProofHints)
    : raw.accessibility?.proofHintMode === 'always'
      ? true
      : raw.hintMode === 'minimal' || raw.accessibility?.proofHintMode === 'minimal'
        ? false
      : defaults.alwaysShowProofHints;

  const normalized: SiteProofSettings = {
    ...defaults,
    ...raw,
    schemaVersion: 2,
    uiLanguage: (raw.uiLanguage ?? defaults.uiLanguage) as SiteProofLanguage,
    captureLanguage: (raw.captureLanguage ?? defaults.captureLanguage) as SiteProofLanguage,
    exportLanguage,
    companyProfile: { ...defaults.companyProfile, ...raw.companyProfile },
    reportDefaults: {
      ...defaults.reportDefaults,
      ...raw.reportDefaults,
      defaultReportLanguage: exportLanguage,
    },
    tradeWorkflowDefaults: { ...defaults.tradeWorkflowDefaults, ...raw.tradeWorkflowDefaults },
    cloudLicense: {
      ...defaults.cloudLicense,
      ...raw.cloudLicense,
      cloudEnabled,
      cloudSyncStatus,
    },
    accessibility: {
      ...defaults.accessibility,
      ...raw.accessibility,
      theme: themeMode,
      fontSize: raw.accessibility?.fontSize ?? legacyFontToAccessibility(textSize),
      voiceHelpEnabled,
      proofHintMode,
    },
    biddingDefaults: { ...defaults.biddingDefaults, ...raw.biddingDefaults },
    videoDefaults: { ...defaults.videoDefaults, ...raw.videoDefaults },
    uxMode: (raw.uxMode ?? defaults.uxMode) as SiteProofSettings['uxMode'],
    themeMode,
    textSize,
    voiceHelpEnabled,
    hintMode,
    alwaysShowProofHints,
    cloudEnabled,
    cloudSyncStatus,
  };

  normalized.accessibility.proofHintMode = normalized.alwaysShowProofHints ? 'always' : proofHintMode;
  normalized.accessibility.theme = normalized.themeMode;
  normalized.accessibility.fontSize = legacyFontToAccessibility(normalized.textSize);
  normalized.accessibility.voiceHelpEnabled = normalized.voiceHelpEnabled;
  normalized.cloudLicense.cloudEnabled = normalized.cloudEnabled;
  normalized.cloudLicense.cloudSyncStatus = normalized.cloudSyncStatus;
  normalized.reportDefaults.defaultReportLanguage = normalized.exportLanguage;
  return normalized;
}

export class SettingsService {
  static async getSettings(): Promise<SiteProofSettings> {
    const saved = await AppSettingsService.getValue<Partial<SiteProofSettings>>(SETTINGS_KEY, {});
    return normalizeSettings(saved);
  }

  static async saveSettings(settings: SiteProofSettings): Promise<void> {
    await AppSettingsService.setValue(SETTINGS_KEY, normalizeSettings(settings, settings.uiLanguage));
  }
}
