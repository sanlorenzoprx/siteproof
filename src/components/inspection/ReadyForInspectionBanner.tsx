import React from 'react';
import { AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import { InspectionReadinessResult } from '../../features/inspection/inspectionReadinessService';
import { cn } from '../../lib/utils';

export function ReadyForInspectionBanner({ readiness }: { readiness: InspectionReadinessResult | null }) {
  if (!readiness) return null;
  const ready = readiness.status === 'ready';
  const warning = readiness.status === 'warning';
  const Icon = ready ? CheckCircle : warning ? AlertTriangle : ShieldCheck;
  return (
    <div className={cn(
      'rounded-2xl px-4 py-3 flex items-center gap-3 text-xs font-black uppercase tracking-widest border',
      ready ? 'bg-green-50 border-green-100 text-green-700' : warning ? 'bg-yellow-50 border-yellow-100 text-yellow-700' : 'bg-orange-50 border-orange-100 text-orange-700',
    )}>
      <Icon size={18} />
      {ready ? 'Ready for inspector packet' : warning ? `${readiness.warning_items.length} inspection warning${readiness.warning_items.length === 1 ? '' : 's'}` : `${readiness.blocking_items.length} required proof item${readiness.blocking_items.length === 1 ? '' : 's'} missing`}
    </div>
  );
}
