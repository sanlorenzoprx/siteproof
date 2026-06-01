import { CloudService } from '../cloudService';
import { SiteProofDataService } from '../siteProofDataService';
import { syncRepository } from '../../db/repositories/syncRepository';
import { StoreName, SyncOperation, SyncOperationStatus, nowIso } from '../../db/schema';
import { withStore } from '../../db/indexedDb';
import { recordSyncConflict, resolveLastWriteWins } from './conflictResolution';

export interface SyncRuntimeSnapshot {
  isSyncing: boolean;
  online: boolean;
  cloudConfigured: boolean;
  queued: number;
  running: number;
  blocked: number;
  failed: number;
  completed: number;
  pending: number;
  lastSyncTime: number | null;
  lastError: string | null;
  nextRetryAt: string | null;
}

type Listener = (snapshot: SyncRuntimeSnapshot) => void;
type ConflictResponseItem = {
  entityType?: SyncOperation['entity_type'];
  entityId?: string;
  remoteEntity?: Record<string, unknown>;
};

const ENTITY_STORE: Partial<Record<SyncOperation['entity_type'], { store: StoreName; idField: string }>> = {
  company_profile: { store: 'company_profiles', idField: 'company_id' },
  customer: { store: 'customers', idField: 'customer_id' },
  job: { store: 'jobs', idField: 'job_id' },
  workflow_stage_instance: { store: 'workflow_stage_instances', idField: 'stage_instance_id' },
  proof_object: { store: 'proof_objects', idField: 'proof_id' },
  media_asset: { store: 'media_assets', idField: 'media_id' },
  job_document: { store: 'job_documents', idField: 'document_id' },
  voice_note: { store: 'voice_notes', idField: 'voice_note_id' },
  timeline_event: { store: 'timeline_events', idField: 'event_id' },
  export_packet: { store: 'export_packets', idField: 'export_id' },
  change_order_candidate: { store: 'change_order_candidates', idField: 'change_order_id' },
  workflow_learning_event: { store: 'workflow_learning_events', idField: 'learning_event_id' },
};

class SyncRuntimeImpl {
  private listeners = new Set<Listener>();
  private isSyncing = false;
  private autoSyncHandle: number | null = null;
  private snapshot: SyncRuntimeSnapshot = {
    isSyncing: false,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    cloudConfigured: false,
    queued: 0,
    running: 0,
    blocked: 0,
    failed: 0,
    completed: 0,
    pending: 0,
    lastSyncTime: null,
    lastError: null,
    nextRetryAt: null,
  };

  initialize() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
    void this.refreshSnapshot();
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    if (this.autoSyncHandle) window.clearInterval(this.autoSyncHandle);
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.snapshot);
    void this.refreshSnapshot();
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): SyncRuntimeSnapshot {
    return this.snapshot;
  }

  startAutoSync(intervalMs = 30_000) {
    if (typeof window === 'undefined' || this.autoSyncHandle) return;
    this.autoSyncHandle = window.setInterval(() => {
      void this.processQueue();
    }, intervalMs);
  }

  async getPendingCount(): Promise<number> {
    const stats = await syncRepository.getStats().catch(() => null);
    return stats?.pending ?? 0;
  }

  async processQueue(): Promise<SyncRuntimeSnapshot> {
    if (this.isSyncing) return this.snapshot;

    const online = typeof navigator === 'undefined' ? true : navigator.onLine;
    const cloudConfigured = CloudService.isConfigured();
    if (!online || !cloudConfigured) {
      await this.refreshSnapshot({
        online,
        cloudConfigured,
        lastError: !online ? 'Offline — sync will resume when internet returns.' : 'Cloud sync is not configured yet.',
      });
      return this.snapshot;
    }

    this.isSyncing = true;
    await this.refreshSnapshot({ isSyncing: true, online, cloudConfigured, lastError: null });
    await SiteProofDataService.updateSyncState({ isSyncing: true, lastError: null });

    try {
      const ready = await this.getDependencyReadyOperations();
      if (ready.length === 0) {
        this.isSyncing = false;
        await this.refreshSnapshot({ isSyncing: false, lastSyncTime: Date.now(), lastError: null });
        await SiteProofDataService.updateSyncState({ isSyncing: false, lastSyncTime: Date.now(), pendingCount: this.snapshot.pending });
        return this.snapshot;
      }

      const operations = ready.slice(0, 25);
      await Promise.all(operations.map((op) => syncRepository.markRunning(op.operation_id)));
      await this.refreshSnapshot({ isSyncing: true });
      const settled = await Promise.allSettled(
        operations.map(async (op) => {
          const syncResponse = await CloudService.syncRuntimeOperations([op]);
          const remoteConflict = this.findConflictForOperation(syncResponse, op);
          if (remoteConflict?.remoteEntity) {
            await this.resolveConflictForOperation(op, remoteConflict.remoteEntity);
          } else {
            await this.markEntitySynced(op);
          }
          await syncRepository.markCompleted(op.operation_id);
        })
      );

      for (let i = 0; i < settled.length; i += 1) {
        const result = settled[i];
        if (result.status === 'rejected') {
          const message = result.reason instanceof Error ? result.reason.message : 'Unknown sync error';
          await syncRepository.markFailed(operations[i].operation_id, message);
        }
      }

      const stats = await syncRepository.getStats();
      this.isSyncing = false;
      await this.refreshSnapshot({
        isSyncing: false,
        lastSyncTime: Date.now(),
        lastError: null,
        pending: stats.pending,
        queued: stats.queued,
        running: stats.running,
        blocked: stats.blocked,
        failed: stats.failed,
        completed: stats.completed,
      });
      await SiteProofDataService.updateSyncState({ isSyncing: false, lastSyncTime: Date.now(), pendingCount: stats.pending, lastError: null });
      return this.snapshot;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      const running = await syncRepository.getRunning().catch(() => []);
      await Promise.all(running.map((op) => syncRepository.markFailed(op.operation_id, message)));
      this.isSyncing = false;
      await this.refreshSnapshot({ isSyncing: false, lastError: message });
      await SiteProofDataService.updateSyncState({ isSyncing: false, lastError: message, pendingCount: this.snapshot.pending });
      return this.snapshot;
    }
  }

  private async getDependencyReadyOperations(): Promise<SyncOperation[]> {
    const ready = await syncRepository.getReadyToRun();
    const resolved: SyncOperation[] = [];

    for (const op of ready) {
      const dependencyIds = op.dependency_ids ?? [];
      if (dependencyIds.length === 0) {
        resolved.push(op);
        continue;
      }

      const deps = await Promise.all(dependencyIds.map((id) => syncRepository.getById(id)));
      const incomplete = deps.filter((dep) => dep && dep.status !== 'completed');
      if (incomplete.length > 0) {
        await syncRepository.markBlocked(op.operation_id, `Waiting for ${incomplete.length} sync dependency item(s).`);
      } else {
        resolved.push(op);
      }
    }

    return resolved;
  }

  private async markEntitySynced(op: SyncOperation): Promise<void> {
    const mapping = ENTITY_STORE[op.entity_type];
    if (!mapping || op.operation_type === 'delete') return;

    await withStore(mapping.store, 'readwrite', (store) => {
      const request = store.get(op.entity_id);
      request.onsuccess = () => {
        const entity = request.result;
        if (!entity) return;
        store.put({
          ...entity,
          sync_state: 'synced',
          last_synced_at: nowIso(),
          updated_at: entity.updated_at ?? nowIso(),
        });
      };
      return request;
    }).catch(() => undefined);
  }

  private findConflictForOperation(syncResponse: unknown, op: SyncOperation): ConflictResponseItem | null {
    if (!syncResponse || typeof syncResponse !== 'object') return null;
    const conflicts = (syncResponse as { conflicts?: unknown }).conflicts;
    if (!Array.isArray(conflicts)) return null;

    const match = conflicts.find((item) => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as ConflictResponseItem;
      return candidate.entityType === op.entity_type && candidate.entityId === op.entity_id;
    });
    return (match as ConflictResponseItem) || null;
  }

  private async resolveConflictForOperation(op: SyncOperation, remoteEntity: Record<string, unknown>): Promise<void> {
    const mapping = ENTITY_STORE[op.entity_type];
    if (!mapping || op.operation_type === 'delete') return;

    const localEntity = await withStore<Record<string, unknown> | undefined>(mapping.store, 'readonly', (store) => {
      return store.get(op.entity_id);
    }).catch(() => undefined);
    if (!localEntity) {
      await this.markEntitySynced(op);
      return;
    }

    const result = resolveLastWriteWins(localEntity, remoteEntity);
    await recordSyncConflict({
      entityType: op.entity_type,
      entityId: op.entity_id,
      localUpdatedAt: typeof localEntity.updated_at === 'string' ? localEntity.updated_at : null,
      remoteUpdatedAt: typeof remoteEntity.updated_at === 'string' ? remoteEntity.updated_at : null,
      localVersion: typeof localEntity.local_version === 'number' ? localEntity.local_version : 0,
      remoteVersion: typeof remoteEntity.local_version === 'number' ? remoteEntity.local_version : 0,
      winner: result.winner,
      reason: result.reason,
    });

    await withStore(mapping.store, 'readwrite', (store) => {
      if (result.winner === 'remote' || result.winner === 'equal') {
        store.put({
          ...remoteEntity,
          sync_state: 'synced',
          last_synced_at: nowIso(),
          updated_at: remoteEntity.updated_at ?? nowIso(),
        });
      } else {
        store.put({
          ...localEntity,
          sync_state: 'synced',
          last_synced_at: nowIso(),
          updated_at: localEntity.updated_at ?? nowIso(),
        });
      }
      return store.get(op.entity_id);
    }).catch(() => undefined);
  }

  private async refreshSnapshot(update: Partial<SyncRuntimeSnapshot> = {}) {
    const stats = await syncRepository.getStats().catch(() => ({ queued: 0, running: 0, blocked: 0, failed: 0, completed: 0, pending: 0 }));
    const queued = await syncRepository.getQueued().catch(() => []);
    const nextRetryAt = queued
      .map((op) => op.next_retry_at)
      .filter((value): value is string => Boolean(value))
      .sort()[0] ?? null;

    this.snapshot = {
      ...this.snapshot,
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
      cloudConfigured: CloudService.isConfigured(),
      ...stats,
      nextRetryAt,
      ...update,
    };
    this.listeners.forEach((listener) => listener(this.snapshot));
  }

  private handleOnline = () => {
    void this.refreshSnapshot({ online: true, lastError: null });
    void this.processQueue();
  };

  private handleOffline = () => {
    void this.refreshSnapshot({ online: false, lastError: 'Offline — sync will resume when internet returns.' });
  };
}

export const SyncRuntime = new SyncRuntimeImpl();
