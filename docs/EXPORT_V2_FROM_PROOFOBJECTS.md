# SiteProof Export v2 From ProofObjects

## What changed

Export generation now assembles packets from the canonical runtime entities first:

```text
Job
→ WorkflowStageInstance
→ ProofObject
→ MediaAsset
→ VoiceNote
→ TimelineEvent
→ ExportPacket
```

The legacy `JobPhoto[]` and `VoiceNote[]` inputs are still accepted by `PdfService.generateReport(...)` for UI compatibility, but the PDF service now attempts a canonical export assembly before rendering.

## New files

```text
src/features/export/exportAssembler.ts
```

## Updated files

```text
src/features/export/exportPacketService.ts
src/services/pdfService.ts
```

## Behavior

When a report is generated:

1. `PdfService` calls `ExportAssembler.assemble(job.id, mode)`.
2. The assembler loads canonical repository records:
   - runtime job
   - workflow stages
   - proof objects
   - media assets
   - structured voice notes
   - timeline events
3. Proof is selected using `ProofObject.export_tags` and packet type.
4. PDF rendering uses canonical ProofObject IDs while preserving available legacy media previews where needed.
5. `ExportPacket.included_proof_ids` now stores canonical `ProofObject.proof_id` values.
6. An `export_generated` TimelineEvent is created with related proof IDs.

## Why legacy media fallback still exists

The current browser prototype still stores some actual image/audio preview blobs in legacy Dexie records. Export v2 now uses ProofObjects as the source of truth for selection and packet metadata, while using legacy media blobs only as a rendering fallback until the media file store becomes the sole binary source.

This is intentional and safe:

- ProofObject decides what belongs in the packet.
- MediaAsset describes the canonical media lifecycle.
- Legacy photo/note blobs are only used to display images/audio previews during the transition.

## Next cleanup

The next export/media cleanup should move actual binary retrieval behind a `mediaResolverService`, so PDFs never need to know whether media came from legacy Dexie, IndexedDB blob storage, OPFS, or Android local file storage.
