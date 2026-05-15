import React from 'react';
import { AlertTriangle, CheckCircle, ShieldCheck } from 'lucide-react';
import { InspectionReadinessResult } from '../../features/inspection/inspectionReadinessService';
import { cn } from '../../lib/utils';

export function InspectionReadyCard({ readiness, loading }: { readiness: InspectionReadinessResult | null; loading?: boolean }) {
  const score = readiness?.readiness_score ?? 0;
  const status = readiness?.status ?? 'not_ready';
  const title = loading
    ? 'Checking Inspection Readiness'
    : status === 'ready'
      ? 'Ready for Inspection'
      : status === 'warning'
        ? 'Ready with Warnings'
        : 'Not Ready for Inspection';

  const Icon = status === 'ready' ? CheckCircle : status === 'warning' ? AlertTriangle : ShieldCheck;

  return (
    <section className={cn(
      'border rounded-[32px] p-6 md:p-8 shadow-sm overflow-hidden relative',
      status === 'ready' ? 'bg-green-50 border-green-100' : status === 'warning' ? 'bg-yellow-50 border-yellow-100' : 'bg-white border-slate-200',
    )}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
            status === 'ready' ? 'bg-green-100 text-green-700' : status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-50 text-blue-700',
          )}>
            <Icon size={28} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Inspection Ready Mode</div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-950 tracking-tight">{title}</h2>
            <p className="text-xs md:text-sm font-bold text-slate-500 mt-2">
              {readiness
                ? `${readiness.completed_requirements}/${readiness.total_requirements} required inspector proof items complete · ${readiness.completed_stages}/${readiness.total_stages} stages complete`
                : 'Loading required proof, stages, and quality checks.'}
            </p>
          </div>
        </div>

        <div className="min-w-[220px]">
          <div className="flex items-end justify-between gap-4 mb-3">
            <span className={cn(
              'text-5xl font-black tracking-tight',
              status === 'ready' ? 'text-green-600' : status === 'warning' ? 'text-yellow-600' : 'text-blue-600',
            )}>{score}%</span>
            <div className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div>{readiness?.blocking_items.length ?? 0} blocking</div>
              <div>{readiness?.warning_items.length ?? 0} warnings</div>
            </div>
          </div>
          <div className="h-3 bg-white/70 rounded-full overflow-hidden border border-white/70">
            <div
              className={cn('h-full transition-all duration-700', status === 'ready' ? 'bg-green-500' : status === 'warning' ? 'bg-yellow-500' : 'bg-blue-600')}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
