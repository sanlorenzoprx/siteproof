import type { LicenseState } from './licenseService';

interface CheckoutResponse {
  checkoutUrl?: string;
  url?: string;
  error?: string;
}

interface VerifyResponse {
  valid: boolean;
  status?: 'licensed' | 'revoked' | 'license_pending_verification';
  licenseId?: string;
  planId?: string;
  customerEmail?: string;
  cloudEntitled?: boolean;
  serverTime?: string;
}

function workerBaseUrl(): string {
  return import.meta.env.VITE_SITEPROOF_API_BASE_URL || '';
}

export class LicenseApiClient {
  static async createCheckout(planId = 'siteproof_pro', email?: string, deviceId?: string): Promise<CheckoutResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) return { error: 'Worker endpoint is not configured.' };
    const response = await fetch(`${baseUrl}/api/checkout/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId, email, deviceId }),
    });
    return response.json();
  }

  static async activate(state: LicenseState): Promise<VerifyResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) throw new Error('Worker endpoint is not configured.');
    const response = await fetch(`${baseUrl}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: state.licenseKey, deviceId: state.deviceId }),
    });
    if (!response.ok) throw new Error('License activation will retry when online.');
    return response.json();
  }

  static async verify(state: LicenseState): Promise<VerifyResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) throw new Error('Worker endpoint is not configured.');
    const response = await fetch(`${baseUrl}/api/license/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: state.licenseKey, deviceId: state.deviceId }),
    });
    if (!response.ok) throw new Error('License verification failed.');
    return response.json();
  }
}
