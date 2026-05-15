import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'config/siteproof-governance.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const errors = [];
const warnings = [];

const requiredFiles = [
  'governance/legacy-cleanup-workflow.md',
  'docs/architecture/LEGACY_CLEANUP_AUTOMATION_V1.md',
  'scripts/legacy-architecture-check.mjs',
];

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function walk(dirRel, output = []) {
  const dir = path.join(root, dirRel);
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(dirRel, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(entry.name)) continue;
      walk(rel, output);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      output.push(rel);
    }
  }
  return output;
}

function isAllowedStorageBoundaryPath(rel) {
  return config.allowedLegacyStorageFiles.includes(rel)
    || (config.allowedStorageBoundaryFiles ?? []).includes(rel)
    || config.allowedLegacyStorageDirectories.some((dir) => rel.startsWith(dir));
}

for (const file of requiredFiles) {
  if (!exists(file)) errors.push(`Missing legacy cleanup automation file: ${file}`);
}

const sourceFiles = walk('src');
for (const rel of sourceFiles) {
  const content = read(rel);

  if (!isAllowedStorageBoundaryPath(rel)) {
    if (/\blocalStorage\.(setItem|removeItem|clear)\(/.test(content)) {
      errors.push(`Persistent localStorage write outside adapter boundary: ${rel}`);
    }

    if (/from\s+['"](\.\.\/|\.\/)*db\/indexedDb['"]|from\s+['"](\.\.\/|\.\/)*db\/legacyDb['"]/.test(content)) {
      errors.push(`Direct DB import outside repository/adapter boundary: ${rel}`);
    }

    if (/\bdb\.(jobs|photos|voiceNotes|profiles|license)\b/.test(content)) {
      errors.push(`Direct legacy table access outside adapter boundary: ${rel}`);
    }
  }

  for (const forbidden of config.forbiddenNewModelNamePatterns) {
    const pattern = new RegExp(`(interface|type|class)\\s+${forbidden}\\b`);
    if (pattern.test(content)) errors.push(`Duplicate legacy-style primitive '${forbidden}' found in ${rel}`);
  }
}

const packageJson = JSON.parse(read('package.json'));
if (!packageJson.scripts?.['legacy:check']) errors.push('package.json missing legacy:check script');
if (!packageJson.scripts?.['quality:check']?.includes('legacy:check') && !packageJson.scripts?.['quality:check']?.includes('quality-check.mjs')) errors.push('quality:check must include legacy:check or delegate to scripts/quality-check.mjs');

for (const legacyFile of config.allowedLegacyStorageFiles) {
  if (exists(legacyFile)) warnings.push(`Contained legacy/migration adapter still present: ${legacyFile}`);
}

if (warnings.length) {
  console.warn('\nSiteProof legacy cleanup warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error('\nSiteProof legacy cleanup check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('SiteProof legacy cleanup check passed. Legacy architecture is contained and cleanup-as-you-go automation is active.');
