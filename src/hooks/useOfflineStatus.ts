import { useEffect, useState } from 'react';
import { OfflineStatus, OfflineStatusService } from '../services/offlineService';

export function useOfflineStatus(): OfflineStatus {
  const [status, setStatus] = useState<OfflineStatus>(() => OfflineStatusService.getStatus());

  useEffect(() => OfflineStatusService.subscribe(setStatus), []);

  return status;
}
