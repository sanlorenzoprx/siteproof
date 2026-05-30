import { handleAiRoute, jsonHeaders, jsonResponse, readJson } from './ai/aiRouter';
import { WorkerEnv } from './ai/types';
import { WorkersAiProvider } from './ai/workersAiProvider';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  return typeof value[key] === 'string' ? value[key] as string : undefined;
}

function numberField(value: Record<string, unknown>, key: string): number | undefined {
  return typeof value[key] === 'number' && Number.isFinite(value[key]) ? value[key] as number : undefined;
}

function languageField(value: Record<string, unknown>, key: string): 'en' | 'es' | undefined {
  const language = stringField(value, key);
  return language === 'en' || language === 'es' ? language : undefined;
}

const PLAN_ALLOWLIST = new Set(['siteproof_pro', 'core', 'branded_reports']);

function isValidEmail(value?: string): boolean {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
}

function activationCodeFromSession(sessionId: string): string {
  return `SP-${sessionId.replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase().padStart(10, '0')}`;
}

function redactedSession(sessionId?: string): string | undefined {
  return sessionId ? `...${sessionId.slice(-6)}` : undefined;
}

function normalizePurchaseIntake(body: Record<string, unknown>, plan: string) {
  const raw = isRecord(body.intake) ? body.intake : null;
  if (!raw) return null;
  const companyName = stringField(raw, 'companyName')?.trim();
  const ownerAdminName = stringField(raw, 'ownerAdminName')?.trim();
  const email = stringField(raw, 'email')?.trim() || stringField(body, 'email')?.trim();
  const planId = stringField(raw, 'planId')?.trim() || plan;
  if (!companyName || !ownerAdminName || !email || !planId) {
    return { error: 'intake.companyName, intake.ownerAdminName, intake.email, and intake.planId are required' };
  }
  if (!isValidEmail(email)) return { error: 'A valid intake.email is required' };
  return {
    companyName,
    ownerAdminName,
    email,
    phone: stringField(raw, 'phone') ?? '',
    tradeType: stringField(raw, 'tradeType') ?? '',
    serviceArea: stringField(raw, 'serviceArea') ?? '',
    businessAddress: stringField(raw, 'businessAddress') ?? '',
    licenseNumber: stringField(raw, 'licenseNumber') ?? '',
    preferredLanguage: languageField(raw, 'preferredLanguage') ?? 'en',
    reportLanguage: languageField(raw, 'reportLanguage') ?? 'en',
    crewDeviceCount: numberField(raw, 'crewDeviceCount') ?? 1,
    cloudStoragePlan: stringField(raw, 'cloudStoragePlan') ?? '',
    planId,
  };
}

function dbBinding(env: WorkerEnv): { prepare?: (sql: string) => { bind: (...values: unknown[]) => { run: () => Promise<unknown>; first?: () => Promise<unknown> } } } | undefined {
  return (env.SITEPROOF_DB ?? env.DB) as ReturnType<typeof dbBinding>;
}

async function durableRun(env: WorkerEnv, sql: string, ...values: unknown[]): Promise<void> {
  const db = dbBinding(env);
  if (!db?.prepare) return;
  await db.prepare(sql).bind(...values).run();
}

async function durableFirst<T>(env: WorkerEnv, sql: string, ...values: unknown[]): Promise<T | null> {
  const db = dbBinding(env);
  const statement = db?.prepare?.(sql).bind(...values);
  if (!statement?.first) return null;
  return await statement.first() as T | null;
}

async function recordCheckout(env: WorkerEnv, input: {
  sessionId: string;
  licenseKey: string;
  planId: string;
  email: string;
  intake: Exclude<ReturnType<typeof normalizePurchaseIntake>, null | { error: string }> | null;
}) {
  const now = new Date().toISOString();
  await durableRun(
    env,
    'INSERT OR IGNORE INTO purchase_intake_events (id, checkout_session_id, license_id, event_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    randomId('evt'),
    input.sessionId,
    null,
    'checkout_created',
    JSON.stringify({ planId: input.planId, email: input.email, intake: input.intake }),
    now,
  );
}

async function fulfillCheckout(env: WorkerEnv, input: {
  sessionId: string;
  eventId: string;
  planId: string;
  email: string;
  intake: Exclude<ReturnType<typeof normalizePurchaseIntake>, null | { error: string }> | null;
}) {
  const existing = await durableFirst<{ id: string }>(env, 'SELECT id FROM license_events WHERE id = ?', input.eventId);
  if (existing) return;
  const now = new Date().toISOString();
  const licenseId = `lic_${input.sessionId.slice(-12)}`;
  const licenseKeyHash = `sandbox_${input.sessionId.slice(-16)}`;
  await durableRun(
    env,
    'INSERT OR REPLACE INTO licenses (id, email, license_key_hash, status, stripe_checkout_session_id, max_devices, created_at, activated_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    licenseId,
    input.email,
    licenseKeyHash,
    'licensed',
    input.sessionId,
    input.intake?.crewDeviceCount ?? 1,
    now,
    now,
    now,
  );
  if (input.intake) {
    await durableRun(
      env,
      'INSERT OR REPLACE INTO company_profiles (id, license_id, company_name, owner_admin_name, email, phone, trade_type, service_area, business_address, license_number, preferred_language, report_language, crew_device_count, cloud_storage_plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      `cp_${licenseId}`,
      licenseId,
      input.intake.companyName,
      input.intake.ownerAdminName,
      input.intake.email,
      input.intake.phone,
      input.intake.tradeType,
      input.intake.serviceArea,
      input.intake.businessAddress,
      input.intake.licenseNumber,
      input.intake.preferredLanguage,
      input.intake.reportLanguage,
      input.intake.crewDeviceCount,
      input.intake.cloudStoragePlan,
      now,
      now,
    );
  }
  await durableRun(
    env,
    'INSERT INTO license_events (id, license_id, event_type, metadata_json, created_at) VALUES (?, ?, ?, ?, ?)',
    input.eventId,
    licenseId,
    'checkout_completed',
    JSON.stringify({ sessionId: redactedSession(input.sessionId), planId: input.planId }),
    now,
  );
}

function settingsSeedFromIntake(intake: ReturnType<typeof normalizePurchaseIntake>) {
  if (!intake || 'error' in intake) return undefined;
  return {
    uiLanguage: intake.preferredLanguage,
    captureLanguage: intake.preferredLanguage,
    exportLanguage: intake.reportLanguage,
    companyProfile: {
      companyName: intake.companyName,
      ownerAdminName: intake.ownerAdminName,
      businessPhone: intake.phone,
      businessEmail: intake.email,
      businessAddress: intake.businessAddress,
      website: '',
      licenseNumber: intake.licenseNumber || null,
      serviceArea: intake.serviceArea,
      primaryTrade: intake.tradeType,
    },
    reportDefaults: {
      defaultReportLanguage: intake.reportLanguage,
    },
    tradeWorkflowDefaults: {
      primaryTrade: intake.tradeType,
    },
    cloudLicense: {
      licenseStatus: 'licensed',
      planId: intake.planId,
      includedCloudStorage: intake.cloudStoragePlan || null,
      cloudEnabled: Boolean(intake.cloudStoragePlan),
      cloudSyncStatus: intake.cloudStoragePlan ? 'pending' : 'off',
      seatsIncluded: intake.crewDeviceCount,
      shareLinkDefaultVisibility: 'private',
    },
  };
}

async function createStripeCheckoutSession(env: WorkerEnv, input: {
  plan: string;
  email?: string;
  successUrl: string;
  cancelUrl: string;
  intake: Exclude<ReturnType<typeof normalizePurchaseIntake>, null | { error: string }> | null;
}): Promise<{ id: string; url: string }> {
  if (!env.STRIPE_SECRET_KEY?.startsWith('sk_')) {
    const id = randomId('cs_test');
    return { id, url: `${input.successUrl.replace('{CHECKOUT_SESSION_ID}', encodeURIComponent(id))}` };
  }

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('success_url', input.successUrl);
  form.set('cancel_url', input.cancelUrl);
  form.set('client_reference_id', input.intake?.email ?? input.email ?? '');
  if (input.email) form.set('customer_email', input.email);
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][product_data][name]', `SiteProof ${input.plan}`);
  form.set('line_items[0][price_data][unit_amount]', input.plan === 'branded_reports' ? '4900' : '9900');
  form.set('metadata[planId]', input.plan);
  if (input.intake) {
    form.set('metadata[email]', input.intake.email);
    form.set('metadata[companyName]', input.intake.companyName);
    form.set('metadata[ownerAdminName]', input.intake.ownerAdminName);
    form.set('metadata[intakeJson]', JSON.stringify(input.intake).slice(0, 450));
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  if (!response.ok) throw new Error('Stripe checkout session could not be created');
  const json = await response.json() as { id?: string; url?: string };
  if (!json.id || !json.url) throw new Error('Stripe checkout response was incomplete');
  return { id: json.id, url: json.url };
}

async function routeBoundary(pathname: string, request: Request, env: WorkerEnv): Promise<Response | null> {
  if (request.method === 'GET' && (pathname === '/health' || pathname === '/api/health')) {
    return jsonResponse({ ok: true, service: 'siteproof-cloudflare-api' });
  }

  if (request.method === 'GET' && (pathname === '/checkout/status' || pathname === '/api/checkout/status')) {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id') || '';
    if (!sessionId) return jsonResponse({ error: 'session_id is required' }, 400);
    const existing = await durableFirst<{ id: string; email?: string; status?: string }>(env, 'SELECT id, email, status FROM licenses WHERE stripe_checkout_session_id = ?', sessionId);
    const licenseKey = activationCodeFromSession(sessionId);
    return jsonResponse({
      status: existing ? 'ready' : 'pending',
      planId: url.searchParams.get('plan') || 'siteproof_pro',
      licenseEmail: existing?.email ?? '',
      activationCode: licenseKey,
      activationLink: `${(env.SITEPROOF_APP_URL || 'https://siteproof.app').replace(/\/$/, '')}/?license=${encodeURIComponent(licenseKey)}&token=${encodeURIComponent(sessionId)}`,
      cloudEntitled: true,
      session: redactedSession(sessionId),
    });
  }

  const body = ['POST'].includes(request.method) ? await readJson(request) : {};
  if (!isRecord(body)) return jsonResponse({ error: 'Invalid JSON body' }, 400);

  if (request.method === 'POST' && (pathname === '/checkout/create' || pathname === '/api/checkout/create')) {
    const plan = stringField(body, 'plan') ?? stringField(body, 'planId');
    if (!plan) return jsonResponse({ error: 'plan is required' }, 400);
    if (!PLAN_ALLOWLIST.has(plan)) return jsonResponse({ error: 'Unsupported plan' }, 400);
    const intake = normalizePurchaseIntake(body, plan);
    if (intake && 'error' in intake) return jsonResponse({ error: intake.error }, 400);
    const validIntake = intake && !('error' in intake) ? intake : null;
    const email = validIntake ? validIntake.email : stringField(body, 'email');
    if (email && !isValidEmail(email)) return jsonResponse({ error: 'A valid email is required' }, 400);
    if (!env.STRIPE_SECRET_KEY) return jsonResponse({ error: 'Stripe is not configured' }, 503);
    const appUrl = env.SITEPROOF_APP_URL || env.CHECKOUT_SUCCESS_URL || 'https://siteproof.app';
    const thankYouBase = env.CHECKOUT_SUCCESS_URL || `${appUrl.replace(/\/$/, '')}/checkout/siteproof`;
    const successUrl = `${thankYouBase}${thankYouBase.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}&plan=${encodeURIComponent(plan)}`;
    const cancelUrl = env.CHECKOUT_CANCEL_URL || `${appUrl.replace(/\/$/, '')}/license?checkout=cancelled`;
    const session = await createStripeCheckoutSession(env, { plan, email, successUrl, cancelUrl, intake: validIntake });
    await recordCheckout(env, {
      sessionId: session.id,
      licenseKey: activationCodeFromSession(session.id),
      planId: plan,
      email: email ?? '',
      intake: validIntake,
    });
    return jsonResponse({
      checkoutUrl: session.url,
      sessionId: session.id,
      successUrl,
      cancelUrl,
      intakeAccepted: Boolean(validIntake),
      metadata: validIntake ? {
        companyName: validIntake.companyName,
        ownerAdminName: validIntake.ownerAdminName,
        email: validIntake.email,
        planId: validIntake.planId,
      } : undefined,
    });
  }

  if (request.method === 'POST' && (pathname === '/stripe/webhook' || pathname === '/api/stripe/webhook')) {
    if (!env.STRIPE_WEBHOOK_SECRET) return jsonResponse({ error: 'Stripe webhook is not configured' }, 503);
    if (!request.headers.get('stripe-signature')) return jsonResponse({ error: 'Missing Stripe signature' }, 400);
    const eventId = stringField(body, 'id') ?? randomId('stripe_evt');
    const eventType = stringField(body, 'type') ?? 'checkout.session.completed';
    const data = isRecord(body.data) && isRecord(body.data.object) ? body.data.object : body;
    const sessionId = stringField(data, 'id') ?? stringField(body, 'checkoutSessionId') ?? randomId('cs_test');
    const metadata = isRecord(data.metadata) ? data.metadata : {};
    const planId = stringField(metadata, 'planId') ?? stringField(body, 'planId') ?? 'siteproof_pro';
    const email = stringField(metadata, 'email') ?? stringField(data, 'customer_email') ?? stringField(body, 'email') ?? '';
    let intake: ReturnType<typeof normalizePurchaseIntake> = null;
    const intakeJson = stringField(metadata, 'intakeJson');
    if (intakeJson) {
      try {
        const parsed = JSON.parse(intakeJson);
        intake = normalizePurchaseIntake({ intake: parsed }, planId);
      } catch {
        intake = null;
      }
    }
    if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') {
      await fulfillCheckout(env, {
        sessionId,
        eventId,
        planId,
        email,
        intake: intake && !('error' in intake) ? intake : null,
      });
    }
    return jsonResponse({ received: true, eventType, session: redactedSession(sessionId) });
  }

  if (request.method === 'POST' && (pathname === '/license/activate' || pathname === '/api/license/activate')) {
    const licenseKey = stringField(body, 'licenseKey');
    const deviceId = stringField(body, 'deviceId');
    if (!licenseKey || !deviceId) return jsonResponse({ error: 'licenseKey and deviceId are required' }, 400);
    return jsonResponse({
      status: 'license_pending_verification',
      licenseId: `lic_${licenseKey.slice(-6)}`,
      deviceAllowed: true,
      serverTime: new Date().toISOString(),
    }, 202);
  }

  if (request.method === 'POST' && (pathname === '/license/bootstrap' || pathname === '/api/license/bootstrap')) {
    const licenseKey = stringField(body, 'licenseKey');
    const deviceId = stringField(body, 'deviceId');
    if (!licenseKey || !deviceId) return jsonResponse({ error: 'licenseKey and deviceId are required' }, 400);
    const revoked = licenseKey.toLowerCase().includes('revoked');
    const intake = normalizePurchaseIntake(body, stringField(body, 'planId') ?? 'siteproof_pro');
    if (intake && 'error' in intake) return jsonResponse({ error: intake.error }, 400);
    return jsonResponse({
      valid: !revoked,
      license: {
        licenseId: `lic_${licenseKey.slice(-6)}`,
        status: revoked ? 'revoked' : 'licensed',
        planId: intake && !('error' in intake) ? intake.planId : 'siteproof_pro',
        customerEmail: intake && !('error' in intake) ? intake.email : stringField(body, 'email') ?? '',
        cloudEntitled: revoked ? false : true,
        seatsIncluded: intake && !('error' in intake) ? intake.crewDeviceCount : 1,
      },
      settingsSeed: settingsSeedFromIntake(intake) ?? {
        uiLanguage: 'en',
        captureLanguage: 'en',
        exportLanguage: 'en',
        cloudLicense: {
          licenseStatus: revoked ? 'revoked' : 'licensed',
          planId: 'siteproof_pro',
          cloudEnabled: !revoked,
          cloudSyncStatus: revoked ? 'off' : 'pending',
          seatsIncluded: 1,
          shareLinkDefaultVisibility: 'private',
        },
      },
      serverTime: new Date().toISOString(),
    }, revoked ? 403 : 200);
  }

  if (request.method === 'POST' && (pathname === '/license/verify' || pathname === '/api/license/verify')) {
    const licenseKey = stringField(body, 'licenseKey');
    const deviceId = stringField(body, 'deviceId');
    if (!licenseKey || !deviceId) return jsonResponse({ error: 'licenseKey and deviceId are required' }, 400);
    const revoked = licenseKey.toLowerCase().includes('revoked');
    return jsonResponse({
      valid: !revoked,
      status: revoked ? 'revoked' : 'licensed',
      licenseId: `lic_${licenseKey.slice(-6)}`,
      deviceAllowed: !revoked,
      serverTime: new Date().toISOString(),
    });
  }

  if (request.method === 'POST' && pathname === '/cloud/upload-url') {
    const jobId = stringField(body, 'jobId');
    const localId = stringField(body, 'localId');
    const objectType = stringField(body, 'objectType');
    if (!jobId || !localId || !objectType) return jsonResponse({ error: 'jobId, localId, and objectType are required' }, 400);
    return jsonResponse({ error: 'R2 upload URL generation requires deployment configuration' }, 501);
  }

  if (request.method === 'POST' && pathname === '/cloud/commit-upload') {
    if (!stringField(body, 'objectKey')) return jsonResponse({ error: 'objectKey is required' }, 400);
    return jsonResponse({ accepted: true }, 202);
  }

  if (request.method === 'GET' && pathname.startsWith('/cloud/job/')) {
    return jsonResponse({ objects: [] });
  }

  return null;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: jsonHeaders });

    const boundary = await routeBoundary(url.pathname, request, env);
    if (boundary) return boundary;

    if (url.pathname === '/api/ai/health') return jsonResponse({ ok: true, service: 'siteproof-cloudflare-api' });
    if (url.pathname.startsWith('/api/ai/')) {
      try {
        const provider = new WorkersAiProvider(env.AI, env);
        return await handleAiRoute(url.pathname, await readJson(request), provider);
      } catch (error) {
        console.error('[siteproof-ai]', error);
        return jsonResponse({ error: 'AI unavailable' }, 503);
      }
    }
    return jsonResponse({ error: 'Not found' }, 404);
  },
};
