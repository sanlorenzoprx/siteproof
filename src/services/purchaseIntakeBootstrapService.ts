import { BusinessProfile } from '../domain/models';
import { LicenseApiClient, LicenseBootstrapResponse } from './licenseApiClient';
import { LicenseService, SiteProofLicenseState } from './licenseService';
import { SettingsService, createDefaultSettings, normalizeSettings } from './settingsService';
import { SiteProofDataService } from './siteProofDataService';
import { AppSettingsService } from './appSettingsService';
import type { SiteProofSettings } from '../types/settings';

const PURCHASE_SEED_APPLIED_AT_KEY = 'purchase_seed_applied_at';
const PURCHASE_SEED_PENDING_KEY = 'purchase_seed_pending_v1';

export interface ActivationLinkParams {
  licenseKey?: string;
  activationToken?: string;
}

export interface PurchaseBootstrapResult {
  license: SiteProofLicenseState;
  appliedSettings: boolean;
  pendingSettings: boolean;
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function settingsLookBlank(settings: SiteProofSettings): boolean {
  return [
    settings.companyProfile.companyName,
    settings.companyProfile.ownerAdminName,
    settings.companyProfile.businessEmail,
    settings.companyProfile.businessPhone,
    settings.companyProfile.businessAddress,
    settings.companyProfile.licenseNumber,
    settings.companyProfile.serviceArea,
    settings.companyProfile.primaryTrade,
  ].every(isBlank);
}

function mergeSeed(current: SiteProofSettings, response: LicenseBootstrapResponse): SiteProofSettings {
  const seed = response.settingsSeed ?? {};
  const license = response.license;
  return normalizeSettings({
    ...current,
    ...seed,
    companyProfile: {
      ...current.companyProfile,
      ...seed.companyProfile,
    },
    reportDefaults: {
      ...current.reportDefaults,
      ...seed.reportDefaults,
    },
    tradeWorkflowDefaults: {
      ...current.tradeWorkflowDefaults,
      ...seed.tradeWorkflowDefaults,
    },
    cloudLicense: {
      ...current.cloudLicense,
      ...seed.cloudLicense,
      licenseStatus: license.status,
      planId: license.planId,
      cloudEnabled: license.cloudEntitled,
      cloudSyncStatus: license.cloudEntitled ? 'pending' : current.cloudLicense.cloudSyncStatus,
      seatsIncluded: license.seatsIncluded ?? current.cloudLicense.seatsIncluded,
    },
    uiLanguage: seed.uiLanguage ?? current.uiLanguage,
    captureLanguage: seed.captureLanguage ?? seed.uiLanguage ?? current.captureLanguage,
    exportLanguage: seed.exportLanguage ?? current.exportLanguage,
    cloudEnabled: license.cloudEntitled,
    cloudSyncStatus: license.cloudEntitled ? 'pending' : current.cloudSyncStatus,
  }, current.uiLanguage);
}

function businessProfileFromSettings(settings: SiteProofSettings): BusinessProfile {
  const addressParts = settings.companyProfile.businessAddress.split(',').map((part) => part.trim());
  return {
    companyName: settings.companyProfile.companyName,
    tagline: settings.companyProfile.primaryTrade,
    address: addressParts[0] ?? '',
    city: addressParts[1] ?? '',
    state: addressParts[2] ?? '',
    zipCode: addressParts[3] ?? '',
    country: addressParts[4] ?? '',
    phone: settings.companyProfile.businessPhone,
    email: settings.companyProfile.businessEmail,
    website: settings.companyProfile.website,
    linkedIn: '',
    businessBio: '',
    licenseNumber: settings.companyProfile.licenseNumber ?? '',
    regulatoryInfo: settings.reportDefaults.defaultDisclaimer,
    adminPin: '',
  };
}

export class PurchaseIntakeBootstrapService {
  static parseActivationLink(search = window.location.search): ActivationLinkParams | null {
    const params = new URLSearchParams(search);
    const licenseKey = params.get('license') || params.get('licenseKey') || params.get('activationCode');
    const activationToken = params.get('token') || params.get('activationToken') || undefined;
    if (!licenseKey && !activationToken) return null;
    return {
      licenseKey: licenseKey || undefined,
      activationToken,
    };
  }

  static async bootstrapFromActivationLink(params: ActivationLinkParams): Promise<PurchaseBootstrapResult> {
    const pending = await LicenseService.markPendingVerification(params.licenseKey);
    try {
      if (params.activationToken) {
        const license = await LicenseService.activateToken(params.activationToken);
        return { license, appliedSettings: false, pendingSettings: false };
      }
      if (!params.licenseKey) {
        return { license: pending, appliedSettings: false, pendingSettings: false };
      }
      const response = await LicenseApiClient.bootstrap(params.licenseKey, pending.deviceId);
      const license = await LicenseService.activateLocally(params.licenseKey, {
        status: response.license.status,
        licenseId: response.license.licenseId,
        tier: response.license.tier,
        planId: response.license.planId,
        customerEmail: response.license.customerEmail,
        cloudEntitled: response.license.cloudEntitled,
        cloudVaultEnabled: response.license.cloudVaultEnabled ?? response.license.cloudEntitled,
        brandedReportsEnabled: response.license.brandedReportsEnabled,
        seatLimit: response.license.seatLimit ?? response.license.seatsIncluded,
        trialJobLimit: response.license.trialJobLimit,
        currentPeriodEndsAt: response.license.currentPeriodEndsAt,
        verificationCredential: response.license.verificationCredential,
        errorMessage: undefined,
        lastVerifiedAt: new Date().toISOString(),
      });
      const settingsResult = await this.applyBootstrapSettings(response);
      return { license, ...settingsResult };
    } catch (error) {
      return { license: { ...pending, errorMessage: error instanceof Error ? error.message : pending.errorMessage }, appliedSettings: false, pendingSettings: false };
    }
  }

  static async applyBootstrapSettings(response: LicenseBootstrapResponse): Promise<{ appliedSettings: boolean; pendingSettings: boolean }> {
    const current = await SettingsService.getSettings();
    const appliedAt = await AppSettingsService.getValue<string | null>(PURCHASE_SEED_APPLIED_AT_KEY, null);
    const shouldApply = !appliedAt && settingsLookBlank(current);
    const next = mergeSeed(current, response);

    if (!shouldApply) {
      await SettingsService.saveSettings({
        ...current,
        cloudLicense: next.cloudLicense,
        cloudEnabled: next.cloudEnabled,
        cloudSyncStatus: next.cloudSyncStatus,
      });
      await AppSettingsService.setValue(PURCHASE_SEED_PENDING_KEY, response.settingsSeed ?? {});
      return { appliedSettings: false, pendingSettings: true };
    }

    await SettingsService.saveSettings(next);
    if (next.companyProfile.companyName) {
      await SiteProofDataService.saveBusinessProfile(businessProfileFromSettings(next));
    }
    await AppSettingsService.setValue(PURCHASE_SEED_APPLIED_AT_KEY, new Date().toISOString());
    await AppSettingsService.setValue(PURCHASE_SEED_PENDING_KEY, null);
    return { appliedSettings: true, pendingSettings: false };
  }

  static createSettingsSeedFromIntake(intake: {
    companyName: string;
    ownerAdminName: string;
    email: string;
    phone?: string;
    tradeType?: string;
    serviceArea?: string;
    businessAddress?: string;
    licenseNumber?: string;
    preferredLanguage?: 'en' | 'es';
    reportLanguage?: 'en' | 'es';
    crewDeviceCount?: number;
    cloudStoragePlan?: string;
    planId: string;
  }): LicenseBootstrapResponse['settingsSeed'] {
    const defaults = createDefaultSettings(intake.preferredLanguage ?? 'en');
    return {
      uiLanguage: intake.preferredLanguage ?? defaults.uiLanguage,
      captureLanguage: intake.preferredLanguage ?? defaults.captureLanguage,
      exportLanguage: intake.reportLanguage ?? defaults.exportLanguage,
      companyProfile: {
        ...defaults.companyProfile,
        companyName: intake.companyName,
        ownerAdminName: intake.ownerAdminName,
        businessPhone: intake.phone ?? '',
        businessEmail: intake.email,
        businessAddress: intake.businessAddress ?? '',
        licenseNumber: intake.licenseNumber ?? null,
        serviceArea: intake.serviceArea ?? '',
        primaryTrade: intake.tradeType ?? '',
      },
      reportDefaults: {
        ...defaults.reportDefaults,
        defaultReportLanguage: intake.reportLanguage ?? defaults.reportDefaults.defaultReportLanguage,
      },
      tradeWorkflowDefaults: {
        ...defaults.tradeWorkflowDefaults,
        primaryTrade: intake.tradeType ?? '',
      },
      cloudLicense: {
        ...defaults.cloudLicense,
        planId: intake.planId,
        includedCloudStorage: intake.cloudStoragePlan ?? null,
        cloudEnabled: Boolean(intake.cloudStoragePlan),
        cloudSyncStatus: intake.cloudStoragePlan ? 'pending' : 'off',
        seatsIncluded: intake.crewDeviceCount ?? null,
      },
    };
  }
}
