import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const inputPath = process.argv[2];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function optionalRead(relPath) {
  const absolute = path.join(root, relPath);
  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : '';
}

let input = 'Paste the feature request, PR summary, implementation plan, or diff summary here.';
if (inputPath) {
  const absolute = path.isAbsolute(inputPath) ? inputPath : path.join(root, inputPath);
  if (!fs.existsSync(absolute)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }
  input = fs.readFileSync(absolute, 'utf8');
}

const sections = [
  ['# SiteProof Codex AI Improvement Packet', 'Use this packet as the pre-implementation review context for Codex or another coding agent.'],
  ['## Codex Operating Contract', read('CODEX.md')],
  ['## Recursive Improvement Standard', read('governance/recursive-improvement-standard.md')],
  ['## AI Feature Review Prompt', read('docs/ai/feature-review-prompt.md')],
  ['## Task Graph Review Prompt', read('docs/ai/task-graph-review-prompt.md')],
  ['## Architecture Audit Prompt', read('docs/ai/architecture-audit-prompt.md')],
  ['## Workflow Simplicity Audit Prompt', read('docs/ai/workflow-simplicity-audit-prompt.md')],
  ['## Field Reality Simulation Prompt', read('docs/ai/field-reality-simulation-prompt.md')],
  ['## Export Quality Review Prompt', read('docs/ai/export-quality-review-prompt.md')],
  ['## Test Generation Prompt', read('docs/ai/test-generation-prompt.md')],
  ['## Legacy Cleanup Audit Prompt', read('docs/ai/legacy-cleanup-audit-prompt.md')],
  ['## Legacy Cleanup Workflow', read('governance/legacy-cleanup-workflow.md')],
  ['## Feature Review Checklist', read('governance/ai-feature-review-checklist.md')],
  ['## Required JSON Schema', '```json\n' + read('governance/ai-review-schema.json') + '\n```'],
  ['## Feature / Diff Input', input],
  ['## Expected Output', optionalRead('docs/ai/codex-operating-prompt.md')],
];

for (const [title, body] of sections) {
  console.log(title);
  console.log('');
  console.log(body.trim());
  console.log('\n');
}
