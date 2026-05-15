import { spawnSync } from 'node:child_process';

const nodeBin = process.execPath;
const isWindows = process.platform === 'win32';
const steps = [
  ['npm', ['run', 'lint']],
  ['npm', ['run', 'governance:check']],
  ['npm', ['run', 'legacy:check']],
  ['npm', ['run', 'ai:check']],
  [nodeBin, ['node_modules/vite/bin/vite.js', 'build']],
  ['npm', ['run', 'pilot:smoke']],
];

for (const [cmd, args] of steps) {
  const label = `${cmd} ${args.join(' ')}`;
  console.log(`\n[quality] ${label}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', shell: isWindows });
  if (result.status !== 0) {
    console.error(`[quality] failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nSiteProof quality check passed.');
