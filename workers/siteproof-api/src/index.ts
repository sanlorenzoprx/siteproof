import { handleAiRoute, jsonHeaders, jsonResponse, readJson } from './ai/aiRouter';
import { WorkerEnv } from './ai/types';
import { WorkersAiProvider } from './ai/workersAiProvider';

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 60;
const inMemoryRateCounters = new Map<string, { count: number; resetAt: number }>();

async function isRateLimited(env: WorkerEnv, ip: string): Promise<boolean> {
  const key = `rate:${ip}`;
  if (env.RATE_LIMIT_KV) {
    const now = Date.now();
    const currentRaw = await env.RATE_LIMIT_KV.get(key);
    const current = currentRaw ? Number.parseInt(currentRaw, 10) : 0;
    if (!Number.isNaN(current) && current >= RATE_LIMIT_MAX_REQUESTS) return true;
    const next = Number.isNaN(current) ? 1 : current + 1;
    const elapsed = Math.floor(now / 1000) % RATE_LIMIT_WINDOW_SECONDS;
    const ttl = currentRaw ? Math.max(1, RATE_LIMIT_WINDOW_SECONDS - elapsed) : RATE_LIMIT_WINDOW_SECONDS;
    await env.RATE_LIMIT_KV.put(key, String(next), { expirationTtl: ttl });
    return false;
  }

  const now = Date.now();
  const existing = inMemoryRateCounters.get(key);
  if (!existing || existing.resetAt <= now) {
    inMemoryRateCounters.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000 });
    return false;
  }
  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) return true;
  existing.count += 1;
  inMemoryRateCounters.set(key, existing);
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  return typeof value[key] === 'string' ? value[key] as string : undefined;
}

function numberField(value: Record<string, unknown>, key: string): number | undefined {
  return typeof value[key] === 'number' && Number.isFinite(value[key]) ? value[key] as number : undefined;
}

const CLOUD_OBJECT_TYPES = new Set(['photo', 'document', 'video', 'report', 'metadata', 'voice_note', 'signature', 'transcript', 'bid_report', 'thumbnail', 'share_package']);
const CLOUD_REPORT_TYPES = new Set(['customer_completion', 'daily_job_proof', 'inspection_readiness', 'change_order_evidence', 'photo_proof_timeline', 'payment_final_handoff', 'office_internal_job_record', 'all_reports', 'internal_bid_report', 'customer_bid_report']);
const CLOUD_VISIBILITIES = new Set(['private', 'internal_only', 'customer_visible', 'hidden_do_not_export']);

function randomId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
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
  if (input.objectType === 'voice_note') return `owners/${input.ownerId}/jobs/${input.jobId}/voice_notes/${objectId}.${input.contentType?.includes('mp4') ? 'mp4' : 'webm'}`;
  if (input.objectType === 'metadata') return `owners/${input.ownerId}/jobs/${input.jobId}/metadata/${objectId}.json`;
  if (input.objectType === 'thumbnail') return `owners/${input.ownerId}/jobs/${input.jobId}/thumbnails/${objectId}.jpg`;
  return `owners/${input.ownerId}/jobs/${input.jobId}/${input.objectType}/${objectId}`;
}

function cloudObjectFromBody(body: Record<string, unknown>, request: Request) {
  const jobId = stringField(body, 'jobId');
  const objectId = stringField(body, 'objectId') ?? stringField(body, 'proofObjectId') ?? stringField(body, 'mediaAssetId') ?? stringField(body, 'localId');
  const objectType = stringField(body, 'objectType');
  const reportType = stringField(body, 'reportType');
  const visibility = stringField(body, 'visibility') ?? 'private';
  const contentType = stringField(body, 'mimeType') ?? stringField(body, 'contentType') ?? 'application/octet-stream';
  const fileSize = numberField(body, 'fileSize') ?? 0;
  const sha256 = stringField(body, 'sha256') ?? stringField(body, 'checksum');
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

async function routeBoundary(pathname: string, request: Request, env: WorkerEnv): Promise<Response | null> {
  if (request.method === 'GET' && (pathname === '/health' || pathname === '/api/health')) {
    return jsonResponse({ ok: true, service: 'siteproof-cloudflare-api' });
  }

  const body = ['POST'].includes(request.method) ? await readJson(request) : {};
  if (!isRecord(body)) return jsonResponse({ error: 'Invalid JSON body' }, 400);

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

  if (request.method === 'POST' && (pathname === '/cloud/upload-commit' || pathname === '/cloud/commit-upload' || pathname === '/api/cloud/upload-commit' || pathname === '/api/cloud/commit')) {
    const cloudObjectId = stringField(body, 'cloudObjectId');
    const storageKey = stringField(body, 'storageKey') ?? stringField(body, 'objectKey');
    const sha256 = stringField(body, 'sha256') ?? stringField(body, 'checksum');
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
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    if (url.pathname.startsWith('/api/ai/') || url.pathname.startsWith('/cloud/') || url.pathname.startsWith('/api/cloud/')) {
      if (await isRateLimited(env, ip)) {
        return jsonResponse({ error: 'rate_limited' }, 429, { ...jsonHeaders, 'Retry-After': '60' });
      }
    }

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
