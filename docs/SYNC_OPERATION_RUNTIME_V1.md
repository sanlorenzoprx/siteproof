# SiteProof SyncOperation Runtime v1

## What changed

Sync is now operation-first instead of record-flag-first.

The primary sync path is:

```text
Repository mutation
→ SyncOperation queued
→ SyncRuntime processes queue
→ dependency check
→ retry/backoff
→ entity marked synced
```

## Added

- `src/services/sync/syncRuntime.ts`
- `src/hooks/useSyncRuntimeStatus.ts`
- expanded `syncRepository`
- `CloudService.syncRuntimeOperations()`
- Layout and sync controls now call `SyncRuntime` directly; the old `SyncService` compatibility facade was removed during Legacy Cleanup Pass v2.
- sidebar sync panel now shows operation queue state

## Runtime behavior

- Queue survives refresh/browser close because operations live in IndexedDB.
- Auto-sync starts on app initialization.
- Manual sync uses the same runtime path.
- Offline state leaves operations queued.
- Missing cloud config leaves operations queued.
- Failed operations use exponential-ish retry delays:
  - 30 seconds
  - 2 minutes
  - 10 minutes
  - 1 hour

## Priority order

1. jobs
2. workflow stage instances
3. proof objects
4. media assets
5. voice notes
6. timeline events
7. export packets
8. other entities

## Compatibility

Legacy Dexie sync is not deleted yet. It remains as a fallback for older records, but SyncOperation is now the primary runtime model.

## Why this matters

SiteProof is offline-first. Real field sync is not a simple “record uploaded?” flag. A photo capture can produce multiple required operations: proof metadata, media, thumbnail, timeline event, and packet updates.

SyncOperation Runtime v1 makes that durable and visible.

## Next cleanup

- Export v2 should read only ProofObject/MediaAsset records.
- Legacy Dexie sync should be removed after a migration window.
- Cloud backend should eventually understand SyncOperation natively instead of receiving the compatibility `/sync` payload.
