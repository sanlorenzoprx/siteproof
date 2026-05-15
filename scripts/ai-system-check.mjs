import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'docs/ai/README.md',
  'docs/ai/feature-review-prompt.md',
  'docs/ai/architecture-audit-prompt.md',
  'docs/ai/workflow-simplicity-audit-prompt.md',
  'docs/ai/field-reality-simulation-prompt.md',
  'docs/ai/export-quality-review-prompt.md',
  'docs/ai/template-generation-prompt.md',
  'docs/ai/research-scout-prompt.md',
  'docs/ai/test-generation-prompt.md',
  'docs/ai/task-graph-review-prompt.md',
  'docs/ai/legacy-cleanup-audit-prompt.md',
  'governance/legacy-cleanup-workflow.md',
  'docs/architecture/LEGACY_CLEANUP_AUTOMATION_V1.md',
  'scripts/legacy-architecture-check.mjs',
  'docs/ai/codex-operating-prompt.md',
  'CODEX.md',
  'governance/ai-improvement-system.md',
  'governance/ai-review-schema.json',
  'governance/ai-feature-review-checklist.md',
  'governance/recursive-improvement-standard.md',
  'scripts/ai-review-feature.mjs',
  'scripts/ai-score-workflow.mjs',
  'scripts/ai-generate-test-plan.mjs',
  'scripts/ai-api-smoke.mjs',
  'scripts/ai-cloudflare-smoke.mjs',
  'scripts/check-no-client-ai-secrets.mjs',
  'scripts/ai-codex-packet.mjs',
  'src/ai-improvement/taskGraphReview.ts',
  'src/ai-improvement/reviewPipeline.ts',
  'server/index.mjs',
  'src/services/siteProofAiClient.ts',
  'src/services/aiTaskQueueService.ts',
  'workers/siteproof-api/src/ai/types.ts',
  'workers/siteproof-api/src/ai/aiRouter.ts',
  'workers/siteproof-api/src/ai/workersAiProvider.ts',
  'workers/siteproof-api/src/index.ts',
  'wrangler.toml',
];

const requiredTerms = [
  'architecture',
  'workflow',
  'proof',
  'offline',
  'sync',
  'export',
  'field',
  'test',
];

const errors = [];

for (const rel of requiredFiles) {
  const absolute = path.join(root, rel);
  if (!fs.existsSync(absolute)) {
    errors.push(`Missing AI Improvement System file: ${rel}`);
    continue;
  }

  if (/\.(md|json)$/.test(rel)) {
    const content = fs.readFileSync(absolute, 'utf8').toLowerCase();
    const missingTerms = requiredTerms.filter((term) => !content.includes(term));
    if (rel.includes('ai-improvement-system') || rel.includes('feature-review') || rel.includes('README')) {
      if (missingTerms.length) {
        errors.push(`${rel} is missing key review terms: ${missingTerms.join(', ')}`);
      }
    }
  }
}

try {
  JSON.parse(fs.readFileSync(path.join(root, 'governance/ai-review-schema.json'), 'utf8'));
} catch (error) {
  errors.push(`Invalid AI review schema JSON: ${error.message}`);
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const scriptName of ['ai:check', 'ai:api-smoke', 'ai:cloudflare-smoke', 'security:ai-keys', 'ai:review', 'ai:test-plan', 'ai:codex-packet', 'legacy:check']) {
  if (!packageJson.scripts?.[scriptName]) errors.push(`package.json missing ${scriptName} script`);
}

const viteConfig = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');
if (/GEMINI_API_KEY|OPENAI_API_KEY/.test(viteConfig)) {
  errors.push('vite.config.ts must not expose AI provider API keys to the browser bundle');
}

for (const rel of ['src/services/aiService.ts', 'src/services/siteProofAiClient.ts']) {
  const content = fs.readFileSync(path.join(root, rel), 'utf8');
  if (/@google\/genai|@google\/generative-ai|GoogleGenAI|GEMINI_API_KEY|OPENAI_API_KEY/.test(content)) {
    errors.push(`${rel} must use backend /api/ai routes instead of provider SDKs or API keys`);
  }
}

if (errors.length) {
  console.error('\nSiteProof AI Improvement System check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('SiteProof AI Improvement System check passed. Recursive improvement guardrails are present.');
