import { useCallback, useEffect, useState } from 'react';
import { exportRepository } from '../db/repositories/exportRepository';
import { ExportPacket } from '../db/schema';

export function useExportPackets(jobId?: string) {
  const [packets, setPackets] = useState<ExportPacket[]>([]);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      setPackets(await exportRepository.getByJob(jobId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load export packets');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { packets, loading, error, refresh };
}
