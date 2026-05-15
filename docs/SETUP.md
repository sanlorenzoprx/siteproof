# SiteProof Setup

## Local development

```bash
npm install
npm run dev
```

Open the app at the Vite URL shown in the terminal.

## Production build

```bash
npm run pilot:check
```

This runs:

1. TypeScript check
2. Production build
3. Pilot smoke check

## Optional configuration

SiteProof works offline without cloud sync. For multi-device/cloud pilots, configure these in Settings:

- Cloud URL
- Cloud key

For AI-assisted summaries, run or deploy the Cloudflare Worker API and point the local proxy at it when needed:

```bash
SITEPROOF_AI_API_URL=http://localhost:8787
```

Do not expose AI keys through Vite or browser/mobile code. The frontend calls `/api/ai/*`, and the Cloudflare Worker uses the Workers AI binding configured in `wrangler.toml`. The app must continue to work without AI. Voice AI v1 uses offline-first heuristics when cloud AI is unavailable.

Run the backend AI boundary smoke check with:

```bash
npm run ai:api-smoke
```

To test a deployed Cloudflare Worker or `wrangler dev` endpoint:

```bash
SITEPROOF_AI_API_URL=http://localhost:8787 npm run ai:cloudflare-smoke
```

## Pilot device setup

1. Open the app once while online.
2. Wait for the offline shell banner to clear.
3. Create one sample job.
4. Capture one required photo.
5. Record one voice note.
6. Generate a customer packet.
7. Turn on airplane mode.
8. Reopen the app and confirm the job, media, note, and packet remain available.

## Current architecture

Primary runtime path:

```text
UI → hooks/services → repositories → IndexedDB
```

Legacy Dexie storage remains only as compatibility/fallback during migration.
