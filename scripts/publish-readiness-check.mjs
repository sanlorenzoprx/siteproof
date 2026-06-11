import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const strict = process.argv.includes('--strict');
const root = process.cwd();

const requiredFiles = [
  'src/services/purchaseIntakeBootstrapService.ts',
  'src/services/licenseApiClient.ts',
  'src/services/cloudflareClient.ts',
  'src/services/cloudSyncService.ts',
  'src/services/proofCaptureService.ts',
  'src/features/bidding/bidPrivacy.ts',
  'src/features/export/reportDefinitions.ts',
  'src/features/export/reportFilters.ts',
  'workers/siteproof-api/src/index.ts',
  'workers/siteproof-api/migrations/0001_licenses.sql',
  'workers/siteproof-api/migrations/0002_purchase_intake.sql',
  'workers/siteproof-api/migrations/0003_cloud_storage_objects.sql',
  'docs/qa/publish-readiness-checklist.md',
];

const requiredPackageScripts = [
  'lint',
  'test',
  'build',
  'quality:check',
  'release:check',
  'publish:check',
  'publish:check:strict',
];

const requiredEnvExampleKeys = [
  'VITE_SITEPROOF_API_BASE_URL',
  'VITE_SITEPROOF_LICENSE_API_BASE_URL',
  'VITE_SITEPROOF_CLOUD_VAULT_ENABLED',
  'SITEPROOF_AI_API_URL',
];

const requiredWorkerBindings = [
  'SITEPROOF_DB',
  'SITEPROOF_MEDIA',
  'SITEPROOF_EXPORTS',
];

const frontendSecretPatterns = [
  /sk_live_/i,
  /sk_test_/i,
  /STRIPE_SECRET_KEY\s*=/i,
  /STRIPE_WEBHOOK_SECRET\s*=/i,
  /R2_SECRET_ACCESS_KEY\s*=/i,
  /CLOUDFLARE_API_TOKEN\s*=/i,
];

const checks = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function addCheck(name, ok, severity, detail, fix) {
  checks.push({ name, ok, severity, detail, fix });
}

function listSourceFiles(directory) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(next);
    return /\.(ts|tsx|js|jsx|mjs|cjs|html)$/.test(entry.name) ? [next] : [];
  });
}

for (const file of requiredFiles) {
  addCheck(`Required file exists: ${file}`, exists(file), 'blocker', file, 'Restore or implement this publish-critical file.');
}

const packageJson = JSON.parse(read('package.json'));
for (const scriptName of requiredPackageScripts) {
  addCheck(
    `Package script exists: ${scriptName}`,
    Boolean(packageJson.scripts?.[scriptName]),
    'blocker',
    `package.json scripts.${scriptName}`,
    `Add scripts.${scriptName} to package.json.`,
  );
}

const envExample = exists('.env.example') ? read('.env.example') : '';
for (const key of requiredEnvExampleKeys) {
  addCheck(
    `.env.example documents ${key}`,
    envExample.includes(key),
    'blocker',
    key,
    `Document ${key} in .env.example with a safe placeholder.`,
  );
}

const wrangler = exists('wrangler.toml') ? read('wrangler.toml') : '';
for (const binding of requiredWorkerBindings) {
  addCheck(
    `Wrangler binding present: ${binding}`,
    wrangler.includes(binding),
    'blocker',
    binding,
    `Add the ${binding} binding to wrangler.toml.`,
  );
}

addCheck(
  'Wrangler database id is not the placeholder',
  !wrangler.includes('00000000-0000-0000-0000-000000000000'),
  'manual',
  'wrangler.toml database_id',
  'Replace the placeholder D1 database_id before production deploy.',
);

const distChecks = ['dist/index.html', 'dist/sw.js'];
for (const file of distChecks) {
  addCheck(
    `Build artifact exists: ${file}`,
    exists(file),
    'manual',
    file,
    'Run npm run build before publishing the static app.',
  );
}

const frontendFiles = ['src', 'index.html', 'vite.config.ts']
  .flatMap((target) => (exists(target) && fs.statSync(path.join(root, target)).isDirectory() ? listSourceFiles(target) : [target]))
  .filter(exists);
const secretHits = [];
for (const file of frontendFiles) {
  const content = read(file);
  for (const pattern of frontendSecretPatterns) {
    if (pattern.test(content)) secretHits.push(`${file} matches ${pattern}`);
  }
}
addCheck(
  'Frontend contains no server-side secret patterns',
  secretHits.length === 0,
  'blocker',
  secretHits.join('\n') || 'No frontend secret patterns found.',
  'Move server-side secrets to Worker/Pages secrets and keep only public VITE values in the frontend.',
);

const migrationFiles = [
  'workers/siteproof-api/migrations/0001_licenses.sql',
  'workers/siteproof-api/migrations/0002_purchase_intake.sql',
  'workers/siteproof-api/migrations/0003_cloud_storage_objects.sql',
];
for (const file of migrationFiles) {
  const content = exists(file) ? read(file) : '';
  addCheck(
    `Migration has idempotent tables: ${file}`,
    /CREATE TABLE IF NOT EXISTS/i.test(content),
    'blocker',
    file,
    'Keep migrations safe for repeated staging/local verification.',
  );
}

const workerSource = exists('workers/siteproof-api/src/index.ts') ? read('workers/siteproof-api/src/index.ts') : '';
addCheck(
  'Worker upload URL points to R2-backed upload-object route',
  workerSource.includes('/cloud/upload-object') && !workerSource.includes('/cloud/mock-upload'),
  'blocker',
  'workers/siteproof-api/src/index.ts',
  'Use the R2-backed /cloud/upload-object route, not the old mock upload endpoint.',
);

addCheck(
  'Worker separates media and export R2 buckets',
  workerSource.includes('SITEPROOF_MEDIA') && workerSource.includes('SITEPROOF_EXPORTS') && workerSource.includes('bucketForObject'),
  'blocker',
  'workers/siteproof-api/src/index.ts',
  'Route proof media to SITEPROOF_MEDIA and reports/share packages to SITEPROOF_EXPORTS.',
);

const gitStatus = spawnSync('git', ['status', '--short'], { encoding: 'utf8', shell: process.platform === 'win32' });
addCheck(
  'Git working tree is clean before final publish',
  (gitStatus.stdout ?? '').trim().length === 0,
  'manual',
  (gitStatus.stdout ?? '').trim() || 'Clean working tree.',
  'Commit or intentionally stash changes before publishing.',
);

const grouped = {
  blocker: checks.filter((check) => check.severity === 'blocker'),
  manual: checks.filter((check) => check.severity === 'manual'),
};
const failedBlockers = grouped.blocker.filter((check) => !check.ok);
const failedManual = grouped.manual.filter((check) => !check.ok);

for (const check of checks) {
  const marker = check.ok ? 'PASS' : check.severity === 'blocker' ? 'BLOCKER' : 'MANUAL';
  console.log(`[${marker}] ${check.name}`);
  if (!check.ok) {
    console.log(`  detail: ${check.detail}`);
    console.log(`  fix: ${check.fix}`);
  }
}

console.log('\nPublish readiness summary');
console.log(`- automated blockers: ${failedBlockers.length}`);
console.log(`- manual/external gates remaining: ${failedManual.length}`);
console.log(`- mode: ${strict ? 'strict' : 'advisory'}`);

if (failedBlockers.length > 0 || (strict && failedManual.length > 0)) {
  process.exit(1);
}
