import assert from 'node:assert/strict';
import test from 'node:test';
import { LicenseApiClient, SITEPROOF_LICENSE_API_BASE_URL_SETUP_MESSAGE } from './licenseApiClient';

test('license api client fails with explicit license env guidance when license base URL is missing', async () => {
  const meta = import.meta as unknown as { env?: Record<string, unknown> };
  const originalEnv = meta.env;
  const nextEnv: Record<string, unknown> = { ...(originalEnv ?? {}) };
  delete nextEnv.VITE_SITEPROOF_LICENSE_API_BASE_URL;
  meta.env = nextEnv;
  try {
    const checkout = await LicenseApiClient.createCheckout();
    assert.equal(checkout.error, SITEPROOF_LICENSE_API_BASE_URL_SETUP_MESSAGE);
    assert.match(checkout.error ?? '', /VITE_SITEPROOF_LICENSE_API_BASE_URL/);
    assert.doesNotMatch(checkout.error ?? '', /VITE_SITEPROOF_API_BASE_URL/);
  } finally {
    meta.env = originalEnv;
  }
});
