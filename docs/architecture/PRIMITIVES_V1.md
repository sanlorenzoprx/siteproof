# SiteProof Canonical Primitives v1

These primitives are the architecture spine. Features extend these models instead of creating parallel models.

## Job

Represents a field job. Jobs are containers for workflow stages, proof, media, timeline events, exports, and sync operations.

Source of truth:
- `src/db/schema.ts` → `Job`
- `src/db/repositories/jobRepository.ts`

## WorkflowStageInstance

Represents actual progress through a job workflow. It should be created from templates and used to drive required proof.

Source of truth:
- `src/db/schema.ts` → `WorkflowStageInstance`
- `src/db/repositories/workflowStageRepository.ts`

## ProofObject

The canonical evidence item. Photos, voice notes, signatures, measurements, documents, and checklist completions must anchor to a `ProofObject`.

Required integrity expectations:
- immutable `proof_id`
- `job_id`
- `proof_type`
- `captured_at`
- optional `stage_instance_id`
- optional `requirement_id`
- integrity hash fields when applicable
- custody/audit event metadata

Source of truth:
- `src/db/schema.ts` → `ProofObject`
- `src/db/repositories/proofRepository.ts`
- `src/services/proofIntegrityService.ts`

## MediaAsset

The canonical media record. A media asset must link to exactly one proof object.

Required expectations:
- immutable `media_id`
- `proof_id`
- local URI
- MIME type
- file size
- checksum when available
- compression/upload state

Source of truth:
- `src/db/schema.ts` → `MediaAsset`
- `src/db/repositories/mediaRepository.ts`

## VoiceNote

A structured voice evidence attachment. Voice notes are not standalone evidence; they must link to a `ProofObject`.

Source of truth:
- `src/db/schema.ts` → `VoiceNote`
- `src/db/repositories/voiceNoteRepository.ts`
- `src/services/voiceAIService.ts`

## TimelineEvent

The canonical chronological record. Timeline playback, audit views, and exports must use this primitive.

Source of truth:
- `src/db/schema.ts` → `TimelineEvent`
- `src/db/repositories/timelineRepository.ts`

## ExportPacket

The canonical generated report/packet record. All export artifacts should be traceable to included proof IDs and manifest hashes.

Source of truth:
- `src/db/schema.ts` → `ExportPacket`
- `src/db/repositories/exportRepository.ts`
- `src/features/export/exportAssembler.ts`

## SyncOperation

The canonical queued sync action for durable background work.

Source of truth:
- `src/db/schema.ts` → `SyncOperation`
- `src/db/repositories/syncRepository.ts`
- `src/services/sync/**`

## ChangeOrderCandidate

Structured field intelligence extracted from voice, notes, labels, or manual input. It must reference source proof whenever possible.

Source of truth:
- `src/db/schema.ts` → `ChangeOrderCandidate`
- `src/db/repositories/changeOrderRepository.ts`
