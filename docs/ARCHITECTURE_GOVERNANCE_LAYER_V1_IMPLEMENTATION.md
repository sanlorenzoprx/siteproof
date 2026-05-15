# SiteProof Architecture Governance Layer v1 — Implementation Summary

## What Changed

This pass adds a lightweight architecture governance system so SiteProof development stays sequenced around canonical primitives instead of drifting into feature-specific source-of-truth models.

## Added Files

### Architecture Docs

- `docs/architecture/ARCHITECTURE_GOVERNANCE_V1.md`
- `docs/architecture/PRIMITIVES_V1.md`
- `docs/architecture/BUILD_SEQUENCE_V1.md`
- `docs/architecture/GOVERNANCE_CHECKS_V1.md`

### Architecture Decision Records

- `docs/adr/ADR-001-canonical-proof-object.md`
- `docs/adr/ADR-002-repository-layer-source-of-truth.md`
- `docs/adr/ADR-003-build-sequence-governance.md`
- `docs/adr/ADR-004-export-manifest-required.md`

### Automation

- `config/siteproof-governance.json`
- `scripts/governance-check.mjs`

### Package Scripts

- `npm run governance:check`
- `npm run quality:check`

## What the Governance Check Enforces

The automated check verifies:

- required architecture docs exist
- required ADRs exist
- canonical primitives still exist in `src/db/schema.ts`
- obvious duplicate source-of-truth model names are not introduced
- direct database access is kept inside explicit repository/adapter boundaries
- legacy storage exceptions stay documented

## Canonical Primitives Protected

- `Job`
- `WorkflowStageInstance`
- `ProofObject`
- `MediaAsset`
- `VoiceNote`
- `TimelineEvent`
- `ExportPacket`
- `SyncOperation`
- `ChangeOrderCandidate`

## Current Intentional Warnings

The governance check warns about existing direct `localStorage` use in:

- `src/components/Settings.tsx`
- `src/components/SpeechCalibration.tsx`

These are warnings, not failures, because they existed before this governance layer. They should eventually move behind a settings/profile adapter.

## Recommended Daily Commands

```bash
npm run governance:check
npm run quality:check
```

## Verified

- `npm run lint` passed
- `npm run governance:check` passed with two known warnings
- `npm run build` passed
- `npm run pilot:smoke` passed

## Next Recommended Pass

Move the two remaining component-level `localStorage` usages behind `appSettingsService`, then upgrade those governance warnings into hard failures.
