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

export interface AppUpgradeCheckoutPayload {
  offerId: 'siteproof_launch_7_license';
  licenseTier: 'crew_7';
  email?: string;
  companyName?: string;
  deviceId?: string;
  source: 'app_upgrade';
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
  status?: 'licensed' | 'revoked' | 'expired' | 'device_limit_exceeded' | 'license_pending_verification';
  licenseId?: string;
  licenseKey?: string;
  verificationCredential?: string;
  tier?: string;
  planId?: string;
  customerEmail?: string;
  seatLimit?: number;
  seatsIncluded?: number;
  trialJobLimit?: number;
  cloudEntitled?: boolean;
  cloudVaultEnabled?: boolean;
  brandedReportsEnabled?: boolean;
  currentPeriodEndsAt?: string;
  serverTime?: string;
  error?: string;
}

export interface LicenseBootstrapResponse {
  valid: boolean;
  license: {
    licenseId: string;
    status: 'licensed' | 'revoked' | 'expired' | 'device_limit_exceeded' | 'license_pending_verification';
    tier?: string;
    planId: string;
    customerEmail: string;
    cloudEntitled: boolean;
    cloudVaultEnabled?: boolean;
    brandedReportsEnabled?: boolean;
    seatsIncluded?: number;
    seatLimit?: number;
    trialJobLimit?: number;
    currentPeriodEndsAt?: string;
    licenseKey?: string;
    verificationCredential?: string;
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

export const SITEPROOF_API_BASE_URL_SETUP_MESSAGE =
  'SiteProof purchase/license API is not configured. Set VITE_SITEPROOF_API_BASE_URL to http://localhost:8787 for local Worker testing or https://api.siteproof.report in production.';

function workerBaseUrl(): string {
  return (import.meta.env.VITE_SITEPROOF_API_BASE_URL || '').trim().replace(/\/+$/, '');
}

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const payload = await response.json().catch(() => ({})) as T;
  const errorMessage = typeof payload === 'object' && payload && 'error' in payload ? String(payload.error || '') : '';
  if (!response.ok) throw new Error(errorMessage || fallbackError);
  return payload;
}

async function fetchJson<T>(input: RequestInfo | URL, init: RequestInit | undefined, fallbackError: string): Promise<T> {
  try {
    const response = await fetch(input, init);
    return await parseJsonResponse<T>(response, fallbackError);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error(fallbackError);
  }
}

export class LicenseApiClient {
  static async createCheckout(payload: Partial<AppUpgradeCheckoutPayload> = {}): Promise<CheckoutResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) return { error: SITEPROOF_API_BASE_URL_SETUP_MESSAGE };
    const checkoutPayload: AppUpgradeCheckoutPayload = {
      offerId: 'siteproof_launch_7_license',
      licenseTier: 'crew_7',
      source: 'app_upgrade',
      ...payload,
    };
    try {
      return await fetchJson<CheckoutResponse>(`${baseUrl}/api/checkout/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload),
      }, 'Checkout is unavailable. Check that the SiteProof purchase/license API is running and reachable.');
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Checkout is unavailable. Check the SiteProof purchase/license API connection.' };
    }
  }

  static async bootstrap(licenseKey: string, deviceId: string, activationToken?: string): Promise<LicenseBootstrapResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) throw new Error(SITEPROOF_API_BASE_URL_SETUP_MESSAGE);
    return fetchJson<LicenseBootstrapResponse>(`${baseUrl}/api/license/bootstrap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey, activationToken, deviceId }),
    }, 'License setup will retry when the SiteProof purchase/license API is reachable.');
  }

  static async activateWithToken(activationToken: string, deviceId: string, deviceLabel?: string): Promise<VerifyResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) throw new Error(SITEPROOF_API_BASE_URL_SETUP_MESSAGE);
    return fetchJson<VerifyResponse>(`${baseUrl}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activationToken, deviceId, deviceLabel }),
    }, 'License activation will retry when the SiteProof purchase/license API is reachable.');
  }

  static async checkoutStatus(sessionId: string, planId?: string): Promise<CheckoutStatusResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) return { status: 'failed', error: SITEPROOF_API_BASE_URL_SETUP_MESSAGE };
    const params = new URLSearchParams({ session_id: sessionId });
    if (planId) params.set('plan', planId);
    try {
      return await fetchJson<CheckoutStatusResponse>(`${baseUrl}/api/checkout/status?${params.toString()}`, undefined, 'Checkout status is unavailable. Check that the SiteProof purchase/license API is running and reachable.');
    } catch (error) {
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Checkout status is unavailable. Check the SiteProof purchase/license API connection.',
      };
    }
  }

  static async activate(state: LicenseState): Promise<VerifyResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) throw new Error(SITEPROOF_API_BASE_URL_SETUP_MESSAGE);
    return fetchJson<VerifyResponse>(`${baseUrl}/api/license/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: state.licenseKey, deviceId: state.deviceId, deviceLabel: state.deviceLabel }),
    }, 'License activation will retry when the SiteProof purchase/license API is reachable.');
  }

  static async verify(state: LicenseState): Promise<VerifyResponse> {
    const baseUrl = workerBaseUrl();
    if (!baseUrl) throw new Error(SITEPROOF_API_BASE_URL_SETUP_MESSAGE);
    return fetchJson<VerifyResponse>(`${baseUrl}/api/license/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ licenseKey: state.licenseKey, deviceId: state.deviceId }),
    }, 'License verification failed. Check that the SiteProof purchase/license API is running and reachable.');
  }
}
