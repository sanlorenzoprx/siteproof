import { BaseRepository } from './baseRepository';
import { SyncOperation, SyncOperationStatus, SyncEntityType, SyncOperationType, newId, nowIso } from '../schema';

export type CreateSyncOperationInput = Omit<SyncOperation, 'operation_id' | 'created_at' | 'updated_at' | 'status' | 'retry_count' | 'max_retries' | 'dependency_ids'> & {
  status?: SyncOperationStatus;
  retry_count?: number;
  max_retries?: number;
  dependency_ids?: string[];
  entity_type: SyncEntityType;
  operation_type: SyncOperationType;
};

const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 10 * 60_000, 60 * 60_000];

class SyncRepository extends BaseRepository<SyncOperation> {
  constructor() {
    super('sync_operations', 'operation_id');
  }

  async enqueue(input: CreateSyncOperationInput): Promise<SyncOperation> {
    const now = nowIso();
    return this.create({
      ...input,
      operation_id: newId(),
      dependency_ids: input.dependency_ids ?? [],
      status: input.status ?? 'queued',
      retry_count: input.retry_count ?? 0,
      max_retries: input.max_retries ?? 5,
      created_at: now,
      updated_at: now,
    });
  }

  getQueued(): Promise<SyncOperation[]> {
    return this.getByIndex('status', 'queued');
  }

  getRunning(): Promise<SyncOperation[]> {
    return this.getByIndex('status', 'running');
  }

  getFailed(): Promise<SyncOperation[]> {
    return this.getByIndex('status', 'failed');
  }

  getBlocked(): Promise<SyncOperation[]> {
    return this.getByIndex('status', 'blocked');
  }

  async getPendingOperations(): Promise<SyncOperation[]> {
    const [queued, running, blocked] = await Promise.all([
      this.getQueued(),
      this.getRunning(),
      this.getBlocked(),
    ]);
    return [...queued, ...running, ...blocked];
  }

  async getReadyToRun(now = new Date()): Promise<SyncOperation[]> {
    const [queued, blocked] = await Promise.all([this.getQueued(), this.getBlocked()]);
    const candidates = [...queued, ...blocked];
    return candidates
      .filter((op) => !op.next_retry_at || new Date(op.next_retry_at) <= now)
      .sort((a, b) => {
        const priorityDelta = getOperationPriority(a) - getOperationPriority(b);
        if (priorityDelta !== 0) return priorityDelta;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }

  async markRunning(operationId: string): Promise<SyncOperation | undefined> {
    const op = await this.getById(operationId);
    if (!op) return undefined;
    return this.put({ ...op, status: 'running', updated_at: nowIso(), last_error: null }, 'update');
  }

  async markBlocked(operationId: string, reason: string): Promise<SyncOperation | undefined> {
    const op = await this.getById(operationId);
    if (!op) return undefined;
    return this.put({ ...op, status: 'blocked', updated_at: nowIso(), last_error: reason }, 'update');
  }

  async markCompleted(operationId: string): Promise<SyncOperation | undefined> {
    const op = await this.getById(operationId);
    if (!op) return undefined;
    return this.put({ ...op, status: 'completed', completed_at: nowIso(), updated_at: nowIso(), last_error: null }, 'update');
  }

  async markFailed(operationId: string, error: string): Promise<SyncOperation | undefined> {
    const op = await this.getById(operationId);
    if (!op) return undefined;
    const retryCount = op.retry_count + 1;
    const delay = RETRY_DELAYS_MS[Math.min(retryCount - 1, RETRY_DELAYS_MS.length - 1)] ?? 60 * 60_000;
    return this.put({
      ...op,
      status: retryCount >= op.max_retries ? 'failed' : 'queued',
      retry_count: retryCount,
      updated_at: nowIso(),
      last_error: error,
      next_retry_at: retryCount >= op.max_retries ? null : new Date(Date.now() + delay).toISOString(),
    }, 'update');
  }

  async getStats(): Promise<{ queued: number; running: number; blocked: number; failed: number; completed: number; pending: number }> {
    const [queued, running, blocked, failed, completed] = await Promise.all([
      this.getQueued(),
      this.getRunning(),
      this.getBlocked(),
      this.getFailed(),
      this.getByIndex('status', 'completed'),
    ]);
    return {
      queued: queued.length,
      running: running.length,
      blocked: blocked.length,
      failed: failed.length,
      completed: completed.length,
      pending: queued.length + running.length + blocked.length,
    };
  }
}

function getOperationPriority(op: SyncOperation): number {
  if (op.entity_type === 'job') return 10;
  if (op.entity_type === 'workflow_stage_instance') return 20;
  if (op.entity_type === 'proof_object') return 30;
  if (op.entity_type === 'media_asset' && op.operation_type === 'upload_media') return 40;
  if (op.entity_type === 'voice_note') return 50;
  if (op.entity_type === 'timeline_event') return 60;
  if (op.entity_type === 'workflow_learning_event') return 65;
  if (op.entity_type === 'export_packet') return 70;
  return 100;
}

export const syncRepository = new SyncRepository();
