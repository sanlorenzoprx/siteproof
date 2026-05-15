# SiteProof Repository Migration v1

## Why migrate instead of delete?

We do not delete `StorageService`/Dexie immediately because existing browser installs may already contain jobs, photos, voice notes, blobs, and license/profile data in the legacy database.

Deleting the legacy layer now would risk:

- losing field data captured during demos or pilots
- breaking photo/audio previews that still depend on legacy blobs
- creating blank job lists for users with existing local data
- removing the rollback path if repository migration fails
- forcing every screen to be rewritten in one risky pass

Migration v1 keeps the app safe while changing the source of truth.

## What changed

### New source of truth

The repository/schema layer is now the primary path for job data:

```text
UI / Hooks
→ StorageService compatibility adapter
→ RuntimeOrchestrator
→ repositories
→ siteproof_offline_db
```

`StorageService` is now treated as a compatibility adapter, not the long-term architecture.

### Legacy data safety

Legacy Dexie tables remain as a safety mirror for:

- existing jobs
- photo preview blobs/data URLs
- voice note audio blobs
- business profile/license data

### Job migration

`StorageService.getJobs()` now:

1. initializes runtime templates
2. migrates missing legacy jobs into the repository layer
3. reads jobs from `jobRepository`
4. converts them into legacy UI shape only for current screens
5. falls back to Dexie only if repository data is unavailable

### Job writes

`StorageService.saveJob()` now writes to the runtime repository path first, then mirrors into legacy Dexie.

### Capture writes

Photo and voice note saves now execute the runtime path first:

```text
ProofObject
→ MediaAsset
→ VoiceNote if needed
→ TimelineEvent
→ SyncOperation
```

Then legacy Dexie is updated only as a preview/compatibility mirror.

### Sync queue

`SyncRuntime` now uses `sync_operations` as the primary pending-work source. The old `SyncService` facade has been removed.

Legacy pending flags remain as fallback until the cloud endpoint is fully repository-aware.

### Hooks added

New UI boundary hooks:

```text
src/hooks/useJobs.ts
src/hooks/useJobRuntime.ts
src/hooks/useProofCapture.ts
src/hooks/useExportPackets.ts
```

These are the future-safe boundary between UI and runtime services.

## Remaining follow-up

Repository Migration v1 does not fully delete legacy storage yet.

Next cleanup passes should:

1. move JobList/JobDetail/CreateJob fully onto hooks
2. convert export generation to read ProofObjects directly
3. move profile/license/settings into repository-backed tables
4. replace legacy cloud sync payload with operation-based sync API
5. remove Dexie once data migration is verified

## Final target

```text
UI
→ hooks
→ services
→ repositories
→ siteproof_offline_db
```

No UI screen should directly depend on legacy Dexie long-term.
