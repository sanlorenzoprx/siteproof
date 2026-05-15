import { useEffect, useState } from 'react';
import { PilotReadinessReport, PilotReadinessService } from '../services/pilot/pilotReadinessService';

export function usePilotReadiness() {
  const [report, setReport] = useState<PilotReadinessReport | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const next = await PilotReadinessService.generateReport();
    setReport(next);
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return { report, loading, refresh };
}
