# SiteProof Stabilization Refactor v1

This pass reduced prototype coupling and moved runtime behavior toward service/repository orchestration.

## Changed

- Added `TemplateCatalogService` as the central template lookup/catalog layer.
- Added `JobWorkflowService` for job creation, quick-start parsing, and completion updates.
- Added `ProofCaptureService` for camera and voice proof capture.
- Updated Create Job to use template IDs from `generator_install_v1.json` instead of legacy hardcoded template IDs.
- Updated Job List quick start to route through `JobWorkflowService`.
- Updated Camera Capture to load capture categories from the active workflow template.
- Updated Voice Capture to load capture categories from the active workflow template.
- Updated PDF checklist generation to use `WorkflowTemplate` proof requirements instead of legacy `JOB_TEMPLATES`.
- Updated AI Foreman audit to evaluate missing proof from workflow template requirements.
- Cleaned user-facing copy away from prototype/demo language and toward field-first language.
- Left a compatibility adapter at `src/constants/templates.ts` so older imports do not break while future code migrates fully to `TemplateCatalogService`.

## Runtime direction

Preferred flow:

```text
UI → JobWorkflowService / ProofCaptureService → StorageService → RuntimeOrchestrator → Repositories → IndexedDB
```

Preferred template flow:

```text
WorkflowTemplate JSON → TemplateCatalogService → UI prompts / proof capture / exports / readiness scoring
```

## Still intentionally deferred

- Full removal of legacy `StorageService` facade.
- Full conversion of legacy Dexie stores to the new repository-only schema.
- Real media blob filesystem/OPFS pipeline.
- Complete sync worker implementation.
- Multi-template catalog beyond generator install.

Those are safer as separate phases after the field workflow remains stable.
