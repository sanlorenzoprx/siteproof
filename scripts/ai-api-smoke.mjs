import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];

for (const required of [
  'src/services/siteProofAiClient.ts',
  'src/services/aiTaskQueueService.ts',
  'workers/siteproof-api/src/ai/types.ts',
  'workers/siteproof-api/src/ai/aiRouter.ts',
  'workers/siteproof-api/src/ai/workersAiProvider.ts',
  'workers/siteproof-api/src/index.ts',
  'wrangler.toml',
]) {
  if (!fs.existsSync(path.join(root, required))) errors.push(`Missing Cloudflare AI boundary file: ${required}`);
}

const wranglerConfig = fs.existsSync(path.join(root, 'wrangler.toml'))
  ? fs.readFileSync(path.join(root, 'wrangler.toml'), 'utf8')
  : '';
for (const requiredTerm of ['[ai]', 'binding = "AI"', '[[d1_databases]]', '[[r2_buckets]]']) {
  if (!wranglerConfig.includes(requiredTerm)) errors.push(`wrangler.toml missing ${requiredTerm}`);
}

if (errors.length) {
  console.error('\nSiteProof Cloudflare AI boundary smoke check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('SiteProof Cloudflare AI boundary smoke check passed.');
