import { getAllFromIndex, requestToPromise, withStore } from '../indexedDb';
import { StoreName, SyncEntityType, SyncOperation, SyncOperationType, newId, nowIso } from '../schema';

export abstract class BaseRepository<T extends Record<string, any>> {
  constructor(
    protected readonly storeName: StoreName,
    protected readonly idField: keyof T & string,
    protected readonly syncEntityType?: SyncEntityType,
  ) {}

  async getById(id: string): Promise<T | undefined> {
    return withStore<T | undefined>(this.storeName, 'readonly', (store) => store.get(id));
  }

  async getAll(): Promise<T[]> {
    return withStore<T[]>(this.storeName, 'readonly', (store) => store.getAll());
  }

  async getByIndex(indexName: string, value: IDBValidKey): Promise<T[]> {
    return getAllFromIndex<T>(this.storeName, indexName, value);
  }

  async put(entity: T, operationType: SyncOperationType = 'update'): Promise<T> {
    const now = nowIso();
    const next = {
      ...entity,
      updated_at: now,
      local_version: typeof entity.local_version === 'number' ? entity.local_version + 1 : 1,
      sync_state: entity.sync_state === 'local_only' ? 'local_only' : 'pending_upload',
    } as T;

    await withStore(this.storeName, 'readwrite', (store) => store.put(next));
    await this.queueSync(next, operationType);
    return next;
  }

  async create(entity: T): Promise<T> {
    await withStore(this.storeName, 'readwrite', (store) => store.add(entity));
    await this.queueSync(entity, 'create');
    return entity;
  }

  async softDelete(id: string): Promise<void> {
    const entity = await this.getById(id);
    if (!entity) return;
    const now = nowIso();
    const next = {
      ...entity,
      deleted_at: now,
      updated_at: now,
      local_version: typeof entity.local_version === 'number' ? entity.local_version + 1 : 1,
      sync_state: 'pending_upload',
    } as T;
    await withStore(this.storeName, 'readwrite', (store) => store.put(next));
    await this.queueSync(next, 'delete');
  }

  async hardDelete(id: string): Promise<void> {
    await withStore(this.storeName, 'readwrite', (store) => store.delete(id));
  }

  protected async queueSync(entity: T, operationType: SyncOperationType): Promise<void> {
    if (!this.syncEntityType) return;
    const entityId = String(entity[this.idField]);
    const now = nowIso();
    const op: SyncOperation = {
      operation_id: newId(),
      entity_type: this.syncEntityType,
      entity_id: entityId,
      operation_type: operationType,
      payload: entity,
      dependency_ids: [],
      status: 'queued',
      retry_count: 0,
      max_retries: 5,
      last_error: null,
      created_at: now,
      updated_at: now,
      next_retry_at: null,
      completed_at: null,
    };
    await withStore('sync_operations', 'readwrite', (store) => store.add(op));
  }

  protected async getFirstFromIndex(indexName: string, value: IDBValidKey): Promise<T | undefined> {
    const rows = await this.getByIndex(indexName, value);
    return rows[0];
  }
}
