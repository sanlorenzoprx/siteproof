const apiUrl = process.env.SITEPROOF_AI_API_URL;

if (!apiUrl) {
  console.warn('SiteProof Cloudflare AI smoke skipped. Set SITEPROOF_AI_API_URL to test a deployed Worker or wrangler dev endpoint.');
  process.exit(0);
}

const response = await fetch(new URL('/api/ai/health', apiUrl));
if (!response.ok) {
  throw new Error(`Cloudflare Worker health check failed: ${response.status}`);
}

const body = await response.json();
if (!body?.ok) {
  throw new Error('Cloudflare Worker health check returned an unexpected response.');
}

console.log('SiteProof Cloudflare AI smoke check passed. Worker health endpoint responded.');
