# Legacy Cleanup Automation v1

## Purpose

Legacy Cleanup Automation v1 turns "clean up as we go" into an executable workflow.

SiteProof should not wait for a major rewrite to retire old architecture. Each feature pass should detect, contain, and reduce legacy surface area when encountered.

## Automation Added

### Script

```bash
npm run legacy:check
```

The check scans the codebase for legacy spread signals, including:

- component-level persistent browser storage
- direct database imports outside approved repository/adapter boundaries
- direct legacy table access outside approved boundaries
- duplicate primitive/model names
- known legacy adapter files that still exist and should remain contained

The script passes when legacy architecture is contained and fails when new unsafe legacy usage appears.

### Aggregate Quality Gate

`npm run quality:check` includes `legacy:check`, so cleanup guardrails run alongside lint, governance, AI checks, build, and pilot smoke checks.

## Proper Workflow

When building a feature:

1. Generate a Codex packet with `npm run ai:codex-packet -- <feature-file>`.
2. Review the legacy cleanup section before implementation.
3. If touched code uses legacy architecture, migrate it behind a repository/runtime/service boundary when safe.
4. Run `npm run legacy:check` before merging.
5. If cleanup cannot happen safely, document the reason in the feature implementation notes and prevent the legacy pattern from spreading.

## Cleanup Priority

Prioritize continuous cleanup in this order:

1. component-level persistence leaks
2. direct DB/table access outside repositories
3. duplicate canonical primitives
4. feature-specific sync paths
5. export paths that bypass proof manifests
6. media paths that bypass proof/media pipeline services
7. remaining legacy adapters once all callers have migrated

## Current Standard

Legacy code may remain only when it is explicitly contained as a migration adapter or compatibility bridge.

New feature work should extend canonical systems:

- ProofObject
- TimelineEvent
- WorkflowStageInstance
- SyncOperation
- ExportPacket
- repositories/runtime services

not old parallel structures.


## Legacy Cleanup Pass v2 Update

The current legacy cleanup signal has been narrowed to one actual compatibility adapter: `src/services/storageService.ts`. Device settings now use `app_settings`, cloud configuration no longer writes directly to browser storage, and UI sync controls call `SyncRuntime` directly after removal of the old `SyncService` facade. Low-level runtime storage boundaries are tracked separately from legacy adapters.
