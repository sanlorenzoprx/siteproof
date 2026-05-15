# SiteProof Cloudflare AI Boundary v1 Review Packet

## Decision

Approve with required constraints.

## Goal

Move SiteProof AI enrichment behind a Cloudflare Worker boundary using Workers AI as the default provider. Keep proof capture offline-first, non-blocking, and free of provider secrets in browser code.

## Current Direct AI Usage Audit

- Frontend provider SDK usage: removed.
- Vite AI secret injection: removed.
- Browser AI path: `src/services/siteProofAiClient.ts` calls only `/api/ai/*`.
- Compatibility wrapper: `src/services/aiService.ts` keeps existing callers stable and falls back locally.
- Backend AI path: `workers/siteproof-api/src/ai/*` owns routing and provider abstraction.
- Local pending behavior: `src/services/aiTaskQueueService.ts` records failed enrichment tasks for later retry without blocking capture.

## Required Constraints

- No `GEMINI_API_KEY`, `OPENAI_API_KEY`, `GoogleGenAI`, or direct provider SDK imports in frontend source or Vite config.
- AI failures must not block photo capture, voice-note capture, hashing, local persistence, timeline creation, or export.
- Cloudflare Workers AI is the default provider through the `AI` binding.
- D1 and R2 bindings remain placeholders until cloud sync/media storage migration is explicitly implemented.
- No new user-facing AI features in this pass.

## Top Risks

- AI enrichment can appear unavailable during local development unless the Worker or proxy is running.
- Pending AI tasks are recorded locally but not yet replayed through a sync worker.
- Worker model response shapes may vary; parsing must stay conservative.
- Real Cloudflare deployment still needs account-specific binding IDs and environment validation.

## Required Changes Completed

- Added Cloudflare Worker API scaffold under `workers/siteproof-api`.
- Added Workers AI provider abstraction.
- Added Wrangler AI, D1, and R2 binding placeholders.
- Added frontend-only `SiteProofAiClient`.
- Added pending AI task queue for failed enrichment.
- Added frontend AI secret security check.
- Added optional Cloudflare Worker smoke script.
- Removed direct Gemini dependencies.

## Missing Tests / Follow-Up

- Real Cloudflare deploy test with account bindings.
- Replay of pending AI enrichment tasks after sync/runtime reconnect.
- Contract tests against representative Workers AI responses.
- Export regression test with and without AI-generated summaries.

## Checklist Status

- [x] AI Improvement System review packet created
- [x] Current direct AI usage audited
- [x] Frontend AI secrets removed
- [x] Vite AI env injection removed
- [x] Cloudflare Worker API scaffold added
- [x] Workers AI binding added
- [x] D1/R2 placeholder bindings added
- [x] Provider abstraction added
- [x] Frontend SiteProofAiClient added
- [x] Offline/pending AI task behavior preserved
- [x] Security check added
- [x] Optional ai:cloudflare-smoke script added
- [x] quality:check passes
- [x] build:check passes
- [ ] real Cloudflare deploy tested
