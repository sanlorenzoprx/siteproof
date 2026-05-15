# ADR-001 — ProofObject Is the Canonical Evidence Primitive

## Status

Accepted

## Context

SiteProof began as offline job documentation, but the target product category is trusted field evidence. Photos, voice notes, signatures, checklist items, GPS events, serial numbers, documents, and test results all need shared identity, integrity, sync, timeline, and export behavior.

## Decision

`ProofObject` is the canonical evidence primitive. Every field-evidence item must anchor to a `ProofObject`. Media, voice notes, timeline events, export packets, workflow requirements, and sync operations reference proof IDs instead of inventing separate evidence models.

## Consequences

Positive:
- consistent evidence identity
- simpler export manifests
- better timeline playback
- easier sync behavior
- stronger proof integrity

Tradeoffs:
- capture features must create or resolve a proof object before they are considered complete
- legacy photo/voice records require migration bridges until fully converted
