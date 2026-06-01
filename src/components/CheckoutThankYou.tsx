import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Cloud, Download, ExternalLink, Settings } from 'lucide-react';
import { LicenseApiClient, CheckoutStatusResponse } from '../services/licenseApiClient';
import { SITEPROOF_BRAND } from '../config/brand';
import { CloudSyncService } from '../services/cloudSyncService';
import { useSettings } from '../contexts/SettingsContext';

export function CheckoutThankYou() {
  const { t } = useSettings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id') || '';
  const planId = searchParams.get('plan') || 'siteproof_pro';
  const [status, setStatus] = useState<CheckoutStatusResponse>({ status: sessionId ? 'pending' : 'failed' });
  const cloudVaultLive = CloudSyncService.isCloudVaultUploadEnabled();

  const openAppLink = useMemo(() => {
    if (status.activationLink) return status.activationLink;
    return status.activationCode ? `/?license=${encodeURIComponent(status.activationCode)}&token=${encodeURIComponent(sessionId)}` : '/license';
  }, [sessionId, status.activationCode, status.activationLink]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    async function poll() {
      if (!sessionId) {
        setStatus({ status: 'failed', error: t('checkout.sessionMissing') });
        return;
      }
      const next = await LicenseApiClient.checkoutStatus(sessionId, planId);
      if (cancelled) return;
      setStatus(next);
      attempts += 1;
      if (next.status === 'pending' && attempts < 8) window.setTimeout(poll, 2500);
    }
    void poll();
    return () => {
      cancelled = true;
    };
  }, [planId, sessionId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full rounded-[32px] border border-white/10 bg-slate-900/80 p-8 md:p-10 space-y-8">
        <div className="space-y-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-green-500/15 text-green-300">
            <CheckCircle2 size={30} />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-300">{SITEPROOF_BRAND.appName}</p>
            <h1 className="mt-2 text-4xl font-black italic tracking-tight uppercase">{t('checkout.title')}</h1>
          </div>
          {status.status === 'pending' ? (
            <p className="text-slate-300 font-bold">{t('checkout.settingUpLicense')}</p>
          ) : status.status === 'failed' ? (
            <p className="text-red-200 font-bold">{status.error || t('checkout.failedToLoad')}</p>
          ) : (
            <p className="text-slate-300 font-bold">{t('checkout.readyDetails')}</p>
          )}
        </div>

        <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-bold text-slate-300">{t('checkout.planLabel')}: <span className="text-white">{status.planId || planId}</span></div>
          <div className="text-sm font-bold text-slate-300">{t('checkout.licenseEmailLabel')}: <span className="text-white">{status.licenseEmail || t('checkout.pendingWebhook')}</span></div>
          <div className="text-sm font-bold text-slate-300">{t('checkout.activationCodeLabel')}: <span className="font-mono text-white">{status.activationCode || t('checkout.pending')}</span></div>
          {status.cloudEntitled && (
            <div className="flex items-start gap-2 rounded-2xl bg-blue-500/10 p-3 text-sm font-bold text-blue-100">
              <Cloud size={18} className="mt-0.5 shrink-0" />
              {cloudVaultLive
                ? t('checkout.cloudIncludedLive')
                : t('checkout.cloudEntitledPending')}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <a href={openAppLink} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-widest text-slate-950">
            <ExternalLink size={18} /> {t('checkout.openSiteProof')}
          </a>
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-4 text-sm font-black uppercase tracking-widest text-white">
            <Download size={18} /> {t('checkout.download')}
          </button>
          <button onClick={() => navigate('/settings')} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 text-sm font-black uppercase tracking-widest text-white">
            <Settings size={18} /> {t('checkout.setupProfile')}
          </button>
        </div>

        <div className="rounded-3xl bg-slate-950/70 p-5 text-sm font-bold text-slate-400">
          {t('checkout.installHelp')}
        </div>
      </div>
    </div>
  );
}
