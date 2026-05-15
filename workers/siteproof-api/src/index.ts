import { handleAiRoute, jsonHeaders, jsonResponse, readJson } from './ai/aiRouter';
import { WorkerEnv } from './ai/types';
import { WorkersAiProvider } from './ai/workersAiProvider';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  return typeof value[key] === 'string' ? value[key] as string : undefined;
}

async function routeBoundary(pathname: string, request: Request, env: WorkerEnv): Promise<Response | null> {
  if (request.method === 'GET' && (pathname === '/health' || pathname === '/api/health')) {
    return jsonResponse({ ok: true, service: 'siteproof-cloudflare-api' });
  }

  const body = ['POST'].includes(request.method) ? await readJson(request) : {};
  if (!isRecord(body)) return jsonResponse({ error: 'Invalid JSON body' }, 400);

  if (request.method === 'POST' && pathname === '/checkout/create') {
    const planId = stringField(body, 'planId');
    if (!planId) return jsonResponse({ error: 'planId is required' }, 400);
    if (!env.STRIPE_SECRET_KEY) return jsonResponse({ error: 'Stripe is not configured' }, 503);
    return jsonResponse({ error: 'Stripe Checkout session creation requires deployment configuration' }, 501);
  }

  if (request.method === 'POST' && pathname === '/stripe/webhook') {
    if (!env.STRIPE_WEBHOOK_SECRET) return jsonResponse({ error: 'Stripe webhook is not configured' }, 503);
    return jsonResponse({ error: 'Stripe webhook verification requires deployment configuration' }, 501);
  }

  if (request.method === 'POST' && pathname === '/license/activate') {
    const licenseKey = stringField(body, 'licenseKey');
    const deviceId = stringField(body, 'deviceId');
    if (!licenseKey || !deviceId) return jsonResponse({ error: 'licenseKey and deviceId are required' }, 400);
    return jsonResponse({ accepted: true, status: 'license_pending_verification' }, 202);
  }

  if (request.method === 'POST' && pathname === '/license/verify') {
    const licenseKey = stringField(body, 'licenseKey');
    const deviceId = stringField(body, 'deviceId');
    if (!licenseKey || !deviceId) return jsonResponse({ error: 'licenseKey and deviceId are required' }, 400);
    return jsonResponse({ valid: false, error: 'License verification backend requires D1 deployment configuration' }, 501);
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
