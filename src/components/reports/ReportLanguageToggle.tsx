import React from 'react';
import { useSettings } from '../../contexts/SettingsContext';

export function ReportLanguageToggle() {
  const { settings, updateSettings, t } = useSettings();
  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 space-y-3">
      <div>
        <div className="text-xs font-black uppercase tracking-widest text-slate-300">{t('reports.reportLanguage')}</div>
        <p className="text-xs font-bold text-slate-500 mt-1">{t('reports.audience')}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => void updateSettings({ exportLanguage: 'en' })} className={`px-4 py-2 rounded-2xl text-xs font-black ${settings.exportLanguage === 'en' ? 'bg-white text-slate-950' : 'bg-white/10 text-white'}`}>{t('reports.englishReport')}</button>
        <button onClick={() => void updateSettings({ exportLanguage: 'es' })} className={`px-4 py-2 rounded-2xl text-xs font-black ${settings.exportLanguage === 'es' ? 'bg-white text-slate-950' : 'bg-white/10 text-white'}`}>{t('reports.spanishReport')}</button>
      </div>
    </div>
  );
}
