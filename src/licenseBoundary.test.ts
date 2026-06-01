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
  assert.equal(state.trialJobLimit, 3);
  assert.equal(state.trialJobsCreatedCount, 0);
  assert.deepEqual(state.trialConsumedJobIds, []);
  assert.equal(LicenseService.canCreateJob(state), true);
  assert.equal(LicenseService.canGenerateReport(state), true);
}));

test('trial records three free jobs locally and blocks the fourth even offline', withSettingsStore({}, async () => {
  const first = await LicenseService.recordTrialJobCreated('job-1');
  assert.equal(first.trialJobsCreatedCount, 1);
  assert.equal(LicenseService.canCreateJob(first), true);

  const duplicate = await LicenseService.recordTrialJobCreated('job-1');
  assert.equal(duplicate.trialJobsCreatedCount, 1);

  const second = await LicenseService.recordTrialJobCreated('job-2');
  assert.equal(LicenseService.canCreateJob(second), true);
  const third = await LicenseService.recordTrialJobCreated('job-3');
  assert.equal(third.trialJobsCreatedCount, 3);
  assert.equal(third.status, 'trial_expired');
  assert.equal(LicenseService.canCreateJob(third), false);
  assert.match(LicenseService.getTrialStatusMessage(third), /3 free jobs are used/);
}));

test('expired trial blocks new reports without deleting data', withSettingsStore({
  license_state_v2: {
    status: 'trial_active',
    trialStartedAt: '2026-04-01T00:00:00.000Z',
    trialEndsAt: '2026-05-01T00:00:00.000Z',
    trialJobLimit: 3,
    trialJobsCreatedCount: 1,
    trialConsumedJobIds: ['job-1'],
    deviceId: 'device-1',
  } satisfies SiteProofLicenseState,
}, async () => {
  const state = await LicenseService.getLicenseState(new Date('2026-05-15T00:00:00.000Z'));
  assert.equal(state.status, 'trial_expired');
  assert.equal(LicenseService.canGenerateReport(state), false);
  assert.match(LicenseService.getTrialStatusMessage(state, new Date('2026-05-15T00:00:00.000Z')), /30-day field trial has ended/);
}));

test('licensed state overrides trial day and free job limits', withSettingsStore({
  license_state_v2: {
    status: 'licensed',
    licenseKey: 'ABC12345',
    deviceId: 'device-1',
    trialStartedAt: '2026-04-01T00:00:00.000Z',
    trialEndsAt: '2026-05-01T00:00:00.000Z',
    trialJobLimit: 3,
    trialJobsCreatedCount: 3,
    trialConsumedJobIds: ['job-1', 'job-2', 'job-3'],
  } satisfies SiteProofLicenseState,
}, async () => {
  const state = await LicenseService.getLicenseState(new Date('2026-05-15T00:00:00.000Z'));
  assert.equal(state.status, 'licensed');
  assert.equal(LicenseService.canCreateJob(state), true);
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
  assert.equal(CloudflareClient.objectKey({ ownerId: 'owner-1', localId: 'p1', jobId: 'j1', objectType: 'photo' }), 'owners/owner-1/jobs/j1/photo/p1');
  assert.equal(CloudflareClient.objectKey({ ownerId: 'owner-1', localId: 'r1', jobId: 'j1', objectType: 'report', reportType: 'inspection_readiness' }), 'owners/owner-1/jobs/j1/reports/inspection_readiness/r1.pdf');
  assert.equal(CloudflareClient.objectKey({ ownerId: 'owner-1', localId: 'v1', jobId: 'j1', objectType: 'video' }), 'owners/owner-1/jobs/j1/videos/v1.webm');
  assert.equal(CloudflareClient.objectKey({ ownerId: 'owner-1', localId: 'd1', jobId: 'j1', objectType: 'document' }), 'owners/owner-1/jobs/j1/document/d1');
  assert.equal(CloudflareClient.objectKey({ ownerId: 'owner-1', localId: 'm1', jobId: 'j1', objectType: 'metadata' }), 'owners/owner-1/jobs/j1/metadata/m1.json');
  assert.equal(CloudflareClient.objectKey({ ownerId: 'owner-1', localId: 'voice1', jobId: 'j1', objectType: 'voice_note' }), 'owners/owner-1/jobs/j1/voice_notes/voice1.webm');
  assert.equal(CloudflareClient.defaultVisibility({ localId: 'b1', jobId: 'j1', objectType: 'bid_report', reportType: 'internal_bid_report' }), 'internal_only');
  assert.equal(CloudflareClient.defaultVisibility({ localId: 'b2', jobId: 'j1', objectType: 'bid_report', reportType: 'customer_bid_report' }), 'customer_visible');
  const source = [
    'src/services/licenseApiClient.ts',
    'src/services/cloudflareClient.ts',
    'src/services/licenseService.ts',
  ].map((file) => fs.readFileSync(file, 'utf8')).join('\n');
  const secretPattern = new RegExp([`sk_${'live'}_`, `sk_${'test'}_`, `${'STRIPE'}_${'SECRET'}`, `wh${'sec'}_`].join('|'));
  assert.equal(secretPattern.test(source), false);
});

test('app worker no longer serves billing routes and cloud routes expose safe JSON only', async () => {
  const env = {
    AI: { run: async () => ({}) },
    SITEPROOF_APP_URL: 'https://siteproof.app',
  };
  const movedRoutes = [
    new Request('https://api.test/api/checkout/create', { method: 'POST', body: '{}' }),
    new Request('https://api.test/api/checkout/status?session_id=cs_test'),
    new Request('https://api.test/api/license/activate', { method: 'POST', body: JSON.stringify({ licenseKey: 'ABC12345', deviceId: 'device-1' }) }),
    new Request('https://api.test/api/license/bootstrap', { method: 'POST', body: JSON.stringify({ licenseKey: 'ABC12345', deviceId: 'device-1' }) }),
    new Request('https://api.test/api/license/verify', { method: 'POST', body: JSON.stringify({ licenseKey: 'ABC12345', deviceId: 'device-1' }) }),
    new Request('https://api.test/api/stripe/webhook', { method: 'POST', body: '{}' }),
  ];
  for (const request of movedRoutes) {
    const response = await worker.fetch(request, env);
    const json = await response.json() as Record<string, unknown>;
    assert.equal(response.status, 404);
    assert.equal(json.error, 'Not found');
    assert.equal('checkoutUrl' in json, false);
    assert.equal(json.status, undefined);
    assert.equal(json.valid, undefined);
  }

  const uploadUrl = await worker.fetch(new Request('https://api.test/cloud/upload-url', {
    method: 'POST',
    headers: { 'x-siteproof-owner-id': 'owner-1' },
    body: JSON.stringify({
      jobId: 'job-1',
      objectId: 'photo-1',
      objectType: 'photo',
      visibility: 'private',
      contentType: 'image/jpeg',
      fileSize: 123,
      sha256: 'abc123',
    }),
  }), env);
  const uploadJson = await uploadUrl.json() as Record<string, unknown>;
  assert.equal(uploadUrl.status, 200);
  assert.match(String(uploadJson.storageKey), /^owners\/owner-1\/jobs\/job-1\/photo\/photo-1$/);

  const badUpload = await worker.fetch(new Request('https://api.test/cloud/upload-url', {
    method: 'POST',
    body: JSON.stringify({ jobId: 'job-1', objectId: 'x', objectType: 'unknown_type', visibility: 'private', contentType: 'text/plain', fileSize: 1, sha256: 'abc' }),
  }), env);
  assert.equal(badUpload.status, 400);

  const metadataUpload = await worker.fetch(new Request('https://api.test/api/cloud/upload-url', {
    method: 'POST',
    headers: { 'x-siteproof-owner-id': 'owner-1' },
    body: JSON.stringify({
      jobId: 'job-1',
      proofObjectId: 'meta-1',
      objectType: 'metadata',
      visibility: 'private',
      mimeType: 'application/json',
      filename: 'metadata.json',
      fileSize: 12,
      checksum: 'abc123meta',
    }),
  }), env);
  const metadataJson = await metadataUpload.json() as Record<string, unknown>;
  assert.equal(metadataUpload.status, 200);
  assert.match(String(metadataJson.storageKey), /metadata\/meta-1\.json$/);

  const bidUpload = await worker.fetch(new Request('https://api.test/cloud/upload-url', {
    method: 'POST',
    headers: { 'x-siteproof-owner-id': 'owner-1' },
    body: JSON.stringify({
      jobId: 'job-1',
      objectId: 'bid-1',
      objectType: 'bid_report',
      reportType: 'internal_bid_report',
      visibility: 'internal_only',
      contentType: 'application/pdf',
      fileSize: 456,
      sha256: 'def456',
    }),
  }), env);
  const bidJson = await bidUpload.json() as Record<string, unknown>;
  assert.match(String(bidJson.storageKey), /reports\/internal_bid_report\/bid-1\.pdf$/);

  const share = await worker.fetch(new Request('https://api.test/cloud/share-links', {
    method: 'POST',
    headers: { 'x-siteproof-owner-id': 'owner-1' },
    body: JSON.stringify({ jobId: 'job-1' }),
  }), env);
  const shareJson = await share.json() as Record<string, unknown>;
  assert.equal(share.status, 200);
  assert.equal(Array.isArray(shareJson.objects), true);
});
