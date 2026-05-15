import { useEffect, useState } from 'react';
import { SyncRuntime, SyncRuntimeSnapshot } from '../services/sync/syncRuntime';

export function useSyncRuntimeStatus(): SyncRuntimeSnapshot {
  const [snapshot, setSnapshot] = useState<SyncRuntimeSnapshot>(() => SyncRuntime.getSnapshot());

  useEffect(() => SyncRuntime.subscribe(setSnapshot), []);

  return snapshot;
}
