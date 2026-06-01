import { Plus, Trash2 } from 'lucide-react';
import type { BidMetric } from '../../domain/models';

interface BidMetricEditorProps {
  metrics: BidMetric[];
  onChange: (metrics: BidMetric[]) => void;
  t: (key: string) => string;
}

function createMetric(): BidMetric {
  return {
    metricId: crypto.randomUUID(),
    label: '',
    value: '',
    type: 'text',
    visibility: 'internal',
    required: false,
  };
}

export function BidMetricEditor({ metrics, onChange, t }: BidMetricEditorProps) {
  function updateMetric(metricId: string, update: Partial<BidMetric>) {
    onChange(metrics.map((metric) => metric.metricId === metricId ? { ...metric, ...update } : metric));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{t('jobDetail.bidMetrics')}</h3>
        <button
          type="button"
          onClick={() => onChange([...metrics, createMetric()])}
          className="rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1.5"
        >
          <Plus size={14} /> {t('jobDetail.addMetric')}
        </button>
      </div>
      {metrics.map((metric) => (
        <div key={metric.metricId} className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <input
            value={metric.label}
            onChange={(event) => updateMetric(metric.metricId, { label: event.target.value })}
            placeholder={t('jobDetail.metricLabel')}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
          />
          <input
            value={metric.value ?? ''}
            onChange={(event) => updateMetric(metric.metricId, { value: event.target.value })}
            placeholder={t('jobDetail.metricValue')}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
          />
          <label className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
            <input
              type="checkbox"
              checked={metric.visibility === 'customer'}
              onChange={(event) => updateMetric(metric.metricId, { visibility: event.target.checked ? 'customer' : 'internal' })}
            />
            {t('jobDetail.customerVisible')}
          </label>
          <button
            type="button"
            onClick={() => onChange(metrics.filter((item) => item.metricId !== metric.metricId))}
            className="min-h-11 rounded-xl border border-red-100 bg-white px-3 text-red-600 flex items-center justify-center"
            aria-label={t('jobDetail.deleteJob')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
