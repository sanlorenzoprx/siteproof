# SiteProof Legacy Cleanup Pass v2

## Purpose

This pass applies the project rule: when legacy architecture is encountered during normal development, clean it up immediately instead of deferring it.

## Cleanup Completed

### 1. Device Settings Removed From Legacy StorageService Path

Moved device-scoped settings to the canonical `app_settings` store:

- speech calibration state
- last active job tracking
- cloud sync configuration

New repository:

- `src/db/repositories/appSettingsRepository.ts`

Updated service boundary:

- `src/services/appSettingsService.ts`

### 2. Cloud Configuration Removed From Direct Browser Storage

`CloudService` no longer writes directly to `localStorage`.

Cloud settings now persist through:

- `AppSettingsService`
- `app_settings` repository store

`CloudService` keeps an in-memory cache for fast UI status checks while durable configuration remains in canonical storage.

### 3. SyncService Compatibility Facade Removed

Removed:

- `src/services/syncService.ts`

Updated UI sync controls to call:

- `SyncRuntime.processQueue()`

This reduces one extra legacy abstraction between the UI and the canonical sync operation runtime.

### 4. Legacy Governance Signal Improved

Updated governance config so true runtime storage boundaries are not reported as legacy drift.

Storage boundary files:

- `src/db/indexedDb.ts`
- `src/services/sync/syncRuntime.ts`

Remaining actual legacy adapter:

- `src/services/storageService.ts`

## Remaining Cleanup Target

`StorageService` remains the primary compatibility adapter. It still bridges older UI screens and existing browser installs into the repository/schema runtime.

Future cleanup should progressively replace component imports of `StorageService` with focused runtime hooks/services.

## Validation

Expected checks:

```bash
npm run lint
npm run governance:check
npm run legacy:check
npm run ai:check
npm run build
npm run pilot:smoke
npm run quality:check
```
