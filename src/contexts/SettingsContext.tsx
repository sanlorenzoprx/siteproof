import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translate } from '../config/i18n';
import { SettingsService, createDefaultSettings } from '../services/settingsService';
import type { SiteProofSettings } from '../types/settings';

interface SettingsContextValue {
  settings: SiteProofSettings;
  ready: boolean;
  updateSettings: (patch: Partial<SiteProofSettings>) => Promise<void>;
  t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteProofSettings>(() => createDefaultSettings());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SettingsService.getSettings().then((value) => {
      setSettings(value);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.uxMode = settings.uxMode;
    root.dataset.themeMode = settings.themeMode;
    root.dataset.textSize = settings.textSize;
    root.dataset.voiceHelp = settings.voiceHelpEnabled ? 'on' : 'off';
  }, [settings.uxMode, settings.themeMode, settings.textSize, settings.voiceHelpEnabled]);

  async function updateSettings(patch: Partial<SiteProofSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await SettingsService.saveSettings(next);
  }

  const value = useMemo(() => ({
    settings,
    ready,
    updateSettings,
    t: (key: string) => translate(settings.uiLanguage, key),
  }), [settings, ready]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
