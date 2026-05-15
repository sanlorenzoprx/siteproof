# SiteProof Legacy Cleanup Automation v1 — Implementation Summary

## What Changed

This pass bakes "clean up as we go" into the SiteProof development workflow.

Added:

- `governance/legacy-cleanup-workflow.md`
- `docs/architecture/LEGACY_CLEANUP_AUTOMATION_V1.md`
- `docs/ai/legacy-cleanup-audit-prompt.md`
- `scripts/legacy-architecture-check.mjs`
- `npm run legacy:check`
- `legacy:check` inside `npm run quality:check`
- legacy cleanup lens in `CODEX.md`
- legacy cleanup prompt in Codex packets
- legacy cleanup assessment in the AI review schema

## Cleanup Performed Now

Removed component-level persistent `localStorage` usage from:

- `src/components/Settings.tsx`
- `src/components/SpeechCalibration.tsx`
- `src/components/VoiceNoteCapture.tsx`

Cloud settings now go through the `CloudService` adapter boundary.

Speech calibration state now goes through `AppSettingsService` instead of direct component storage.

## Automation Behavior

Run:

```bash
npm run legacy:check
```

The script fails when new unsafe legacy spread appears, including:

- component-level persistent browser storage writes
- direct DB imports outside approved boundaries
- direct legacy table access outside approved boundaries
- duplicate legacy-style primitive models

It warns about contained migration adapters that still exist, so future cleanup remains visible without blocking pilot work.

## Validation

Passed:

```bash
npm run quality:check
```

Includes:

- TypeScript lint
- architecture governance check
- legacy cleanup check
- AI Improvement System check
- production build
- pilot smoke check
```
