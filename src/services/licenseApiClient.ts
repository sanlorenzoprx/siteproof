import type { LicenseState } from './licenseService';
import type { SiteProofLanguage, SiteProofSettings } from '../types/settings';

export interface PurchaseIntakePayload {
  companyName: string;
  ownerAdminName: string;
  email: string;
  phone?: string;
  tradeType?: string;
  serviceArea?: string;
  businessAddress?: string;
  licenseNumber?: string;
  preferredLanguage?: SiteProofLanguage;
  reportLanguage?: SiteProofLanguage;
  crewDeviceCount?: number;
  cloudStoragePlan?: string;
  planId: string;
}

interface CheckoutResponse {
  checkoutUrl?: string;
  url?: string;
  sessionId?: string;
  successUrl?: string;
  cancelUrl?: string;
  error?: string;
}

export interface CheckoutStatusResponse {
  status: 'pending' | 'ready' | 'failed';
  planId?: string;
  licenseEmail?: string;
  activationCode?: string;
  activationLink?: string;
  cloudEntitled?: boolean;
  session?: string;
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

export interface LicenseBootstrapResponse {
  valid: boolean;
  license: {
    licenseId: string;
    status: 'licensed' | 'revoked' | 'license_pending_verification';
    planId: string;
    customerEmail: string;
    cloudEntitled: boolean;
    seatsIncluded?: number;
  };
  settingsSeed?: Partial<Pick<SiteProofSettings,
    'uiLanguage' |
    'captureLanguage' |
    'exportLanguage' |
    'companyProfile' |
    'reportDefaults' |
    'tradeWorkflowDefaults' |
    'cloudLicense'
  >>;
}

function workerBaseUrl(): string {
  return import.meta.env.VITE_SITEPROOF_API_BASE_URL || '';
}

export class LicenseApiClient {
  static async createCheckout(planId = 'siteproof_pro', email?: string, deviceId?: string, intake?: PurchaseIntakePayload): Promise<CheckoutResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) return { error: 'Worker endpoint is not configured.' };
    const response = await fetch(`${baseUrl}/api/checkout/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId, planId, email, deviceId, intake }),
    });
    return response.json();
  }

  static async bootstrap(licenseKey: string, deviceId: string, activationToken?: string): Promise<LicenseBootstrapResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) throw new Error('Worker endpoint is not configured.');
    const response = await fetch(`${baseUrl}/api/license/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, activationToken, deviceId }),
    });
    if (!response.ok) throw new Error('License bootstrap will retry when online.');
    return response.json();
  }

  static async checkoutStatus(sessionId: string, planId?: string): Promise<CheckoutStatusResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) return { status: 'failed', error: 'Worker endpoint is not configured.' };
    const params = new URLSearchParams({ session_id: sessionId });
    if (planId) params.set('plan', planId);
    const response = await fetch(`${baseUrl}/api/checkout/status?${params.toString()}`);
    if (!response.ok) return { status: 'failed', error: 'Checkout status unavailable.' };
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
