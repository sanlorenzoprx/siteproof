import { STORE_NAMES, StoreName } from './schema';

export const DB_NAME = 'siteproof_offline_db';
export const DB_VERSION = 4;

export const KEY_PATHS: Record<StoreName, string> = {
  company_profiles: 'company_id',
  customers: 'customer_id',
  jobs: 'job_id',
  workflow_template_cache: 'template_cache_id',
  workflow_stage_instances: 'stage_instance_id',
  proof_objects: 'proof_id',
  media_assets: 'media_id',
  job_documents: 'document_id',
  voice_notes: 'voice_note_id',
  timeline_events: 'event_id',
  export_packets: 'export_id',
  change_order_candidates: 'change_order_id',
  workflow_learning_events: 'learning_event_id',
  jurisdiction_profiles: 'jurisdiction_id',
  permit_requirements: 'permit_requirement_id',
  inspection_requirements: 'inspection_requirement_id',
  sync_operations: 'operation_id',
  app_settings: 'settings_id',
};

const INDEXES: Record<StoreName, Array<{ name: string; keyPath: string | string[]; options?: IDBIndexParameters }>> = {
  company_profiles: [{ name: 'sync_state', keyPath: 'sync_state' }, { name: 'updated_at', keyPath: 'updated_at' }],
  customers: [
    { name: 'company_id', keyPath: 'company_id' },
    { name: 'email', keyPath: 'email' },
    { name: 'sync_state', keyPath: 'sync_state' },
    { name: 'updated_at', keyPath: 'updated_at' },
  ],
  jobs: [
    { name: 'company_id', keyPath: 'company_id' },
    { name: 'customer_id', keyPath: 'customer_id' },
    { name: 'status', keyPath: 'status' },
    { name: 'trade_specialty', keyPath: 'trade_specialty' },
    { name: 'job_type', keyPath: 'job_type' },
    { name: 'template_id', keyPath: 'template_id' },
    { name: 'jobsite_zip', keyPath: 'jobsite_zip' },
    { name: 'sync_state', keyPath: 'sync_state' },
    { name: 'updated_at', keyPath: 'updated_at' },
  ],
  workflow_template_cache: [
    { name: 'template_id', keyPath: 'template_id' },
    { name: 'trade_specialty', keyPath: 'trade_specialty' },
    { name: 'vertical', keyPath: 'vertical' },
    { name: 'job_type', keyPath: 'job_type' },
    { name: 'active_flag', keyPath: 'active_flag' },
  ],
  workflow_stage_instances: [
    { name: 'job_id', keyPath: 'job_id' },
    { name: 'template_stage_id', keyPath: 'template_stage_id' },
    { name: 'stage_key', keyPath: 'stage_key' },
    { name: 'status', keyPath: 'status' },
    { name: 'sort_order', keyPath: 'sort_order' },
    { name: 'sync_state', keyPath: 'sync_state' },
  ],
  proof_objects: [
    { name: 'job_id', keyPath: 'job_id' },
    { name: 'stage_instance_id', keyPath: 'stage_instance_id' },
    { name: 'requirement_id', keyPath: 'requirement_id' },
    { name: 'proof_type', keyPath: 'proof_type' },
    { name: 'captured_at', keyPath: 'captured_at' },
    { name: 'sync_state', keyPath: 'sync_state' },
    { name: 'required_flag', keyPath: 'required_flag' },
    { name: 'export_tags', keyPath: 'export_tags', options: { multiEntry: true } },
    { name: 'inspection_tags', keyPath: 'inspection_tags', options: { multiEntry: true } },
    { name: 'permit_tags', keyPath: 'permit_tags', options: { multiEntry: true } },
  ],
  media_assets: [
    { name: 'proof_id', keyPath: 'proof_id' },
    { name: 'job_id', keyPath: 'job_id' },
    { name: 'upload_state', keyPath: 'upload_state' },
    { name: 'sync_state', keyPath: 'sync_state' },
    { name: 'created_at', keyPath: 'created_at' },
  ],
  job_documents: [
    { name: 'job_id', keyPath: 'job_id' },
    { name: 'workflow_step_id', keyPath: 'workflow_step_id' },
    { name: 'proof_object_id', keyPath: 'proof_object_id' },
    { name: 'media_asset_id', keyPath: 'media_asset_id' },
    { name: 'document_type', keyPath: 'document_type' },
    { name: 'document_sync_state', keyPath: 'document_sync_state' },
    { name: 'sync_state', keyPath: 'sync_state' },
    { name: 'report_tags', keyPath: 'report_tags', options: { multiEntry: true } },
    { name: 'inspection_tags', keyPath: 'inspection_tags', options: { multiEntry: true } },
    { name: 'created_at', keyPath: 'created_at' },
  ],
  voice_notes: [
    { name: 'proof_id', keyPath: 'proof_id' },
    { name: 'job_id', keyPath: 'job_id' },
    { name: 'language', keyPath: 'language' },
    { name: 'sync_state', keyPath: 'sync_state' },
  ],
  timeline_events: [
    { name: 'job_id', keyPath: 'job_id' },
    { name: 'occurred_at', keyPath: 'occurred_at' },
    { name: 'event_type', keyPath: 'event_type' },
  ],
  export_packets: [
    { name: 'job_id', keyPath: 'job_id' },
    { name: 'packet_type', keyPath: 'packet_type' },
    { name: 'generated_at', keyPath: 'generated_at' },
    { name: 'sync_state', keyPath: 'sync_state' },
  ],
  change_order_candidates: [
    { name: 'job_id', keyPath: 'job_id' },
    { name: 'status', keyPath: 'status' },
    { name: 'source_proof_id', keyPath: 'source_proof_id' },
    { name: 'sync_state', keyPath: 'sync_state' },
  ],
  workflow_learning_events: [
    { name: 'job_id', keyPath: 'job_id' },
    { name: 'pack_id', keyPath: 'pack_id' },
    { name: 'trade', keyPath: 'trade' },
    { name: 'specialty', keyPath: 'specialty' },
    { name: 'step_id', keyPath: 'step_id' },
    { name: 'action', keyPath: 'action' },
    { name: 'sync_state', keyPath: 'sync_state' },
    { name: 'created_at', keyPath: 'created_at' },
  ],
  jurisdiction_profiles: [
    { name: 'zip', keyPath: 'zip' },
    { name: 'city', keyPath: 'city' },
    { name: 'county', keyPath: 'county' },
    { name: 'state', keyPath: 'state' },
    { name: 'confidence_level', keyPath: 'confidence_level' },
  ],
  permit_requirements: [
    { name: 'trade_specialty', keyPath: 'trade_specialty' },
    { name: 'job_type', keyPath: 'job_type' },
    { name: 'jurisdiction_id', keyPath: 'jurisdiction_id' },
  ],
  inspection_requirements: [
    { name: 'trade_specialty', keyPath: 'trade_specialty' },
    { name: 'job_type', keyPath: 'job_type' },
    { name: 'jurisdiction_id', keyPath: 'jurisdiction_id' },
  ],
  sync_operations: [
    { name: 'entity_type', keyPath: 'entity_type' },
    { name: 'entity_id', keyPath: 'entity_id' },
    { name: 'status', keyPath: 'status' },
    { name: 'created_at', keyPath: 'created_at' },
    { name: 'next_retry_at', keyPath: 'next_retry_at' },
  ],
  app_settings: [
    { name: 'company_id', keyPath: 'company_id' },
    { name: 'key', keyPath: 'key' },
    { name: 'scope', keyPath: 'scope' },
  ],
};

let dbPromise: Promise<IDBDatabase> | null = null;

export function openSiteProofDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      for (const storeName of STORE_NAMES) {
        const keyPath = KEY_PATHS[storeName];
        const store = db.objectStoreNames.contains(storeName)
          ? request.transaction!.objectStore(storeName)
          : db.createObjectStore(storeName, { keyPath });

        for (const index of INDEXES[storeName]) {
          if (!store.indexNames.contains(index.name)) {
            store.createIndex(index.name, index.keyPath, index.options);
          }
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open SiteProof IndexedDB.'));
  });

  return dbPromise;
}

export async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | Promise<T> | T,
): Promise<T> {
  const db = await openSiteProofDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result: T;

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error ?? new Error(`Transaction failed for ${storeName}`));
    tx.onabort = () => reject(tx.error ?? new Error(`Transaction aborted for ${storeName}`));

    try {
      const maybeRequest = callback(store);
      if (maybeRequest instanceof IDBRequest) {
        maybeRequest.onsuccess = () => {
          result = maybeRequest.result as T;
        };
        maybeRequest.onerror = () => reject(maybeRequest.error ?? new Error(`Request failed for ${storeName}`));
      } else if (maybeRequest instanceof Promise) {
        maybeRequest.then((value) => {
          result = value;
        }).catch(reject);
      } else {
        result = maybeRequest;
      }
    } catch (error) {
      reject(error);
    }
  });
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
  });
}

export async function getAllFromIndex<T>(storeName: StoreName, indexName: string, value: IDBValidKey): Promise<T[]> {
  const db = await openSiteProofDb();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  const index = store.index(indexName);
  return requestToPromise<T[]>(index.getAll(value));
}
