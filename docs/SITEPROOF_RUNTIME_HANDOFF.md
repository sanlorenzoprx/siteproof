# SiteProof Runtime Refactor v1 — Handoff

## What changed

This update connects the prototype UI to the new SiteProof runtime architecture without breaking the existing screens.

The app now writes to both:

1. the existing Dexie prototype tables used by the current UI, and
2. the new SiteProof runtime database: `siteproof_offline_db`.

This creates a safe migration bridge.

## Connected runtime chain

```text
Create Job
  → Runtime Job
  → WorkflowStageInstance records from generator_install_v1.json
  → Photo / Voice capture
  → ProofObject
  → MediaAsset
  → VoiceNote when applicable
  → TimelineEvent
  → SyncOperation
  → Missing-proof / proof-score recomputation
```

## New files added

```text
src/services/runtimeOrchestrator.ts
src/services/RUNTIME_ORCHESTRATION.md
docs/SITEPROOF_RUNTIME_HANDOFF.md
docs/SiteProof_OS_North_Star_10X.md
docs/Top_Trades_by_Workforce.txt
docs/SiteProof_OS_for_Contractors_Offline_Jobsite_Documentation_System.docx
```

## Updated files

```text
src/App.tsx
src/services/storageService.ts
src/components/JobDetail.tsx
```

## Runtime behavior now wired

### App startup

`RuntimeOrchestrator.initialize()` runs during app init and caches the bundled generator install template.

### Job creation/update

`StorageService.saveJob()` still saves the legacy UI job, then calls:

```ts
RuntimeOrchestrator.upsertJobFromLegacy(job)
```

This creates/updates:

- runtime Job
- Customer
- WorkflowStageInstance records
- TimelineEvent
- SyncOperation records

### Photo capture

`StorageService.savePhoto()` still saves the legacy photo, then calls:

```ts
RuntimeOrchestrator.savePhotoFromLegacy(photo)
```

This creates:

- ProofObject
- MediaAsset
- TimelineEvent
- SyncOperation records
- updated WorkflowStageInstance completion counts

### Voice capture

`StorageService.saveVoiceNote()` still saves the legacy voice note, then calls:

```ts
RuntimeOrchestrator.saveVoiceNoteFromLegacy(note)
```

This creates:

- ProofObject
- optional audio MediaAsset
- runtime VoiceNote
- TimelineEvent
- SyncOperation records
- updated stage completion counts

### Job detail proof score

`JobDetail` now calls:

```ts
StorageService.getRuntimeSnapshot(jobId)
```

When available, the UI uses runtime proof score and missing proof computed from `generator_install_v1.json`.

## Validation performed

```text
npm run lint  ✅ passed
npm run build ✅ passed
```

Build warning:

Vite warns that one chunk is larger than 500 KB. This is not a runtime failure. Code splitting can be handled in a later optimization pass.

## Important limitation

The current runtime bridge stores media references in `MediaAsset.local_uri`, but the actual binary Blob still lives in the legacy Dexie photo/voice tables. This is intentional for this migration step.

Next media migration should add a real media blob store behind:

```text
siteproof://media/{job_id}/{media_id}/original.jpg
```

## Recommended next coding wave

1. Replace old `JOB_TEMPLATES` UI checklist with `WorkflowTemplateCache` rendering.
2. Render workflow stages directly from `WorkflowStageInstance`.
3. Make camera category prompts come from `ProofRequirement` objects.
4. Make PDF export use `ExportProfile` + `ProofObject.export_tags`.
5. Add actual binary media storage service.
6. Add visible sync queue / sync confidence UI from `SyncOperation`.
7. Add migration screen to convert existing legacy jobs/photos into runtime entities in bulk.
