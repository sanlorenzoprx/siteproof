# SiteProof Legacy Cleanup Pass v3

## Purpose

Remove the final `src/services/storageService.ts` compatibility warning and make cleanup-as-you-go automation stricter.

## Completed

- Removed `src/services/storageService.ts`.
- Added `src/services/siteProofDataService.ts` as the canonical app-facing data facade.
- Routed app profiles, user profile, license, sync state, and last-active-job data through `AppSettingsService` / `app_settings`.
- Routed jobs, proof capture, photos, voice notes, runtime snapshots, and deletion through `RuntimeOrchestrator` and canonical repositories.
- Removed the legacy warning allowance from `config/siteproof-governance.json`.
- Updated UI and service imports to use `SiteProofDataService`.
- Preserved photo preview metadata in runtime ProofObject metadata so UI capture still has local preview continuity.
- Reworked the quality gate into `scripts/quality-check.mjs` to avoid shell-chain hangs around Vite/PWA builds.
- Added Vite manual chunks for vendor, icons, dates, motion, PDF tooling, and export assembly.

## Validation

Passed:

```bash
npm run quality:check
```

Included checks:

```bash
npm run lint
npm run governance:check
npm run legacy:check
npm run ai:check
vite build
npm run pilot:smoke
```

## Result

No remaining `storageService.ts` warning. Legacy cleanup automation now has no contained legacy adapter exception.
