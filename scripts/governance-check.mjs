import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const configPath = path.join(root, 'config/siteproof-governance.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const errors = [];
const warnings = [];

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
    } else if (/\.(ts|tsx|js|jsx|mjs|json|md)$/.test(entry.name)) {
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

for (const doc of config.requiredDocs) {
  if (!exists(doc)) errors.push(`Missing required governance document: ${doc}`);
}

const schemaPath = 'src/db/schema.ts';
if (!exists(schemaPath)) {
  errors.push('Missing canonical schema file: src/db/schema.ts');
} else {
  const schema = read(schemaPath);
  for (const primitive of config.canonicalPrimitives) {
    const pattern = new RegExp(`export\\s+interface\\s+${primitive}\\b|export\\s+type\\s+${primitive}\\b`);
    if (!pattern.test(schema)) errors.push(`Canonical primitive missing from schema: ${primitive}`);
  }
}

const files = walk('src').filter((file) => !file.endsWith('.md'));
for (const rel of files) {
  const content = read(rel);

  if (!isAllowedStorageBoundaryPath(rel)) {
    const directDbImport = /from\s+['\"](\.\.\/|\.\/)*db\/indexedDb['\"]|from\s+['\"](\.\.\/|\.\/)*db\/legacyDb['\"]/;
    if (directDbImport.test(content)) errors.push(`Forbidden direct DB import outside repository/adapter boundary: ${rel}`);

    const directDexieDbUse = /\bdb\.(jobs|photos|voiceNotes|profiles|license)\b/;
    if (directDexieDbUse.test(content)) errors.push(`Forbidden direct legacy db table access outside adapter boundary: ${rel}`);

    const persistentLocalStorage = /localStorage\.(setItem|removeItem|clear)\(/;
    if (persistentLocalStorage.test(content)) {
      warnings.push(`Review localStorage persistence outside adapter boundary: ${rel}`);
    }
  }

  for (const forbidden of config.forbiddenNewModelNamePatterns) {
    const modelPattern = new RegExp(`(interface|type|class)\\s+${forbidden}\\b`);
    if (modelPattern.test(content)) errors.push(`Possible duplicate source-of-truth model '${forbidden}' in ${rel}`);
  }
}

const packageJson = JSON.parse(read('package.json'));
if (!packageJson.scripts?.['governance:check']) errors.push('package.json missing governance:check script');
if (!packageJson.scripts?.['quality:check']) warnings.push('package.json missing quality:check aggregate script');

if (warnings.length) {
  console.warn('\nSiteProof governance warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error('\nSiteProof governance check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('SiteProof governance check passed. Canonical architecture guardrails are intact.');
