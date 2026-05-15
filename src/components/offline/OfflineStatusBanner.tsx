import React from 'react';
import { CloudOff, CheckCircle, Wifi } from 'lucide-react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { useSettings } from '../../contexts/SettingsContext';

export function OfflineStatusBanner() {
  const status = useOfflineStatus();
  const { settings, t } = useSettings();

  if (status.online && status.serviceWorkerReady) {
    return null;
  }

  if (!status.online) {
    return (
      <div className="bg-orange-50 border-b border-orange-200 px-4 py-3 text-orange-900 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest">
        <CloudOff size={16} /> Offline Mode — jobs, proof capture, and exports are saved on this device
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 text-blue-900 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest">
      {status.serviceWorkerReady ? <CheckCircle size={14} /> : <Wifi size={14} />}
      {t('offline.preparing')}
    </div>
  );
}
