import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Cloud, Download, ExternalLink, Settings } from 'lucide-react';
import { LicenseApiClient, CheckoutStatusResponse } from '../services/licenseApiClient';
import { SITEPROOF_BRAND } from '../config/brand';
import { CloudSyncService } from '../services/cloudSyncService';

export function CheckoutThankYou() {
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
        setStatus({ status: 'failed', error: 'Checkout session is missing.' });
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
            <h1 className="mt-2 text-4xl font-black italic tracking-tight uppercase">Thank you - SiteProof is ready</h1>
          </div>
          {status.status === 'pending' ? (
            <p className="text-slate-300 font-bold">Setting up license...</p>
          ) : status.status === 'failed' ? (
            <p className="text-red-200 font-bold">{status.error || 'We could not load this checkout session. Open SiteProof and paste your activation code, or contact support.'}</p>
          ) : (
            <p className="text-slate-300 font-bold">Your license and setup details are ready for SiteProof.</p>
          )}
        </div>

        <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-bold text-slate-300">Plan: <span className="text-white">{status.planId || planId}</span></div>
          <div className="text-sm font-bold text-slate-300">License email: <span className="text-white">{status.licenseEmail || 'Pending webhook'}</span></div>
          <div className="text-sm font-bold text-slate-300">Activation code: <span className="font-mono text-white">{status.activationCode || 'Pending'}</span></div>
          {status.cloudEntitled && (
            <div className="flex items-start gap-2 rounded-2xl bg-blue-500/10 p-3 text-sm font-bold text-blue-100">
              <Cloud size={18} className="mt-0.5 shrink-0" />
              {cloudVaultLive
                ? 'Your cloud storage is included. Reports and proof will sync when online.'
                : 'Cloud Proof Vault entitlement is included. Local offline proof capture works now; cloud backup activates when your account backup is enabled.'}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <a href={openAppLink} className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-4 text-sm font-black uppercase tracking-widest text-slate-950">
            <ExternalLink size={18} /> Open SiteProof
          </a>
          <button onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-4 text-sm font-black uppercase tracking-widest text-white">
            <Download size={18} /> Download
          </button>
          <button onClick={() => navigate('/settings')} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-4 text-sm font-black uppercase tracking-widest text-white">
            <Settings size={18} /> Set Up Profile
          </button>
        </div>

        <div className="rounded-3xl bg-slate-950/70 p-5 text-sm font-bold text-slate-400">
          Install on phone: open SiteProof in your mobile browser, use the browser share/menu button, then choose Add to Home Screen or Install App.
        </div>
      </div>
    </div>
  );
}
