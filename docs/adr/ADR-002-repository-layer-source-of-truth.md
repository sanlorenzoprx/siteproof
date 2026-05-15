# ADR-002 — Repository Layer Is the Source of Truth

## Status

Accepted

## Context

Offline-first systems fail when components directly access storage in inconsistent ways. SiteProof previously used a legacy storage service and direct local database access patterns. The repository layer now needs to become the stable boundary for application data.

## Decision

New product code must use repositories and runtime services instead of direct IndexedDB/Dexie/local storage access. Legacy storage access is allowed only in documented migration adapters.

## Allowed Legacy Boundaries

- `src/services/storageService.ts`
- `src/services/appSettingsService.ts`
- `src/services/cloudService.ts`
- `src/db/indexedDb.ts`
- `src/db/repositories/**`

## Consequences

Positive:
- easier migration to SQLite/Room or cloud-backed sync later
- fewer duplicate persistence paths
- better governance automation

Tradeoffs:
- short-term adapter code remains until legacy paths are retired
