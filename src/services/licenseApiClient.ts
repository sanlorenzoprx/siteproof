import type { LicenseState } from './licenseService';

interface CheckoutResponse {
  url?: string;
  error?: string;
}

interface VerifyResponse {
  valid: boolean;
  planId?: string;
  customerEmail?: string;
  cloudEntitled?: boolean;
}

function workerBaseUrl(): string {
  return import.meta.env.VITE_SITEPROOF_API_BASE_URL || '';
}

export class LicenseApiClient {
  static async createCheckout(planId = 'core'): Promise<CheckoutResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) return { error: 'Worker endpoint is not configured.' };
    const response = await fetch(`${baseUrl}/checkout/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId }),
    });
    return response.json();
  }

  static async verify(state: LicenseState): Promise<VerifyResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) throw new Error('Worker endpoint is not configured.');
    const response = await fetch(`${baseUrl}/license/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: state.licenseKey, deviceId: state.deviceId }),
    });
    if (!response.ok) throw new Error('License verification failed.');
    return response.json();
  }
}
