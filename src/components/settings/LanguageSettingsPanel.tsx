import React from 'react';
import { Languages } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import type { SiteProofLanguage } from '../../types/settings';

function LanguageSelect({ label, value, onChange, t }: { label: string; value: SiteProofLanguage; onChange: (value: SiteProofLanguage) => void; t: (key: string) => string }) {
  return (
    <label className="space-y-2">
      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as SiteProofLanguage)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold">
        <option value="en">{t('common.english')}</option>
        <option value="es">{t('common.spanish')}</option>
      </select>
    </label>
  );
}

export function LanguageSettingsPanel() {
  const { settings, updateSettings, t } = useSettings();
  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600/10 p-2 rounded-lg"><Languages className="text-indigo-600" size={20} /></div>
        <h2 className="text-lg font-bold text-slate-900">{t('settings.language')}</h2>
      </div>
      <p className="text-sm text-slate-500">{t('common.brandPromise')}</p>
      <div className="grid md:grid-cols-3 gap-4">
        <LanguageSelect label={t('settings.uiLanguage')} value={settings.uiLanguage} onChange={(uiLanguage) => void updateSettings({ uiLanguage })} t={t} />
        <LanguageSelect label={t('capture.captureLanguage')} value={settings.captureLanguage} onChange={(captureLanguage) => void updateSettings({ captureLanguage })} t={t} />
        <LanguageSelect label={t('reports.reportLanguage')} value={settings.exportLanguage} onChange={(exportLanguage) => void updateSettings({ exportLanguage })} t={t} />
      </div>
    </section>
  );
}
