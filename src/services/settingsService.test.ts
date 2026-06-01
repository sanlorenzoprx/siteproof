import assert from 'node:assert/strict';
import test from 'node:test';
import { AppSettingsService } from './appSettingsService';
import { createDefaultSettings, normalizeSettings, SettingsService } from './settingsService';

test('fresh settings include complete go-live defaults', () => {
  const settings = createDefaultSettings('es');
  assert.equal(settings.schemaVersion, 2);
  assert.equal(settings.uiLanguage, 'es');
  assert.equal(settings.companyProfile.companyName, '');
  assert.equal(settings.reportDefaults.defaultReportLanguage, 'en');
  assert.equal(settings.cloudLicense.cloudEnabled, false);
  assert.equal(settings.biddingDefaults.defaultBidPrivacy, 'internal_only');
  assert.equal(settings.videoDefaults.videoEnabled, true);
  assert.ok(settings.videoDefaults.maxVideoDurationSeconds >= 30);
  assert.ok(settings.videoDefaults.maxVideoDurationSeconds <= 60);
});

test('old flat settings migrate without losing language and cloud state', () => {
  const settings = normalizeSettings({
    uiLanguage: 'es',
    captureLanguage: 'es',
    exportLanguage: 'es',
    cloudEnabled: true,
    cloudSyncStatus: 'pending',
    themeMode: 'dark',
    textSize: 'xl',
    voiceHelpEnabled: false,
    hintMode: 'minimal',
  });

  assert.equal(settings.schemaVersion, 2);
  assert.equal(settings.uiLanguage, 'es');
  assert.equal(settings.reportDefaults.defaultReportLanguage, 'es');
  assert.equal(settings.cloudLicense.cloudEnabled, true);
  assert.equal(settings.cloudLicense.cloudSyncStatus, 'pending');
  assert.equal(settings.accessibility.theme, 'dark');
  assert.equal(settings.accessibility.voiceHelpEnabled, false);
  assert.equal(settings.accessibility.proofHintMode, 'minimal');
});

test('nested settings save and reload from app settings store', async () => {
  const originalGet = AppSettingsService.getValue;
  const originalSet = AppSettingsService.setValue;
  const store: Record<string, unknown> = {};
  AppSettingsService.getValue = async (key, fallback) => (key in store ? store[key] as never : fallback);
  AppSettingsService.setValue = async (key, value) => { store[key] = value; };

  try {
    const settings = createDefaultSettings('en');
    settings.companyProfile.companyName = 'Acme Electric';
    settings.reportDefaults.paymentTerms = 'Net 15';
    settings.biddingDefaults.defaultBidPrivacy = 'internal_only';
    await SettingsService.saveSettings(settings);

    const reloaded = await SettingsService.getSettings();
    assert.equal(reloaded.companyProfile.companyName, 'Acme Electric');
    assert.equal(reloaded.reportDefaults.paymentTerms, 'Net 15');
    assert.equal(reloaded.biddingDefaults.defaultBidPrivacy, 'internal_only');
  } finally {
    AppSettingsService.getValue = originalGet;
    AppSettingsService.setValue = originalSet;
  }
});
