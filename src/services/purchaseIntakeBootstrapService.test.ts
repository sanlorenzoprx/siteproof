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
    const result = await PurchaseIntakeBootstrapService.bootstrapFromActivationLink({ licenseKey: 'PENDING-123' });
    const state = await LicenseService.getLicenseState();
    assert.equal(result.license.status, 'license_pending_verification');
    assert.equal(state.licenseKey, 'PENDING-123');
  } finally {
    LicenseApiClient.bootstrap = originalBootstrap;
  }
}));

test('license and token activation link applies purchase setup seed', withSettingsStore({}, async () => {
  const originalBootstrap = LicenseApiClient.bootstrap;
  LicenseApiClient.bootstrap = async (licenseKey, deviceId, activationToken) => {
    assert.equal(licenseKey, 'SAFE-LICENSE-456');
    assert.ok(deviceId);
    assert.equal(activationToken, 'tok_seeded');
    return {
      valid: true,
      license: {
        licenseId: 'lic_seeded',
        status: 'licensed',
        planId: 'siteproof_launch_7_license',
        customerEmail: 'seeded@example.com',
        cloudEntitled: true,
        seatsIncluded: 7,
      },
      settingsSeed: PurchaseIntakeBootstrapService.createSettingsSeedFromIntake({
        companyName: 'Seeded Roofing',
        ownerAdminName: 'Sam Seed',
        email: 'seeded@example.com',
        tradeType: 'Roofing',
        reportLanguage: 'es',
        cloudStoragePlan: 'included_1_year',
        planId: 'siteproof_launch_7_license',
      }),
    };
  };
  try {
    assert.deepEqual(PurchaseIntakeBootstrapService.parseActivationLink('?license=SAFE-LICENSE-456&token=tok_seeded'), {
      licenseKey: 'SAFE-LICENSE-456',
      activationToken: 'tok_seeded',
    });
    const result = await PurchaseIntakeBootstrapService.bootstrapFromActivationLink({
      licenseKey: 'SAFE-LICENSE-456',
      activationToken: 'tok_seeded',
    });
    const state = await LicenseService.getLicenseState();
    const settings = await SettingsService.getSettings();

    assert.equal(result.license.status, 'licensed');
    assert.equal(result.appliedSettings, true);
    assert.equal(state.licenseKey, 'SAFE-LICENSE-456');
    assert.equal(settings.companyProfile.companyName, 'Seeded Roofing');
    assert.equal(settings.companyProfile.businessEmail, 'seeded@example.com');
    assert.equal(settings.reportDefaults.defaultReportLanguage, 'es');
    assert.equal(settings.cloudLicense.cloudEnabled, true);
    assert.doesNotMatch(JSON.stringify(state), /tok_seeded/);
  } finally {
    LicenseApiClient.bootstrap = originalBootstrap;
  }
}));

test('activation token link activates without storing raw token', withSettingsStore({}, async () => {
  const originalActivateWithToken = LicenseApiClient.activateWithToken;
  const originalVerify = LicenseApiClient.verify;
  LicenseApiClient.activateWithToken = async (activationToken, deviceId, deviceLabel) => {
    assert.equal(activationToken, 'tok_123');
    assert.ok(deviceId);
    assert.ok(deviceLabel);
    return {
      valid: true,
      status: 'licensed',
      licenseId: 'lic_token',
      licenseKey: 'SAFE-LICENSE-123',
      tier: 'crew_7',
      planId: 'siteproof_launch_7_license',
      customerEmail: 'owner@example.com',
      seatLimit: 7,
      trialJobLimit: 3,
      cloudVaultEnabled: true,
      brandedReportsEnabled: false,
      currentPeriodEndsAt: '2027-05-30T00:00:00.000Z',
    };
  };
  LicenseApiClient.verify = async (state) => ({
    valid: true,
    status: 'licensed',
    licenseId: state.licenseId,
    licenseKey: state.licenseKey,
    tier: state.tier,
    planId: state.planId,
    customerEmail: state.customerEmail,
    seatLimit: state.seatLimit,
    trialJobLimit: state.trialJobLimit,
    cloudVaultEnabled: state.cloudVaultEnabled,
    brandedReportsEnabled: state.brandedReportsEnabled,
    currentPeriodEndsAt: state.currentPeriodEndsAt,
  });
  try {
    assert.deepEqual(PurchaseIntakeBootstrapService.parseActivationLink('?token=tok_123'), { activationToken: 'tok_123', licenseKey: undefined });
    const result = await PurchaseIntakeBootstrapService.bootstrapFromActivationLink({ activationToken: 'tok_123' });
    const state = await LicenseService.getLicenseState();
    assert.equal(result.license.status, 'licensed');
    assert.equal(state.licenseKey, 'SAFE-LICENSE-123');
    assert.equal(state.tier, 'crew_7');
    assert.equal(state.seatLimit, 7);
    assert.equal(state.trialJobLimit, 3);
    assert.equal(state.cloudVaultEnabled, true);
    assert.equal(state.currentPeriodEndsAt, '2027-05-30T00:00:00.000Z');
    assert.doesNotMatch(JSON.stringify(state), /tok_123/);
  } finally {
    LicenseApiClient.activateWithToken = originalActivateWithToken;
    LicenseApiClient.verify = originalVerify;
  }
}));
