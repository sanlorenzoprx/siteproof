# SiteProof Architecture Governance Layer v1

SiteProof is an offline-first proof-of-work system. This governance layer keeps new development sequenced around the canonical domain primitives instead of allowing feature-specific shortcuts to become architecture.

## Governance Goals

1. Protect the canonical data model.
2. Prevent duplicate storage, sync, proof, media, timeline, and export abstractions.
3. Force each new feature to declare its dependency phase before implementation.
4. Keep legacy storage contained while the repository layer becomes the source of truth.
5. Make proof integrity, sync state, and export manifests non-negotiable.

## Canonical Build Sequence

### Phase 1 — Core Integrity

Purpose: make every captured item trustworthy evidence.

Required primitives:
- `ProofObject`
- `MediaAsset`
- `TimelineEvent`
- `ExportPacket`

Required services:
- `proofIntegrityService`
- `proofCaptureService`
- `proofRepository`
- `timelineRepository`

Exit criteria:
- every new proof has immutable ID
- every media-backed proof receives a SHA-256 integrity hash
- every export has a manifest hash
- every proof has an audit/custody event

### Phase 2 — Storage Stability

Purpose: make the local repository layer the true source of truth.

Required primitives:
- repository interfaces
- sync state fields
- durable local IDs
- legacy migration adapters

Exit criteria:
- no new direct Dexie/local IndexedDB access outside allowed storage adapters
- no new direct `localStorage` persistence except explicitly allowed settings/session adapters
- legacy `storageService` remains a migration bridge, not a new feature dependency

### Phase 3 — Workflow Intelligence

Purpose: make SiteProof specialty-aware instead of generic job software.

Required primitives:
- `WorkflowStageInstance`
- requirement IDs
- workflow templates
- missing-proof validation

Exit criteria:
- guided workflows use templates, not hardcoded component flows
- requirements bind to `ProofObject.requirement_id`
- stages bind to `ProofObject.stage_instance_id`

### Phase 4 — Export System

Purpose: make PDF/report output a first-class product.

Required primitives:
- `ExportPacket`
- export manifest
- included proof IDs
- packet type

Exit criteria:
- exports assemble from `ProofObject`, `MediaAsset`, and `TimelineEvent`
- exports include proof integrity summary
- export packets are queued for sync when cloud is enabled

### Phase 5 — Operational AI

Purpose: use AI invisibly to reduce field friction.

Required primitives:
- proof labels
- voice note extraction
- change order candidates
- missing-proof suggestions

Exit criteria:
- AI output is stored as structured metadata on canonical primitives
- no AI-only source of truth
- all AI output remains reviewable/correctable

### Phase 6 — Multi-User / Crew Operations

Purpose: add accountability without becoming generic contractor SaaS.

Required primitives:
- actor fields
- custody logs
- sync state by entity
- timeline events

Exit criteria:
- crew activity is represented as timeline/proof/sync events
- no chat, scheduling, or CRM expansion without a separate ADR

## Non-Negotiable Rules

1. New evidence must become a `ProofObject`.
2. New media must become a `MediaAsset` linked to a `ProofObject`.
3. New chronology must become a `TimelineEvent`.
4. New reports must become an `ExportPacket` with a manifest.
5. New syncable work must create or update a `SyncOperation` or canonical sync fields.
6. Feature modules may compose primitives, but may not invent parallel source-of-truth models.
7. Legacy paths may exist only behind documented adapter boundaries.

## Allowed Legacy Boundaries

These files may continue to touch legacy storage during migration:

- `src/services/storageService.ts`
- `src/services/appSettingsService.ts`
- `src/services/cloudService.ts`
- `src/db/indexedDb.ts`
- `src/db/repositories/**`

No new files should be added to this list without an ADR.
