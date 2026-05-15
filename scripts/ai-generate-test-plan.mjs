import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const featurePath = process.argv[2];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

const prompt = read('docs/ai/test-generation-prompt.md');

console.log('# SiteProof AI Test Generation Packet\n');
console.log(prompt);

if (featurePath) {
  const absolute = path.isAbsolute(featurePath) ? featurePath : path.join(root, featurePath);
  if (!fs.existsSync(absolute)) {
    console.error(`Feature file not found: ${featurePath}`);
    process.exit(1);
  }
  console.log('\n## Feature / Code Change Input\n');
  console.log(fs.readFileSync(absolute, 'utf8'));
} else {
  console.log('\n## Feature / Code Change Input\n');
  console.log('Paste the feature spec, code diff summary, or implementation notes here.');
}
