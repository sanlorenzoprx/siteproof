import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, RotateCw, ShieldCheck } from 'lucide-react';
import { usePilotReadiness } from '../../hooks/usePilotReadiness';
import { cn } from '../../lib/utils';
import { useSettings } from '../../contexts/SettingsContext';

function iconFor(status: string) {
  if (status === 'pass') return <CheckCircle2 size={18} className="text-green-600" />;
  if (status === 'warn') return <AlertTriangle size={18} className="text-amber-600" />;
  return <XCircle size={18} className="text-red-600" />;
}

export function PilotReadiness() {
  const navigate = useNavigate();
  const { t } = useSettings();
  const { report, loading, refresh } = usePilotReadiness();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-xl text-slate-500 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('pilot.title')}</h1>
            <p className="text-sm text-slate-500 font-medium">{t('pilot.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-60"
        >
          <RotateCw size={14} className={cn(loading && 'animate-spin')} /> {t('pilot.refresh')}
        </button>
      </header>

      <section className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        {loading || !report ? (
          <div className="py-12 text-center text-slate-500 font-bold">{t('pilot.checking')}</div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'h-20 w-20 rounded-3xl flex items-center justify-center text-2xl font-black',
                  report.status === 'pilot_ready' ? 'bg-green-100 text-green-700' : report.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                )}>
                  {report.score}%
                </div>
                <div>
                  <div className="flex items-center gap-2 text-slate-900 font-black text-lg">
                    <ShieldCheck size={20} />
                    {report.status === 'pilot_ready' ? t('pilot.ready') : report.status === 'blocked' ? t('pilot.blocked') : t('pilot.needsAttention')}
                  </div>
                  <p className="text-sm text-slate-500 font-medium">{t('pilot.generated')} {new Date(report.generatedAt).toLocaleString()}</p>
                </div>
              </div>
              <div className="text-xs font-bold text-slate-500 max-w-md">
                {t('pilot.help')}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {report.checks.map((check) => (
                <div key={check.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50/60">
                  <div className="flex items-start gap-3">
                    {iconFor(check.status)}
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-slate-900">{check.label}</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{check.detail}</p>
                      {check.action && <p className="text-[11px] text-blue-700 font-bold mt-2">{t('pilot.next')}: {check.action}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
