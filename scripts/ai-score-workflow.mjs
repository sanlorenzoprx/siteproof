import fs from 'node:fs';
import path from 'node:path';

const inputPath = process.argv[2];

const weights = {
  taps: 1,
  modals: 2,
  keyboardOpens: 3,
  requiredDecisions: 4,
  contextSwitches: 5,
  workflowBranches: 6,
  errorInterruptions: 8,
  forcedRetries: 10,
};

function classify(score) {
  if (score <= 10) return 'Excellent';
  if (score <= 20) return 'Acceptable';
  if (score <= 30) return 'Needs review';
  return 'Reject / redesign';
}

function parseInput() {
  if (!inputPath) {
    console.error('Usage: node scripts/ai-score-workflow.mjs <workflow-metrics.json>');
    console.error('Expected keys: taps, modals, keyboardOpens, requiredDecisions, contextSwitches, workflowBranches, errorInterruptions, forcedRetries');
    process.exit(1);
  }

  const absolute = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
  if (!fs.existsSync(absolute)) {
    console.error(`Workflow metrics file not found: ${inputPath}`);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

const metrics = parseInput();
let score = 0;
const contributions = [];

for (const [key, weight] of Object.entries(weights)) {
  const count = Number(metrics[key] ?? 0);
  if (!Number.isFinite(count) || count < 0) {
    console.error(`Invalid metric '${key}': expected non-negative number`);
    process.exit(1);
  }
  const value = count * weight;
  score += value;
  contributions.push({ metric: key, count, weight, contribution: value });
}

const result = {
  score,
  classification: classify(score),
  contributions,
  recommendation:
    score > 30
      ? 'Redesign before implementation.'
      : score > 20
        ? 'Review and simplify before merge.'
        : 'Within current simplicity threshold.',
};

console.log(JSON.stringify(result, null, 2));

if (score > 30) process.exitCode = 2;
