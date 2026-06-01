# SiteProof App P0 Tracker (May 31, 2026)

Source inputs:
- `SITEPROOF_P0_DIFFS.md`
- `# SiteProof â€” Consolidated Review.md`

Repo scanned: `c:\repos\SiteProof`

## Current status

### WP-B1: License API routing in client
Status: `done`
- `src/services/licenseApiClient.ts` uses:
  - `VITE_SITEPROOF_LICENSE_API_BASE_URL`
  - fallback to `VITE_SITEPROOF_API_BASE_URL`
- `.env.example` includes `VITE_SITEPROOF_LICENSE_API_BASE_URL`

### WP-B2: App worker CORS + cleanup
Status: `done`
- `workers/siteproof-api/src/ai/types.ts` has `ALLOWED_ORIGINS?: string`.
- `workers/siteproof-api/src/ai/aiRouter.ts` has `corsHeaders(...)` + `jsonResponse(..., headers)`.
- `workers/siteproof-api/src/index.ts` uses request-aware CORS and `/api/ai/*`, `/cloud/*` handling with rate-limit response shape.
- `wrangler.toml` contains `ALLOWED_ORIGINS`.
- `workers/siteproof-api/.dev.vars.example` exists with local origins.

### WP-I1: Spanish mojibake fix
Status: `done`
- `src/config/i18n.ts` is UTF-8 clean for the blocked inspection message:
  - `El reporte de preparaciÃ³n para inspecciÃ³n estÃ¡ bloqueado...`

### WP-U1: Placeholder interpolation
Status: `done`
- `src/components/JobList.tsx`
  - `placeholder={t('jobs.quickStart')}`
  - `placeholder={t('jobs.search')}`
- `src/components/Onboarding.tsx`
  - `placeholder={t('onboarding.createPlaceholder')}`

### WP-U2: Replace alerts with inline errors + i18n
Status: `done`
- License trial-end navigation paths use `navigate('/license')` without blocking alerts.
- `src/components/JobDetail.tsx` has:
  - `shareError` + `reportError` states
  - inline `aria-live` alert regions
  - localized share validation/link errors
  - i18n recipient label/placeholder keys
- `src/components/CameraCapture.tsx` has `permissionError` inline state and UI alert region.
- `src/config/i18n.ts` includes:
  - `jobDetail.shareEmailRequired`
  - `jobDetail.sharePhoneRequired`
  - `jobDetail.shareNoLink`
  - `jobDetail.shareRecipientLabel`
  - `jobDetail.shareRecipientPlaceholder`

## Consolidated review follow-ups (APP repo)

### P0 still high-risk
- Real server-enforced licensing/trial/seat checks (not just local state).
- Stripe webhook signature verification in app worker billing path, or remove duplicate billing path and centralize.
- PinGate hardening (hash, lockout, non-bypass session model).

### P1/P2 recommended next
- `WP-D1` migration in progress:
  - Removed all direct `../types` and `../../types` imports across `src/**` in favor of `src/domain/models`.
  - `npm run lint` and `npm test` both pass after migration batch.
  - Next step is replacing transitional `src/domain/models` contracts with canonical `src/db/schema.ts` entities file-by-file.
- `WP-D2` conflict resolution implemented:
  - Added LWW resolver + persistent conflict log in `src/services/sync/conflictResolution.ts`.
  - Wired conflict handling into `SyncRuntime` for cloud conflict responses (`conflicts[]`).
  - Added tests for local-newer / remote-newer / equal timestamps.
  - `npm run lint` and `npm test` pass.
- `WP-D3` versioned migration hardening implemented:
  - Bumped IndexedDB version to `5`.
  - Added migration normalization for legacy sync/job enums in upgrade path.
  - Added migration unit tests in `src/db/indexedDbMigration.test.ts`.
- `WP-D4` sync resiliency + payload whitelist implemented:
  - `SyncRuntime` now processes operations with `Promise.allSettled`, allowing partial success when one op fails.
  - Added sync payload whitelist in `src/services/sync/payloadWhitelist.ts` and wired it through `CloudService`.
  - Added whitelist test to verify PII fields are excluded.
- `WP-D5` performance hardening implemented (phase 1):
  - Added `src/workers/imageCompressionWorker.ts` and worker-assisted image compression path in `MediaPipelineService`.
  - Main-thread fallback remains in place for unsupported environments.
- `WP-U4` remains open:
  - `src/components/JobDetail.tsx` still needs full split into 5 lazy-loaded sections.
- Strengthen tooling baseline: strict TS, ESLint, better component/sync/export test coverage.

## Next action order
1. Keep `WP-I1` closed (verified UTF-8 string in `src/config/i18n.ts`).
2. Add a focused app worker security pass:
   - webhook signature verification check
   - explicit rate-limit persistence strategy
3. Add tests around license boundary and sync conflict behavior.

