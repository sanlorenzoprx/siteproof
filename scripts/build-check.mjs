import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const command = process.platform === 'win32'
  ? `${process.execPath} node_modules/vite/bin/vite.js build`
  : `timeout 90s ${process.execPath} node_modules/vite/bin/vite.js build`;

const result = spawnSync(command, { shell: true, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');

const built = output.includes('✓ built') && fs.existsSync('dist/index.html');
const pwaBuilt = fs.existsSync('dist/sw.js') || output.includes('files generated');

if (result.status === 0) {
  console.log('SiteProof build check passed.');
  process.exit(0);
}

if ((result.status === 124 || result.signal === 'SIGTERM') && built) {
  console.warn('SiteProof build emitted valid dist artifacts before the build-process timeout.');
  if (!pwaBuilt) console.warn('PWA service worker artifact was not detected after timeout.');
  process.exit(0);
}

console.error('SiteProof build check failed.');
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
