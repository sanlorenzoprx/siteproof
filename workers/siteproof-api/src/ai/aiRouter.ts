import { AiProvider, AiTaskType } from './types';

export const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

export function corsHeaders(request: Request, env: { ALLOWED_ORIGINS?: string }): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };
  if (allowed.length === 0 || allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin || '*';
  }
  return headers;
}

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = jsonHeaders): Response {
  return new Response(JSON.stringify(body), { status, headers });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (request.method !== 'POST') return {};
  return await request.json().catch(() => ({}));
}

function parseTaglines(text: string): string[] {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string').slice(0, 4) : [];
  } catch {
    return text
      .split('\n')
      .map((line) => line.replace(/^\d+\.\s*/, '').replace(/^"|"$/g, '').trim())
      .filter(Boolean)
      .slice(0, 4);
  }
}

function routeTask(pathname: string): AiTaskType | null {
  const routes: Record<string, AiTaskType> = {
    '/api/ai/business-bio': 'business_bio',
    '/api/ai/taglines': 'taglines',
    '/api/ai/transcribe': 'transcribe_audio',
    '/api/ai/summarize-job': 'summarize_job',
    '/api/ai/summarize-voice-note': 'summarize_voice_note',
    '/api/ai/extract-job-details': 'extract_job_details',
    '/api/ai/classify-proof': 'classify_proof',
    '/api/ai/detect-change-order': 'detect_change_order',
    '/api/ai/review-feature': 'review_feature',
  };
  return routes[pathname] ?? null;
}

export async function handleAiRoute(pathname: string, input: Record<string, unknown>, provider: AiProvider): Promise<Response> {
  const task = routeTask(pathname);
  if (!task) return jsonResponse({ error: 'Not found' }, 404);

  const result = await provider.run(task, input);
  if (task === 'business_bio') return jsonResponse({ bio: typeof result === 'string' ? result : '' });
  if (task === 'taglines') return jsonResponse({ taglines: parseTaglines(typeof result === 'string' ? result : '') });
  if (task === 'transcribe_audio') return jsonResponse({ transcript: typeof result === 'string' ? result : '' });
  if (task === 'summarize_job') {
    const fallback = typeof input.localSummary === 'string' ? input.localSummary : '';
    return jsonResponse({ summary: typeof result === 'string' && result ? result : fallback });
  }

  return jsonResponse({ result });
}
