import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const featurePath = process.argv[2];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

const prompt = read('docs/ai/feature-review-prompt.md');
const taskGraphPrompt = read('docs/ai/task-graph-review-prompt.md');
const schema = read('governance/ai-review-schema.json');
const legacyPrompt = read('docs/ai/legacy-cleanup-audit-prompt.md');
const checklist = read('governance/ai-feature-review-checklist.md');

let featureText = '';
if (featurePath) {
  const absolute = path.isAbsolute(featurePath) ? featurePath : path.join(root, featurePath);
  if (!fs.existsSync(absolute)) {
    console.error(`Feature file not found: ${featurePath}`);
    process.exit(1);
  }
  featureText = fs.readFileSync(absolute, 'utf8');
}

console.log(`# SiteProof AI Feature Review Packet\n`);
console.log(`Use this packet with your AI coding/review tool before implementing or merging a feature.\n`);
console.log(`## Review Prompt\n`);
console.log(prompt);
console.log(`\n## Task Graph Review Prompt\n`);
console.log(taskGraphPrompt);
console.log(`\n## Legacy Cleanup Audit Prompt\n`);
console.log(legacyPrompt);
console.log(`\n## Feature Review Checklist\n`);
console.log(checklist);
console.log(`\n## Required JSON Output Schema\n`);
console.log('```json');
console.log(schema);
console.log('```');

if (featureText) {
  console.log(`\n## Feature Input\n`);
  console.log(featureText);
} else {
  console.log(`\n## Feature Input\n`);
  console.log('Paste the feature spec, PR summary, diff summary, or implementation plan here.');
}
