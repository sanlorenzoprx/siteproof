import { AppSettingsService } from '../appSettingsService';

export type ConflictWinner = 'local' | 'remote' | 'equal';

export interface ConflictLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  localUpdatedAt?: string | null;
  remoteUpdatedAt?: string | null;
  localVersion?: number;
  remoteVersion?: number;
  winner: ConflictWinner;
  reason: 'local_newer' | 'remote_newer' | 'equal_timestamp';
  recordedAt: string;
}

type VersionedEntity = {
  updated_at?: string | null;
  local_version?: number;
  [key: string]: unknown;
};

const CONFLICT_LOG_KEY = 'sync_conflict_log';
const MAX_LOG_ENTRIES = 200;

function toMs(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toVersion(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function resolveLastWriteWins<T extends VersionedEntity>(
  localEntity: T,
  remoteEntity: T
): { winner: ConflictWinner; merged: T; reason: ConflictLogEntry['reason'] } {
  const localTs = toMs(localEntity.updated_at);
  const remoteTs = toMs(remoteEntity.updated_at);

  if (localTs > remoteTs) {
    return { winner: 'local', merged: localEntity, reason: 'local_newer' };
  }
  if (remoteTs > localTs) {
    return { winner: 'remote', merged: remoteEntity, reason: 'remote_newer' };
  }

  const localVersion = toVersion(localEntity.local_version);
  const remoteVersion = toVersion(remoteEntity.local_version);
  if (localVersion > remoteVersion) {
    return { winner: 'local', merged: localEntity, reason: 'equal_timestamp' };
  }
  if (remoteVersion > localVersion) {
    return { winner: 'remote', merged: remoteEntity, reason: 'equal_timestamp' };
  }

  return { winner: 'equal', merged: remoteEntity, reason: 'equal_timestamp' };
}

export async function recordSyncConflict(entry: Omit<ConflictLogEntry, 'id' | 'recordedAt'>): Promise<void> {
  const existing = await AppSettingsService.getValue<ConflictLogEntry[]>(CONFLICT_LOG_KEY, []);
  const next: ConflictLogEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    recordedAt: new Date().toISOString(),
  };
  const merged = [next, ...existing].slice(0, MAX_LOG_ENTRIES);
  await AppSettingsService.setValue(CONFLICT_LOG_KEY, merged);
}

