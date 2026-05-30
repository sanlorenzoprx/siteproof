import React, { useEffect, useState } from 'react';
import { Info, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { HintDefinition, HintService } from '../services/hintService';
import { useSettings } from '../contexts/SettingsContext';

export function HintCard({ hint, className }: { hint: HintDefinition; className?: string }) {
  const { settings, t } = useSettings();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    HintService.shouldShow(hint, settings).then((show) => {
      if (!mounted) return;
      setVisible(show);
      if (show) void HintService.markShown(hint.hintId);
    });
    return () => {
      mounted = false;
    };
  }, [hint.hintId, settings.hintMode, settings.alwaysShowProofHints]);

  if (!visible) return null;

  const Icon = hint.type === 'privacy' || hint.type === 'proof' ? ShieldCheck : Info;

  return (
    <div className={cn('rounded-2xl border p-4 text-sm font-bold flex gap-3', hint.type === 'privacy' ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-blue-50 border-blue-100 text-blue-950', className)}>
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p>{t(hint.textKey)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => void HintService.dismiss(hint.hintId).then(() => setVisible(false))} className="rounded-xl bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
            {t('hints.gotIt')}
          </button>
          <button onClick={() => void HintService.keepShowing(hint.hintId).then(() => setVisible(false))} className="rounded-xl bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
            {t('hints.keepShowing')}
          </button>
          {hint.type !== 'proof' && (
            <button onClick={() => void HintService.dismiss(hint.hintId).then(() => setVisible(false))} className="rounded-xl bg-white/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest">
              {t('hints.dontShowAgain')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
