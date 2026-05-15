# SiteProof DB Layer Integration Notes

This project now contains two persistence layers:

1. Existing prototype layer: `src/services/siteProofDataService.ts`
   - Dexie database: `SiteProofDB`
   - Supports current UI screens.

2. New SiteProof architecture layer: `src/db/*`
   - Native IndexedDB database: `siteproof_offline_db`
   - Implements Data Schema v1 and repository pattern.
   - Intended to replace the prototype storage layer incrementally.

Recommended migration order:

1. Seed `generator_install_v1.json` into `workflow_template_cache`.
2. Update job creation to create Data Schema v1 `Job` records.
3. Instantiate `WorkflowStageInstance` rows from the selected template.
4. Update camera capture to create `ProofObject` + `MediaAsset` rows.
5. Update PDF export to read from `ProofObject.export_tags` and template `export_profiles`.
6. Replace existing sync with `SyncOperation` queue processing.

The current UI was intentionally left compatible with the existing storage service to avoid breaking the working prototype while adding the new architecture.
