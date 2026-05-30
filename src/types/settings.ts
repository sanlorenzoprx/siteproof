export type SiteProofLanguage = 'en' | 'es';
export type CloudSyncStatus = 'off' | 'pending' | 'syncing' | 'synced' | 'error';
export type SiteProofUxMode = 'simple' | 'advanced';
export type ThemePreference = 'system' | 'light' | 'dark';
export type FontSizePreference = 'xs' | 'sm' | 'base' | 'lg' | 'xl';
export type ProofHintMode = 'guided' | 'minimal' | 'always';
export type BidPrivacyDefault = 'internal_only' | 'customer_visible_requires_confirmation';

export type SiteProofThemeMode = ThemePreference;
export type SiteProofTextSize = 'small' | 'normal' | 'large' | 'xl' | 'xxl';
export type SiteProofHintMode = 'guided' | 'minimal';

export interface CompanyProfileSettings {
  companyName: string;
  ownerAdminName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  website: string;
  logoUri?: string | null;
  licenseNumber?: string | null;
  insuranceNote?: string | null;
  serviceArea: string;
  primaryTrade: string;
}

export interface ReportDefaultSettings {
  defaultReportLanguage: SiteProofLanguage;
  customerFacingContactInfo: 'company' | 'owner' | 'custom';
  customCustomerFacingName?: string;
  customCustomerFacingPhone?: string;
  customCustomerFacingEmail?: string;
  paymentTerms: string;
  estimateExpirationDays: number;
  warrantyServiceNote: string;
  defaultDisclaimer: string;
  signatureRequiredByDefault: boolean;
}

export interface TradeWorkflowDefaultSettings {
  primaryTrade: string;
  topWorkflows: string[];
  defaultWorkflowId?: string | null;
  customWorkflows: string[];
  bidMetricDefaults: string[];
  inspectionProofDefaults: string[];
}

export interface CloudLicenseSettings {
  licenseStatus: string;
  planId?: string | null;
  includedCloudStorage?: string | null;
  cloudEnabled: boolean;
  cloudSyncStatus: CloudSyncStatus;
  seatsIncluded?: number | null;
  activeDeviceCount?: number | null;
  shareLinkDefaultVisibility: 'private' | 'customer_visible' | 'internal_only';
}

export interface AccessibilitySettings {
  theme: ThemePreference;
  fontSize: FontSizePreference;
  voiceHelpEnabled: boolean;
  proofHintMode: ProofHintMode;
}

export interface BiddingDefaultSettings {
  defaultBidPrivacy: BidPrivacyDefault;
  customerBidFields: string[];
  defaultAssumptions: string[];
  defaultExclusions: string[];
  paymentTerms: string;
  estimateExpirationDays: number;
}

export interface VideoDefaultSettings {
  videoEnabled: boolean;
  maxVideoDurationSeconds: number;
  maxVideoFileSizeMb: number;
  uploadVideoOverWifiOnly: boolean;
  includeVideoLinksInReports: boolean;
  generateVideoThumbnail: boolean;
  preferredMimeTypes: string[];
}

export interface SiteProofSettings {
  schemaVersion: 2;
  uiLanguage: SiteProofLanguage;
  captureLanguage: SiteProofLanguage;
  exportLanguage: SiteProofLanguage;
  stormModeEnabled: boolean;
  companyProfile: CompanyProfileSettings;
  reportDefaults: ReportDefaultSettings;
  tradeWorkflowDefaults: TradeWorkflowDefaultSettings;
  cloudLicense: CloudLicenseSettings;
  accessibility: AccessibilitySettings;
  biddingDefaults: BiddingDefaultSettings;
  videoDefaults: VideoDefaultSettings;

  // Transitional aliases used by older UI/services while Phase 1 lands.
  uxMode: SiteProofUxMode;
  themeMode: SiteProofThemeMode;
  textSize: SiteProofTextSize;
  voiceHelpEnabled: boolean;
  hintMode: SiteProofHintMode;
  alwaysShowProofHints: boolean;
  cloudEnabled: boolean;
  cloudSyncStatus: CloudSyncStatus;
}
