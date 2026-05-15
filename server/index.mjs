import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const port = Number(process.env.PORT || 8787);
const workerApiUrl = process.env.SITEPROOF_AI_API_URL;

const app = express();
app.use(express.json({ limit: '25mb' }));

async function proxyAiRoute(req, res) {
  if (!workerApiUrl) {
    res.status(503).json({ error: 'AI unavailable' });
    return;
  }

  try {
    const upstream = await fetch(new URL(req.path, workerApiUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    });
    res.status(upstream.status).type('application/json').send(await upstream.text());
  } catch (error) {
    console.error('[ai-api-proxy]', error);
    res.status(503).json({ error: 'AI unavailable' });
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'siteproof-api' });
});

app.post('/api/ai/business-bio', proxyAiRoute);
app.post('/api/ai/taglines', proxyAiRoute);
app.post('/api/ai/transcribe', proxyAiRoute);
app.post('/api/ai/summarize-job', proxyAiRoute);

app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, () => {
  console.log(`SiteProof API listening on http://localhost:${port}`);
});
