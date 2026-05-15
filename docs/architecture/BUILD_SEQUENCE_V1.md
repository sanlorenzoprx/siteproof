# SiteProof Build Sequence v1

Use this document before starting any new development branch.

## Current Priority Order

1. Architecture governance and repository discipline
2. Device validation and offline survival testing
3. Sync/runtime reliability hardening
4. Media pipeline hardening
5. Export engine polish from canonical proof objects
6. Guided workflow validation rules
7. Operational AI extraction
8. Compliance/template packs
9. Crew accountability layer
10. Template marketplace

## Feature Intake Checklist

Before building a feature, answer:

1. Which phase does this belong to?
2. Which canonical primitive does it extend?
3. Does it require an ADR?
4. Does it add a new store, model, queue, or service boundary?
5. Can it be represented with existing `ProofObject`, `MediaAsset`, `TimelineEvent`, `ExportPacket`, or `SyncOperation`?
6. What is the device-validation risk?
7. What is the offline failure mode?
8. What is the export/report impact?

## ADR Required When

An ADR is required when a change:

- adds a new source-of-truth model
- bypasses repositories
- changes proof hashing/custody behavior
- changes sync semantics
- adds a new external service dependency
- changes template schema
- changes export packet assembly
- adds multi-user permission logic

## Definition of Done for Architecture-Sensitive Features

A feature is not done until:

- it uses canonical primitives
- it has sync state where needed
- it has proof/timeline/export hooks where relevant
- it passes `npm run governance:check`
- it documents any new exceptions in an ADR
