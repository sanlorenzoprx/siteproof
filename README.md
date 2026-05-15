# SiteProof

Offline-first proof-of-work operating system for field contractors.

## What changed in this package

- Project package name changed to `siteproof`.
- Added `src/db/schema.ts` with SiteProof Data Schema v1 entities.
- Added `src/db/indexedDb.ts` with native IndexedDB object-store setup.
- Added `src/db/repositories/*` starter repositories for jobs, proof, media, workflow stages, templates, exports, sync, timeline, voice notes, and customers.
- Added `src/templates/workflowTemplate.types.ts`.
- Added `src/templates/generator_install_v1.json` as the first real workflow template.

## Run locally

```bash
npm install
npm run dev
```

## Type check

```bash
npm run lint
```

## Notes

The existing app UI still uses the current Dexie-backed `StorageService` so the prototype remains functional. The new `src/db` layer is added as the next-generation SiteProof persistence layer and can be wired into screens incrementally.


## Pilot readiness

This build includes Pilot Readiness Hardening v1.

Run the full pilot check:

```bash
npm run pilot:check
```

Open the in-app pilot screen:

```text
/pilot-readiness
```

See:

- `docs/SETUP.md`
- `docs/PILOT_READINESS_HARDENING_V1.md`
- `docs/PILOT_FIELD_TEST_SCRIPT.md`

## Runtime Orchestration v1

This build includes the first fully connected SiteProof runtime bridge. The existing UI remains operational while the app now creates runtime `Job`, `WorkflowStageInstance`, `ProofObject`, `MediaAsset`, `TimelineEvent`, and `SyncOperation` records behind the scenes.

See:

- `src/services/runtimeOrchestrator.ts`
- `src/services/RUNTIME_ORCHESTRATION.md`
- `docs/SITEPROOF_RUNTIME_HANDOFF.md`

Validation:

- `npm run lint` passed
- `npm run build` passed
