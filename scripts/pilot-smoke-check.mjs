import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredFiles = [
  'package.json',
  'src/App.tsx',
  'src/db/schema.ts',
  'src/db/indexedDb.ts',
  'src/templates/generator_install_v1.json',
  'src/services/sync/syncRuntime.ts',
  'src/features/export/exportPacketService.ts',
  'src/features/inspection/inspectionReadinessService.ts',
  'src/components/timeline/TimelinePlayback.tsx',
  'src/services/pilot/pilotReadinessService.ts',
  'vite.config.ts',
  'docs/PILOT_READINESS_HARDENING_V1.md',
  'docs/SETUP.md',
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length > 0) {
  console.error('Pilot smoke check failed. Missing files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const template = JSON.parse(fs.readFileSync(path.join(root, 'src/templates/generator_install_v1.json'), 'utf8'));
if (!template.template_id || !Array.isArray(template.stages) || template.stages.length === 0) {
  console.error('Pilot smoke check failed. Generator template is invalid.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
for (const script of ['lint', 'build', 'pilot:smoke']) {
  if (!pkg.scripts?.[script]) {
    console.error(`Pilot smoke check failed. Missing package script: ${script}`);
    process.exit(1);
  }
}

console.log('Pilot smoke check passed.');
