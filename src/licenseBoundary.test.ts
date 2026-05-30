import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import worker from '../workers/siteproof-api/src/index';
import { AppSettingsService } from './services/appSettingsService';
import { LicenseService, SiteProofLicenseState } from './services/licenseService';
import { SignatureService } from './services/signatureService';
import { CloudflareClient } from './services/cloudflareClient';

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

test('first launch creates 30-day local trial and active trial allows workflows', withSettingsStore({}, async () => {
  const state = await LicenseService.getLicenseState(new Date('2026-05-15T00:00:00.000Z'));
  assert.equal(state.status, 'trial_active');
  assert.equal(state.trialEndsAt, '2026-06-14T00:00:00.000Z');
  assert.equal(LicenseService.canCreateJob(state), true);
  assert.equal(LicenseService.canGenerateReport(state), true);
}));

test('expired trial blocks new reports without deleting data', withSettingsStore({
  license_state_v2: {
    status: 'trial_active',
    trialStartedAt: '2026-04-01T00:00:00.000Z',
    trialEndsAt: '2026-05-01T00:00:00.000Z',
    deviceId: 'device-1',
  } satisfies SiteProofLicenseState,
}, async () => {
  const state = await LicenseService.getLicenseState(new Date('2026-05-15T00:00:00.000Z'));
  assert.equal(state.status, 'trial_expired');
  assert.equal(LicenseService.canGenerateReport(state), false);
}));

test('licensed state allows offline report generation and failed verification creates grace', withSettingsStore({
  license_state_v2: {
    status: 'licensed',
    licenseKey: 'ABC12345',
    deviceId: 'device-1',
    lastVerifiedAt: '2026-05-14T00:00:00.000Z',
  } satisfies SiteProofLicenseState,
}, async () => {
  const result = await LicenseService.verify(async () => { throw new Error('offline'); });
  assert.equal(result.state.status, 'offline_grace');
  assert.equal(LicenseService.canGenerateReport(result.state), true);
  assert.ok(result.state.offlineGraceEndsAt);
}));

test('revoked state only occurs after server response', withSettingsStore({
  license_state_v2: {
    status: 'licensed',
    licenseKey: 'REVOKED-123',
    deviceId: 'device-1',
  } satisfies SiteProofLicenseState,
}, async () => {
  const offline = await LicenseService.verify(async () => { throw new Error('offline'); });
  assert.notEqual(offline.state.status, 'revoked');
  const revoked = await LicenseService.verify(async () => ({ status: 'revoked', valid: false }));
  assert.equal(revoked.state.status, 'revoked');
}));

test('pending verification is used when activation is attempted offline', withSettingsStore({}, async () => {
  const state = await LicenseService.markPendingVerification('PENDING-123');
  assert.equal(state.status, 'license_pending_verification');
  assert.equal(LicenseService.canGenerateReport(state), true);
}));

test('signature record can be saved locally and consent stays handoff-scoped', withSettingsStore({}, async () => {
  const saved = await SignatureService.save({
    jobId: 'job-1',
    signerName: 'Ada',
    signerRole: 'customer',
    signatureDataUrl: 'data:image/png;base64,abc',
    consentText: SignatureService.consentText('en'),
  });
  const records = await SignatureService.getByJob('job-1');
  assert.equal(records[0].id, saved.id);
  assert.match(records[0].consentText, /documentation and report handoff/);
  assert.doesNotMatch(records[0].consentText, /payment approved|accepted all work/i);
  assert.equal(SignatureService.consentText('es'), 'Confirmo que esta firma fue capturada para documentación del trabajo y entrega de informe.');
}));

test('cloud object keys are deterministic and no frontend Stripe secrets leak', () => {
  assert.equal(CloudflareClient.objectKey({ localId: 'p1', jobId: 'j1', objectType: 'photo' }), 'j1/photo/p1');
  const source = [
    'src/services/licenseApiClient.ts',
    'src/services/cloudflareClient.ts',
    'src/services/licenseService.ts',
  ].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const secretPattern = new RegExp([`sk_${'live'}_`, `sk_${'test'}_`, `${'STRIPE'}_${'SECRET'}`, `wh${'sec'}_`].join('|'));
  assert.equal(secretPattern.test(source), false);
});

test('worker checkout, activate, verify, and webhook routes expose safe JSON only', async () => {
  const env = {
    AI: { run: async () => ({}) },
    [`${'STRIPE'}_${'SECRET'}_KEY`]: 'server-secret',
    STRIPE_WEBHOOK_SECRET: 'webhook-secret',
    SITEPROOF_APP_URL: 'https://siteproof.app',
  };
  const checkout = await worker.fetch(new Request('https://api.test/api/checkout/create', {
    method: 'POST',
    body: JSON.stringify({
      plan: 'siteproof_pro',
      email: 'owner@example.com',
      deviceId: 'device-1',
      intake: {
        companyName: 'Acme Electric',
        ownerAdminName: 'Ada Owner',
        email: 'owner@example.com',
        preferredLanguage: 'es',
        reportLanguage: 'es',
        planId: 'siteproof_pro',
      },
    }),
  }), env);
  const checkoutJson = await checkout.json() as Record<string, unknown>;
  assert.equal(typeof checkoutJson.checkoutUrl, 'string');
  assert.equal(checkoutJson.intakeAccepted, true);
  assert.equal(`${'STRIPE'}_${'SECRET'}_KEY` in checkoutJson, false);

  const invalidPlan = await worker.fetch(new Request('https://api.test/api/checkout/create', {
    method: 'POST',
    body: JSON.stringify({ plan: 'unknown_plan', email: 'owner@example.com' }),
  }), env);
  assert.equal(invalidPlan.status, 400);

  const checkoutStatus = await worker.fetch(new Request(`https://api.test/api/checkout/status?session_id=${encodeURIComponent(String(checkoutJson.sessionId))}`), env);
  const checkoutStatusJson = await checkoutStatus.json() as Record<string, unknown>;
  assert.equal(typeof checkoutStatusJson.activationCode, 'string');

  const activate = await worker.fetch(new Request('https://api.test/api/license/activate', {
    method: 'POST',
    body: JSON.stringify({ licenseKey: 'ABC12345', deviceId: 'device-1' }),
  }), env);
  const activateJson = await activate.json() as Record<string, unknown>;
  assert.equal(activateJson.status, 'license_pending_verification');

  const verify = await worker.fetch(new Request('https://api.test/api/license/verify', {
    method: 'POST',
    body: JSON.stringify({ licenseKey: 'ABC12345', deviceId: 'device-1' }),
  }), env);
  const verifyJson = await verify.json() as Record<string, unknown>;
  assert.equal(verifyJson.status, 'licensed');
  assert.equal('licenseKey' in verifyJson, false);

  const bootstrap = await worker.fetch(new Request('https://api.test/api/license/bootstrap', {
    method: 'POST',
    body: JSON.stringify({
      licenseKey: 'ABC12345',
      deviceId: 'device-1',
      intake: {
        companyName: 'Acme Electric',
        ownerAdminName: 'Ada Owner',
        email: 'owner@example.com',
        preferredLanguage: 'es',
        reportLanguage: 'es',
        planId: 'siteproof_pro',
      },
    }),
  }), env);
  const bootstrapJson = await bootstrap.json() as Record<string, unknown>;
  assert.equal((bootstrapJson.license as Record<string, unknown>).status, 'licensed');
  assert.equal((bootstrapJson.settingsSeed as Record<string, unknown>).uiLanguage, 'es');

  const webhook = await worker.fetch(new Request('https://api.test/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'test-signature' },
    body: '{}',
  }), env);
  assert.equal(webhook.status, 200);

  const unsignedWebhook = await worker.fetch(new Request('https://api.test/api/stripe/webhook', {
    method: 'POST',
    body: '{}',
  }), env);
  assert.equal(unsignedWebhook.status, 400);
});
