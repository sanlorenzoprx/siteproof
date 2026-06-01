import { useCallback, useEffect, useState } from 'react';
import { Job } from '../domain/models';
import { SiteProofDataService } from '../services/siteProofDataService';
import { JobWorkflowService, CreateFieldJobInput } from '../services/jobWorkflowService';

export interface UseJobsResult {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createJob: (input: CreateFieldJobInput) => Promise<Job>;
  deleteJob: (jobId: string) => Promise<void>;
}

/**
 * UI boundary for job data.
 * During Repository Migration v1 this hook reads through SiteProofDataService, which
 * now uses the repository/schema layer first and legacy Dexie only as fallback.
 */
export function useJobs(): UseJobsResult {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setJobs(await SiteProofDataService.getJobs());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createJob = useCallback(async (input: CreateFieldJobInput) => {
    const job = await JobWorkflowService.createJob(input);
    await refresh();
    return job;
  }, [refresh]);

  const deleteJob = useCallback(async (jobId: string) => {
    await SiteProofDataService.deleteJob(jobId);
    await refresh();
  }, [refresh]);

  return { jobs, loading, error, refresh, createJob, deleteJob };
}
