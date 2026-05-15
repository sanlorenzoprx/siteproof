import React from 'react';
import { Cloud } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';

export function CloudUpsellCard() {
  const { settings, updateSettings, t } = useSettings();
  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600/10 p-2 rounded-lg"><Cloud className="text-blue-600" size={20} /></div>
        <h2 className="text-lg font-bold text-slate-900">{t('cloud.title')}</h2>
      </div>
      <div className="space-y-1 text-sm text-slate-500">
        <p>{t('cloud.optional')}</p>
        <p>{t('cloud.offlineCore')}</p>
        <p>{t('cloud.backsUp')}</p>
      </div>
      <div className="flex items-center justify-between gap-4 bg-slate-50 rounded-2xl p-4">
        <div>
          <div className="text-sm font-bold text-slate-900">{settings.cloudEnabled ? t('cloud.enabled') : t('cloud.disabled')}</div>
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{settings.cloudSyncStatus}</div>
        </div>
        <button onClick={() => void updateSettings({ cloudEnabled: !settings.cloudEnabled, cloudSyncStatus: settings.cloudEnabled ? 'off' : 'pending' })} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest">
          {settings.cloudEnabled ? 'Disable' : 'Enable'}
        </button>
      </div>
    </section>
  );
}
