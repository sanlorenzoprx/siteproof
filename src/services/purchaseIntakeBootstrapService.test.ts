import assert from 'node:assert/strict';
import test from 'node:test';
import { AppSettingsService } from './appSettingsService';
import { LicenseApiClient } from './licenseApiClient';
import { LicenseService } from './licenseService';
import { PurchaseIntakeBootstrapService } from './purchaseIntakeBootstrapService';
import { SettingsService, createDefaultSettings } from './settingsService';

function withSettingsStore(initial: Record<string, unknown>, run: (store: Record<string, unknown>) => Promise<void>) {
  return async () => {
    const originalGet = AppSettingsService.getValue;
    const originalSet = AppSettingsService.setValue;
    const store = { ...initial };
    AppSettingsService.getValue = async (key, fallback) => (key in store ? store[key] as never : fallback);
    AppSettingsService.setValue = async (key, value) => { store[key] = value; };
    try {
      await run(store);
    } finally {
      AppSettingsService.getValue = originalGet;
      AppSettingsService.setValue = originalSet;
    }
  };
}

test('purchase intake seed maps to expanded settings and legacy business profile', withSettingsStore({}, async (store) => {
  const response = {
    valid: true,
    license: {
      licenseId: 'lic_123',
      status: 'licensed' as const,
      planId: 'siteproof_pro',
      customerEmail: 'owner@example.com',
      cloudEntitled: true,
      seatsIncluded: 7,
    },
    settingsSeed: PurchaseIntakeBootstrapService.createSettingsSeedFromIntake({
      companyName: 'Acme Electric',
      ownerAdminName: 'Ada Owner',
      email: 'owner@example.com',
      phone: '555-0101',
      tradeType: 'Electrical',
      serviceArea: 'San Juan',
      businessAddress: '123 Main, San Juan, PR',
      licenseNumber: 'LIC-42',
      preferredLanguage: 'es',
      reportLanguage: 'es',
      crewDeviceCount: 7,
      cloudStoragePlan: 'included_1_year',
      planId: 'siteproof_pro',
    }),
  };

  const result = await PurchaseIntakeBootstrapService.applyBootstrapSettings(response);
  const settings = await SettingsService.getSettings();

  assert.equal(result.appliedSettings, true);
  assert.equal(settings.uiLanguage, 'es');
  assert.equal(settings.companyProfile.companyName, 'Acme Electric');
  assert.equal(settings.companyProfile.businessEmail, 'owner@example.com');
  assert.equal(settings.reportDefaults.defaultReportLanguage, 'es');
  assert.equal(settings.cloudLicense.cloudEnabled, true);
  assert.equal(settings.cloudLicense.seatsIncluded, 7);
  assert.equal((store.business_profile as { companyName?: string }).companyName, 'Acme Electric');
}));

test('purchase bootstrap keeps edited settings and stores pending seed', withSettingsStore({
  siteproof_settings: {
    ...createDefaultSettings('en'),
    companyProfile: {
      ...createDefaultSettings('en').companyProfile,
      companyName: 'Existing Co',
      businessEmail: 'existing@example.com',
    },
  },
  purchase_seed_applied_at: '2026-05-01T00:00:00.000Z',
}, async (store) => {
  const response = {
    valid: true,
    license: {
      licenseId: 'lic_456',
      status: 'licensed' as const,
      planId: 'siteproof_pro',
      customerEmail: 'new@example.com',
      cloudEntitled: true,
    },
    settingsSeed: PurchaseIntakeBootstrapService.createSettingsSeedFromIntake({
      companyName: 'New Co',
      ownerAdminName: 'New Owner',
      email: 'new@example.com',
      planId: 'siteproof_pro',
    }),
  };

  const result = await PurchaseIntakeBootstrapService.applyBootstrapSettings(response);
  const settings = await SettingsService.getSettings();

  assert.equal(result.appliedSettings, false);
  assert.equal(result.pendingSettings, true);
  assert.equal(settings.companyProfile.companyName, 'Existing Co');
  assert.equal(settings.cloudLicense.cloudEnabled, true);
  assert.ok(store.purchase_seed_pending_v1);
}));

test('activation link bootstrap saves pending license when offline', withSettingsStore({}, async () => {
  const originalBootstrap = LicenseApiClient.bootstrap;
  LicenseApiClient.bootstrap = async () => { throw new Error('offline'); };
  try {
    const result = await PurchaseIntakeBootstrapService.bootstrapFromActivationLink({ licenseKey: 'PENDING-123', activationToken: 'tok' });
    const state = await LicenseService.getLicenseState();
    assert.equal(result.license.status, 'license_pending_verification');
    assert.equal(state.licenseKey, 'PENDING-123');
  } finally {
    LicenseApiClient.bootstrap = originalBootstrap;
  }
}));
