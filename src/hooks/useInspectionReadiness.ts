import { useEffect, useState } from 'react';
import { InspectionReadinessResult, InspectionReadinessService } from '../features/inspection/inspectionReadinessService';

export function useInspectionReadiness(jobId?: string | null, refreshKey = 0) {
  const [readiness, setReadiness] = useState<InspectionReadinessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!jobId) return;
      setLoading(true);
      setError(null);
      try {
        const result = await InspectionReadinessService.getInspectionReadiness(jobId);
        if (!cancelled) setReadiness(result);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err : new Error('Inspection readiness failed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, refreshKey]);

  return { readiness, loading, error };
}
