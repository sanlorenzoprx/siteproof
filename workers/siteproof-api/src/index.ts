import { handleAiRoute, jsonHeaders, jsonResponse, readJson } from './ai/aiRouter';
import { WorkerEnv } from './ai/types';
import { WorkersAiProvider } from './ai/workersAiProvider';

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { headers: jsonHeaders });
    if (url.pathname === '/api/health' || url.pathname === '/api/ai/health') {
      return jsonResponse({ ok: true, service: 'siteproof-cloudflare-api' });
    }

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
