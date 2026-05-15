import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { AppSettingsService } from './services/appSettingsService';
import { LicenseService } from './services/licenseService';
import { CloudflareClient } from './services/cloudflareClient';

test('trial starts locally and persists without a network dependency', async () => {
  const originalGet = AppSettingsService.getValue;
  const originalSet = AppSettingsService.setValue;
  let stored: unknown = null;
  AppSettingsService.getValue = async (_key, fallback) => stored as never ?? fallback;
  AppSettingsService.setValue = async (_key, value) => { stored = value; };
  const state = await LicenseService.getState(new Date('2026-05-15T00:00:00.000Z'));
  assert.equal(state.status, 'trial_active');
  assert.ok(state.trialEndsAt);
  assert.equal(stored, state);
  AppSettingsService.getValue = originalGet;
  AppSettingsService.setValue = originalSet;
});

test('failed verification preserves safe offline or pending license state', async () => {
  const originalGet = AppSettingsService.getValue;
  const originalSet = AppSettingsService.setValue;
  let stored: any = { status: 'licensed', licenseKey: 'ABC12345', deviceId: 'device-1' };
  AppSettingsService.getValue = async () => stored;
  AppSettingsService.setValue = async (_key, value) => { stored = value; };
  const result = await LicenseService.verify(async () => { throw new Error('offline'); });
  assert.equal(result.state.status, 'offline_grace');
  assert.equal(LicenseService.allowsCoreWorkflow(result.state), true);
  AppSettingsService.getValue = originalGet;
  AppSettingsService.setValue = originalSet;
});

test('cloud object keys are deterministic and no frontend Stripe secrets leak', () => {
  assert.equal(CloudflareClient.objectKey({ localId: 'p1', jobId: 'j1', objectType: 'photo' }), 'j1/photo/p1');
  const source = [
    'src/services/licenseApiClient.ts',
    'src/services/cloudflareClient.ts',
  ].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  assert.equal(/sk_live_|sk_test_|whsec_/.test(source), false);
});

test('license and cloud UI copy uses i18n keys', () => {
  const source = [
    'src/components/LicenseScreen.tsx',
    'src/components/cloud/CloudUpsellCard.tsx',
  ].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  for (const forbidden of ['Yearly License', 'System Active', '>Enable<', '>Disable<']) {
    assert.equal(source.includes(forbidden), false, `Found hardcoded copy: ${forbidden}`);
  }
});
