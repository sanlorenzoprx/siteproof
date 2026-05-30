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
const CLOUD_OBJECT_TYPES = new Set(['photo', 'document', 'video', 'signature', 'transcript', 'report', 'bid_report', 'thumbnail', 'share_package']);
const CLOUD_REPORT_TYPES = new Set(['customer_completion', 'daily_job_proof', 'inspection_readiness', 'change_order_evidence', 'photo_proof_timeline', 'payment_final_handoff', 'office_internal_job_record', 'all_reports', 'internal_bid_report', 'customer_bid_report']);
const CLOUD_VISIBILITIES = new Set(['private', 'internal_only', 'customer_visible', 'hidden_do_not_export']);

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

function ownerIdFromRequest(request: Request, body?: Record<string, unknown>): string {
  const auth = request.headers.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
  return stringField(body ?? {}, 'ownerId') || request.headers.get('x-siteproof-owner-id') || bearer || 'sandbox-owner';
}

function cloudObjectStorageKey(input: { ownerId: string; jobId: string; objectId: string; objectType: string; reportType?: string; contentType?: string }) {
  const objectId = input.objectId.replace(/[^a-zA-Z0-9_.-]/g, '_');
  if (input.objectType === 'report' && input.reportType) return `owners/${input.ownerId}/jobs/${input.jobId}/reports/${input.reportType}/${objectId}.pdf`;
  if (input.objectType === 'bid_report' && input.reportType) return `owners/${input.ownerId}/jobs/${input.jobId}/reports/${input.reportType}/${objectId}.pdf`;
  if (input.objectType === 'video') return `owners/${input.ownerId}/jobs/${input.jobId}/videos/${objectId}.${input.contentType?.includes('mp4') ? 'mp4' : 'webm'}`;
  if (input.objectType === 'thumbnail') return `owners/${input.ownerId}/jobs/${input.jobId}/thumbnails/${objectId}.jpg`;
  return `owners/${input.ownerId}/jobs/${input.jobId}/${input.objectType}/${objectId}`;
}

function cloudObjectFromBody(body: Record<string, unknown>, request: Request) {
  const jobId = stringField(body, 'jobId');
  const objectId = stringField(body, 'objectId') ?? stringField(body, 'localId');
  const objectType = stringField(body, 'objectType');
  const reportType = stringField(body, 'reportType');
  const visibility = stringField(body, 'visibility') ?? 'private';
  const contentType = stringField(body, 'contentType') ?? 'application/octet-stream';
  const fileSize = numberField(body, 'fileSize') ?? 0;
  const sha256 = stringField(body, 'sha256');
  if (!jobId || !objectId || !objectType || !sha256) return { error: 'jobId, objectId, objectType, and sha256 are required' };
  if (!CLOUD_OBJECT_TYPES.has(objectType)) return { error: 'Unsupported objectType' };
  if (reportType && !CLOUD_REPORT_TYPES.has(reportType)) return { error: 'Unsupported reportType' };
  if (!CLOUD_VISIBILITIES.has(visibility)) return { error: 'Unsupported visibility' };
  if ((objectType === 'report' || objectType === 'bid_report') && !reportType) return { error: 'reportType is required for report objects' };
  const ownerId = ownerIdFromRequest(request, body);
  return {
    id: `co_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
    ownerId,
    jobId,
    objectId,
    objectType,
    reportType,
    visibility,
    contentType,
    fileSize,
    sha256,
    storageKey: cloudObjectStorageKey({ ownerId, jobId, objectId, objectType, reportType, contentType }),
  };
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

async function durableAll<T>(env: WorkerEnv, sql: string, ...values: unknown[]): Promise<T[]> {
  const db = dbBinding(env);
  const statement = db?.prepare?.(sql).bind(...values);
  if (!statement || !('all' in statement) || typeof statement.all !== 'function') return [];
  const result = await statement.all() as { results?: T[] };
  return result.results ?? [];
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

  if (request.method === 'POST' && (pathname === '/cloud/upload-url' || pathname === '/api/cloud/upload-url')) {
    const parsed = cloudObjectFromBody(body, request);
    if ('error' in parsed) return jsonResponse({ error: parsed.error }, 400);
    const now = new Date().toISOString();
    await durableRun(
      env,
      'INSERT OR REPLACE INTO cloud_storage_objects (id, owner_id, job_id, object_type, report_type, visibility, storage_key, content_type, file_size, sha256, sync_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      parsed.id,
      parsed.ownerId,
      parsed.jobId,
      parsed.objectType,
      parsed.reportType ?? null,
      parsed.visibility,
      parsed.storageKey,
      parsed.contentType,
      parsed.fileSize,
      parsed.sha256,
      'pending',
      now,
      now,
    );
    return jsonResponse({
      uploadUrl: `${new URL(request.url).origin}/cloud/mock-upload?storageKey=${encodeURIComponent(parsed.storageKey)}`,
      method: 'PUT',
      storageKey: parsed.storageKey,
      cloudObjectId: parsed.id,
      requiredHeaders: { 'content-type': parsed.contentType },
    });
  }

  if (request.method === 'POST' && (pathname === '/cloud/upload-commit' || pathname === '/cloud/commit-upload' || pathname === '/api/cloud/upload-commit')) {
    const cloudObjectId = stringField(body, 'cloudObjectId');
    const storageKey = stringField(body, 'storageKey') ?? stringField(body, 'objectKey');
    const sha256 = stringField(body, 'sha256');
    const fileSize = numberField(body, 'fileSize');
    if (!cloudObjectId || !storageKey || !sha256 || fileSize === undefined) return jsonResponse({ error: 'cloudObjectId, storageKey, sha256, and fileSize are required' }, 400);
    const existing = await durableFirst<Record<string, unknown>>(env, 'SELECT * FROM cloud_storage_objects WHERE id = ? AND storage_key = ?', cloudObjectId, storageKey);
    if (existing && (existing.sha256 !== sha256 || existing.file_size !== fileSize)) return jsonResponse({ error: 'Upload commit does not match pending object metadata' }, 409);
    const now = new Date().toISOString();
    await durableRun(env, 'UPDATE cloud_storage_objects SET sync_status = ?, updated_at = ? WHERE id = ? AND storage_key = ?', 'synced', now, cloudObjectId, storageKey);
    const object = existing ? {
      id: existing.id,
      ownerId: existing.owner_id,
      jobId: existing.job_id,
      objectType: existing.object_type,
      reportType: existing.report_type ?? undefined,
      visibility: existing.visibility,
      storageKey: existing.storage_key,
      contentType: existing.content_type,
      fileSize: existing.file_size,
      sha256: existing.sha256,
      syncStatus: 'synced',
      shareLinkId: existing.share_link_id ?? undefined,
      createdAt: existing.created_at,
      updatedAt: now,
    } : { id: cloudObjectId, storageKey, sha256, fileSize, syncStatus: 'synced' };
    return jsonResponse({ ok: true, object });
  }

  if (request.method === 'GET' && (pathname.startsWith('/cloud/jobs/') || pathname.startsWith('/api/cloud/jobs/') || pathname.startsWith('/cloud/job/'))) {
    const parts = pathname.split('/').filter(Boolean);
    const jobIndex = parts.includes('jobs') ? parts.indexOf('jobs') : parts.indexOf('job');
    const jobId = parts[jobIndex + 1];
    if (!jobId) return jsonResponse({ error: 'jobId is required' }, 400);
    const ownerId = ownerIdFromRequest(request);
    const rows = await durableAll<Record<string, unknown>>(env, 'SELECT * FROM cloud_storage_objects WHERE owner_id = ? AND job_id = ? ORDER BY created_at DESC', ownerId, jobId);
    return jsonResponse({ objects: rows.map((row) => ({
      id: row.id,
      ownerId: row.owner_id,
      jobId: row.job_id,
      objectType: row.object_type,
      reportType: row.report_type ?? undefined,
      visibility: row.visibility,
      storageKey: row.storage_key,
      contentType: row.content_type,
      fileSize: row.file_size,
      sha256: row.sha256,
      syncStatus: row.sync_status,
      shareLinkId: row.share_link_id ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) });
  }

  if (request.method === 'POST' && (pathname === '/cloud/share-links' || pathname === '/api/cloud/share-links')) {
    const jobId = stringField(body, 'jobId');
    if (!jobId) return jsonResponse({ error: 'jobId is required' }, 400);
    const ownerId = ownerIdFromRequest(request, body);
    const shareLinkId = randomId('share');
    const rows = await durableAll<Record<string, unknown>>(env, 'SELECT * FROM cloud_storage_objects WHERE owner_id = ? AND job_id = ? AND visibility = ? ORDER BY created_at ASC', ownerId, jobId, 'customer_visible');
    await durableRun(env, 'UPDATE cloud_storage_objects SET share_link_id = ? WHERE owner_id = ? AND job_id = ? AND visibility = ?', shareLinkId, ownerId, jobId, 'customer_visible');
    return jsonResponse({
      ok: true,
      shareLinkId,
      objects: rows.map((row) => ({
        id: row.id,
        objectType: row.object_type,
        reportType: row.report_type ?? undefined,
        visibility: row.visibility,
        storageKey: row.storage_key,
      })),
    });
  }

  if (request.method === 'PUT' && pathname === '/cloud/mock-upload') {
    return new Response(null, { status: 200, headers: jsonHeaders });
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
