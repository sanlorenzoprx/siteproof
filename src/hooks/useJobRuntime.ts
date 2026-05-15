import { useCallback, useEffect, useState } from 'react';
import { Job } from '../types';
import { SiteProofDataService } from '../services/siteProofDataService';
import { RuntimeSnapshot } from '../services/runtimeOrchestrator';

export interface UseJobRuntimeResult {
  job: Job | null;
  snapshot: RuntimeSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useJobRuntime(jobId?: string): UseJobRuntimeResult {
  const [job, setJob] = useState<Job | null>(null);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const [nextJob, nextSnapshot] = await Promise.all([
        SiteProofDataService.getJobById(jobId),
        SiteProofDataService.getRuntimeSnapshot(jobId),
      ]);
      setJob(nextJob);
      setSnapshot(nextSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job runtime');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { job, snapshot, loading, error, refresh };
}
