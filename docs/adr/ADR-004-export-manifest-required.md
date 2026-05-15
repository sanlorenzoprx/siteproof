# ADR-004 — Export Packets Require Integrity Manifests

## Status

Accepted

## Context

For contractors, exports are often the product customers, inspectors, insurers, and internal teams actually see. If exports are used as trusted field evidence, they must be traceable back to captured proof.

## Decision

Every `ExportPacket` should include a manifest ID/hash when generated from canonical proof. PDF/report output should include a proof integrity summary when possible.

## Consequences

Positive:
- stronger dispute defense
- easier verification
- better customer/inspector trust

Tradeoffs:
- export assembly must depend on canonical proof/media/timeline primitives
