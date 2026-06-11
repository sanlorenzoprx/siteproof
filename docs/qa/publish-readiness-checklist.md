# SiteProof Publish Readiness Checklist

Use this checklist as the final go/no-go runway before publishing SiteProof. The app remains offline-first; production publishing only clears when local app gates, Worker/cloud gates, commercial purchase flow, privacy checks, and phone QA are all confirmed.

## Automated Local Gates

Run from `C:\repos\SiteProof`:

```bash
npm run lint
npm test
npm run build
npm run quality:check
npm run publish:check
```

For the final pre-publish pass, use strict mode after all manual/external placeholders are real:

```bash
npm run publish:check:strict
```

Expected result:

- TypeScript passes with no errors.
- Unit tests pass.
- Production build writes `dist/index.html` and `dist/sw.js`.
- Governance, legacy containment, AI guardrails, frontend secret checks, and pilot smoke checks pass.
- Publish readiness check has no automated blockers.

## App Release Gates

- Activation links with `license` and `token` apply the license plus purchase settings seed.
- Token-only activation still works without storing the raw token.
- Existing manual license activation still works.
- Existing edited settings are not overwritten silently by a purchase seed.
- Settings contain company profile, report defaults, cloud/license, accessibility, bidding defaults, and video defaults.
- Report branding uses company/report defaults when present and preserves blank-field fallback behavior.
- App can create both approved jobs and bid jobs.
- Photo, document, and video proof save locally first.
- Video proof respects max duration and file-size settings.
- Video proof is referenced in reports; full video files are not embedded into PDFs.
- Customer reports exclude private/internal/hidden proof.
- Customer bid reports exclude internal notes and private metrics.
- Internal bid reports remain internal-only by default.

## Worker / Cloud Gates

Run these against local/staging before production:

```bash
npx wrangler d1 migrations list siteproof-db
npx wrangler d1 migrations apply siteproof-db --local
npx wrangler dev
```

Confirm:

- `wrangler.toml` uses the real production/staging D1 `database_id`, not the placeholder.
- D1 migrations for `licenses`, `company_profiles`, `purchase_intake_events`, and `cloud_storage_objects` are applied.
- `/api/health` or `/health` returns a healthy JSON response.
- `/api/cloud/upload-url` validates object type, report type, visibility, file size, content type, and sha256.
- `/api/cloud/upload-url` returns the R2-backed `/cloud/upload-object` route, not a mock upload URL.
- `/cloud/upload-object` stores proof media in `SITEPROOF_MEDIA` and reports/share packages in `SITEPROOF_EXPORTS`.
- `/api/cloud/commit` rejects mismatched sha256 or file size.
- `/api/cloud/jobs/:jobId` lists only the owner-scoped job objects.
- `/api/cloud/objects/:cloudObjectId/download` allows the authenticated owner to download stored proof/report bytes.
- `/api/cloud/share-links` includes only `customer_visible` objects.
- R2/D1 bindings are configured for `SITEPROOF_DB`, `SITEPROOF_MEDIA`, and `SITEPROOF_EXPORTS`.
- The Cloudflare account contains enough private objects to rebuild reports: photos, documents, video, thumbnails, audio/voice notes, transcripts, tags/AI extraction metadata, report objects, bid report variants, signatures, and share packages.

Each uploaded object has:

- owner ID, job ID, object type, optional report type, and visibility.
- deterministic storage key, content type, file size, sha256, timestamps, sync status, and optional share link ID.
- private reconstruction metadata for proof type, proof ID, category, requirement/stage IDs, language, integrity/custody state, report variation hints, extracted tags, and related media/transcript/cloud keys.
- owner downloads can retrieve private/internal/customer-visible objects, while customer share links include only `customer_visible` objects.

## Commercial Flow Gates

Run a Stripe sandbox purchase end to end:

1. Select a plan on the offer site.
2. Enter intake: company name, owner/admin, email, phone, trade, service area, business address, license number, language, report language, crew/device count, and cloud plan.
3. Complete Stripe test checkout with a successful test card.
4. Confirm webhook writes or updates license, company profile, purchase intake event, and license event rows.
5. Confirm duplicate webhook delivery is idempotent.
6. Confirm Thank You page shows plan, license email, activation code or magic link, download/open-app actions, and cloud entitlement copy.
7. Open SiteProof from the magic link.
8. Confirm app license is `licensed`, cloud entitlement is active, and settings are prefilled.
9. Confirm checkout cancel and delayed-webhook recovery copy are understandable.

Do not publish if purchase succeeds but license activation or settings prefill fails.

## Environment / Secret Gates

Production values must be set in the deployment platform, not committed to frontend code:

- `VITE_SITEPROOF_API_BASE_URL`
- `VITE_SITEPROOF_LICENSE_API_BASE_URL`
- `VITE_SITEPROOF_CLOUD_VAULT_ENABLED`
- Stripe secret key and webhook secret in server/Worker secrets only.
- Cloudflare/R2/D1 credentials and bindings in Cloudflare only.
- Turnstile key/secret in the correct site repo or Worker context.

Before deploying the report site, set build-time public keys first, rebuild, and then deploy. For the report site Turnstile flow, verify the deployed bundle picked up the public site key before interpreting headless browser failures.

## Phone QA Gates

Test on at least one real phone over HTTPS:

- Install/open PWA.
- Create an approved job.
- Capture photo proof with caption.
- Capture document proof with document type and note.
- Capture 5-10 seconds of video proof, preview it, retake it, and save it.
- Confirm offline capture works and sync status becomes pending.
- Reconnect and confirm cloud upload/share flow where enabled.
- Generate customer completion, daily proof, inspection readiness, payment final handoff, office/internal, and all-reports packets.
- Create a bid job, add internal notes and mixed-visibility metrics, then generate internal and customer bid reports.
- Confirm Spanish/English UI and export language paths still work.

## Required Publish Evidence

Record this before go/no-go:

- App commit hash:
- Website/report commit hash:
- Worker commit hash:
- Environment tested: local / staging / production
- Browser/device tested:
- Stripe test checkout session:
- Webhook event ID:
- License ID:
- D1 migration status:
- R2 upload object keys:
- App activation result:
- Settings prefill result:
- Offline/reconnect result:
- Customer privacy check result:
- Final command results:

## Go / No-Go Rule

Go only when:

- `npm run publish:check:strict` passes.
- The Stripe sandbox purchase activates the app and prefills settings.
- Phone capture works for photo, document, and video.
- Cloud upload/share visibility is correct.
- Customer reports and customer bid reports do not leak internal/private data.
- No frontend bundle contains server-side secrets.
