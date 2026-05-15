# SiteProof Legacy Storage Deprecation v1

## Purpose

This pass moves SiteProof closer to a single source of truth:

```text
repositories/schema → IndexedDB → runtime services → UI hooks
```

Legacy Dexie storage is **not deleted** yet. It is retained as a safety mirror and migration fallback for existing browser installs that may already contain local jobs, photos, voice notes, or profile/license data.

## Why Deprecate Instead of Delete

Deleting the legacy store immediately could cause:

- loss of existing local jobs from prototype installs
- loss of preview blobs/data URLs used by older capture UI paths
- broken exports for older records that do not yet have full canonical media assets
- broken field demos if a browser has old local data

Deprecation lets the app read from canonical repositories first while still recovering old records safely.

## What Changed

### 1. Repository reads are now primary for media-facing compatibility APIs

`StorageService.getPhotos(jobId)` now:

1. reads canonical `ProofObject`, `MediaAsset`, and `WorkflowStageInstance` records first
2. converts them into legacy `JobPhoto` shape only for older UI/export consumers
3. uses legacy Dexie photos only as a fallback/mirror source

`StorageService.getVoiceNotes(jobId)` now:

1. reads canonical `ProofObject`, `VoiceNote`, and `WorkflowStageInstance` records first
2. converts them into legacy `VoiceNote` shape only for older UI/export consumers
3. uses legacy Dexie notes only as a fallback/mirror source

### 2. StorageService is explicitly marked deprecated

`StorageService` is now documented as a compatibility facade, not the architecture target.

New code should prefer:

```text
jobRepository
proofRepository
mediaRepository
voiceNoteRepository
timelineRepository
syncRepository
```

or a service/hook that wraps those repositories.

### 3. Legacy Dexie remains only for safety

Legacy tables remain for:

- profile/license compatibility
- old browser installs
- local media previews from prototype records
- recovery if repository migration fails

## Current Transitional Shape

```text
UI legacy consumers
↓
StorageService compatibility facade
↓
canonical repositories first
↓
legacy Dexie fallback only
```

## Target Final Shape

```text
UI
↓
hooks
↓
services
↓
repositories
↓
siteproof_offline_db
```

No new feature should depend directly on legacy Dexie tables.

## Remaining Work Before Full Removal

1. Move business/user profile + license into `app_settings` or dedicated repositories.
2. Update JobDetail/Camera/Voice screens to consume canonical proof/media models directly.
3. Remove legacy `JobPhoto` and legacy `VoiceNote` from export and timeline UI boundaries.
4. Add a one-time verified migration screen or background task.
5. Add a safe purge operation for legacy mirrors after verification.
6. Remove Dexie dependency only after pilot data migration is proven.

## Rule Going Forward

Do not add new writes directly to legacy Dexie tables except as temporary mirrors for user data safety.

