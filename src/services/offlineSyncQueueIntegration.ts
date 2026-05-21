import { syncRepository } from '../db/repositories/syncRepository';
import { SyncEntityType, SyncOperationType } from '../db/schema';

export class OfflineSyncQueueIntegration {
  static enqueueLocalChange(input: {
    entityType: SyncEntityType;
    entityId: string;
    operationType: SyncOperationType;
    payload: Record<string, unknown>;
    dependencyIds?: string[];
  }) {
    return syncRepository.enqueue({
      entity_type: input.entityType,
      entity_id: input.entityId,
      operation_type: input.operationType,
      payload: input.payload,
      dependency_ids: input.dependencyIds ?? [],
      next_retry_at: null,
      completed_at: null,
      last_error: null,
    });
  }
}
