# SiteProof Runtime Orchestration v1

This codebase is now wired around the SiteProof architecture chain:

```text
Legacy UI Job → Runtime Job → WorkflowStageInstance → ProofObject → MediaAsset → TimelineEvent → SyncOperation
```

## What is connected

- `RuntimeOrchestrator.initialize()` seeds the bundled `generator_install_v1` template into the offline template cache.
- `SiteProofDataService.saveJob()` now creates/updates the runtime `Job` and instantiates workflow stages from template JSON.
- `SiteProofDataService.savePhoto()` now creates runtime `ProofObject`, `MediaAsset`, `TimelineEvent`, updates stage completion, and queues sync operations.
- `SiteProofDataService.saveVoiceNote()` now creates runtime voice proof, optional audio media, `VoiceNote`, `TimelineEvent`, and sync operations.
- `SiteProofDataService.getRuntimeSnapshot()` computes missing required proof and proof score from the template/runtime database.
- `JobDetail` now prefers runtime proof score/missing-proof results when available while preserving the existing UI.

## Compatibility approach

The existing UI tables remain in place so the current prototype keeps working. Runtime orchestration runs alongside the legacy UI state and creates the new SiteProof data model in `siteproof_offline_db`.

This allows incremental migration instead of a dangerous full rewrite.

## Next migration wave

1. Replace legacy `Job`, `JobPhoto`, and `VoiceNote` UI types with runtime entities.
2. Render workflow stages directly from `WorkflowStageInstance` + template JSON.
3. Replace old `JOB_TEMPLATES` checklist with `WorkflowTemplateCache`.
4. Make PDF export use `ExportProfile` + `ProofObject.export_tags`.
5. Add real media blob storage behind `MediaAsset.local_uri`.
6. Add visible sync queue panel from `SyncOperation`.
