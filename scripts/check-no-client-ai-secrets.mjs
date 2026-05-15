import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const targets = ['src', 'vite.config.ts'];
const forbidden = [
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'GoogleGenAI',
  '@google/genai',
  '@google/generative-ai',
  'new OpenAI',
  'from "openai"',
  "from 'openai'",
];

function filesFor(target) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) return [];
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];

  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(absolute, entry.name);
    if (entry.isDirectory()) return filesFor(path.relative(root, next));
    return /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name) ? [next] : [];
  });
}

const errors = [];
for (const file of targets.flatMap(filesFor)) {
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of forbidden) {
    if (content.includes(pattern)) {
      errors.push(`${path.relative(root, file)} contains forbidden frontend AI secret/provider reference: ${pattern}`);
    }
  }
}

if (errors.length) {
  console.error('\nSiteProof frontend AI secret check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('SiteProof frontend AI secret check passed.');
