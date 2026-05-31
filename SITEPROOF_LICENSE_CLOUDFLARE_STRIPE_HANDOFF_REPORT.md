# SiteProof License / Cloudflare / Stripe Handoff Report

## 1. Summary

Implemented a local-first licensing boundary, demoted app Worker billing/license stubs, D1/cloud schema boundaries, and optional Cloud Proof Vault upload boundaries while preserving the bilingual offline core.

Production purchase/license authority moved to the `siteproof.report` Worker. The SiteProof app must call that backend through `VITE_SITEPROOF_API_BASE_URL`, for example:

- `https://api.siteproof.report/api/checkout/create`
- `https://api.siteproof.report/api/license/activate`
- `https://api.siteproof.report/api/license/verify`

The app Worker billing/license stubs were demoted to explicit `501` responses to prevent accidental production use.

## 2. Files reviewed

- `src/App.tsx`
- `src/components/LicenseScreen.tsx`
- `src/components/LicenseValueCard.tsx`
- `src/components/Settings.tsx`
- `src/components/cloud/CloudUpsellCard.tsx`
- `src/services/siteProofDataService.ts`
- `src/services/cloudSyncService.ts`
- `src/services/cloudflareClient.ts`
- `workers/siteproof-api/src/index.ts`
- `workers/siteproof-api/src/ai/types.ts`
- `wrangler.toml`

## 3. Files changed

- `src/App.tsx`
- `src/components/LicenseScreen.tsx`
- `src/components/LicenseValueCard.tsx`
- `src/components/cloud/CloudUpsellCard.tsx`
- `src/config/i18n.ts`
- `src/services/licenseService.ts`
- `src/services/licenseApiClient.ts`
- `src/services/cloudflareClient.ts`
- `src/licenseBoundary.test.ts`
- `workers/siteproof-api/src/index.ts`
- `workers/siteproof-api/src/ai/types.ts`
- `workers/siteproof-api/migrations/0001_licenses.sql`

## 4. License/trial behavior implemented

- New local-first `LicenseService` starts a 30-day trial locally.
- License state persists locally and supports:
  - `trial_active`
  - `trial_expired`
  - `licensed`
  - `license_pending_verification`
  - `license_invalid`
  - `offline_grace`
- Verification failure keeps licensed users in safe offline grace instead of destroying local state.
- App initialization no longer hard-blocks core routes solely because the local trial expired.

## 5. Purchase/license authority

- Frontend `LicenseApiClient` calls the configured `VITE_SITEPROOF_API_BASE_URL`.
- Production purchase/license authority is `siteproof.report`, not the app Worker.
- The app frontend contains no Stripe secret keys.
- App Worker billing/license routes now return `501` with a clear message directing developers to `siteproof.report`.
- The app Worker must not return fake Stripe checkout URLs or fake successful `licensed` states.

## 6. Cloudflare Worker boundary behavior implemented

- App Worker keeps app-owned route boundaries for:
  - `GET /health`
  - `POST /cloud/upload-url`
  - `POST /cloud/commit`
  - `GET /cloud/job/:jobId`
- Demoted purchase/license routes:
  - `POST /checkout/create`
  - `POST /stripe/webhook`
  - `POST /license/activate`
  - `POST /license/bootstrap`
  - `POST /license/verify`
  - matching `/api/...` variants
- Demoted routes return explicit `501` JSON instead of fake success.

## 7. Cloudflare D1/R2 boundary behavior implemented or documented

- Added `workers/siteproof-api/migrations/0001_licenses.sql` for `licenses` and `license_events`.
- Added deterministic cloud object key generation in `CloudflareClient`.
- R2 upload URL generation is safely stubbed at the Worker boundary pending deployed credentials/configuration.

## 8. Offline behavior confirmation

- Job creation, local capture, notes, local persistence, and PDF generation were not given new network requirements.
- License verification failure is safe and non-destructive.
- Cloud sync remains opt-in and disabled by default.

## 9. Bilingual UI confirmation

- New license/cloud UI copy uses the existing i18n system in English and Spanish.

## 10. Language model independence

- `uiLanguage`, `captureLanguage`, and `exportLanguage` remain independent.
- License state does not alter capture or export language behavior.

## 11. PDF/export confirmation

- PDF/export behavior remains controlled by `exportLanguage`; this pass did not alter report language behavior.

## 12. Optional cloud confirmation

- Cloud storage remains optional and non-blocking.
- `CloudSyncService` still no-ops when cloud is disabled and queues when offline.

## 13. Security notes

- No Stripe secret key, webhook signing secret, or Cloudflare secret was added to frontend code.
- Worker routes use environment placeholders and validate expected payloads.
- No unnecessary license key logging was added.

## 14. Tests added or strengthened

- Local trial creation/persistence.
- Failed verification safe offline behavior.
- Deterministic cloud object keys.
- No frontend Stripe secret leakage.
- License/cloud UI i18n guard.

## 15. Validation results

- `npm install` ✅
- `npm run lint` ✅
- `npm run test` ✅
- `npm run build` ✅
- `npm run ai:check` ✅
- `npm run quality:check` ✅

## 16. Remaining risks

- Stripe Checkout session creation, webhook verification, customer/company/license persistence, and license verification now belong in the `siteproof.report` Worker.
- Signed Cloud Proof Vault uploads require deployed backend support before setting `VITE_SITEPROOF_CLOUD_VAULT_ENABLED=true`.

## 17. Exact blockers

- Production app purchase/activation requires `VITE_SITEPROOF_API_BASE_URL` pointing to the deployed `siteproof.report` API.
- Production billing/license work should be implemented in `siteproof.report`, not reintroduced in the app Worker.
- Production cloud upload signing requires deployed upload/commit routes and storage binding behavior.

## 18. Merge recommendation

`READY TO MERGE WITH NOTED RISKS`
