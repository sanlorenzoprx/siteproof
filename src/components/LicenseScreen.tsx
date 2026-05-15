import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Zap, ArrowLeft, CheckCircle2, Lock, Cloud } from 'lucide-react';
import { cn } from '../lib/utils';
import { SITEPROOF_BRAND } from '../config/brand';
import { SITEPROOF_OFFER } from '../config/offer';
import { LicenseValueCard } from './LicenseValueCard';
import { LicenseService, type LicenseState } from '../services/licenseService';
import { LicenseApiClient } from '../services/licenseApiClient';
import { useSettings } from '../contexts/SettingsContext';

interface LicenseScreenProps {
  license: LicenseState | null;
  onUpdate: (license: LicenseState) => void;
}

function displayStatus(state: LicenseState | null, t: (key: string) => string) {
  if (!state) return t('license.freeTrial');
  if (state.status === 'licensed') return t('license.activeYearly');
  if (state.status === 'trial_expired') return t('license.trialExpired');
  if (state.status === 'license_pending_verification') return t('license.pendingVerification');
  if (state.status === 'offline_grace') return t('license.offlineGrace');
  if (state.status === 'license_invalid') return t('license.invalid');
  return t('license.freeTrial');
}

export function LicenseScreen({ license, onUpdate }: LicenseScreenProps) {
  const { t } = useSettings();
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [activating, setActivating] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState('');
  const trialEndsAt = license?.trialEndsAt ? Date.parse(license.trialEndsAt) : 0;
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
  const licensed = license?.status === 'licensed' || license?.status === 'offline_grace';

  async function handleActivate() {
    if (key.length < 8) return;
    setActivating(true);
    const pending = await LicenseService.activateLocally(key);
    const result = await LicenseService.verify((state) => LicenseApiClient.verify(state));
    onUpdate(result.state ?? pending);
    setActivating(false);
    if (LicenseService.allowsCoreWorkflow(result.state)) navigate('/');
  }

  async function handlePurchase() {
    const checkout = await LicenseApiClient.createCheckout('core');
    if (checkout.url) {
      window.location.assign(checkout.url);
      return;
    }
    setPurchaseMessage(t('license.purchaseUnavailable'));
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans selection:bg-blue-500/30">
      <div className="max-w-xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
            <Lock size={12} />
            {t('license.yearlyLicense')}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter uppercase italic">
            {licensed ? t('license.systemActive') : SITEPROOF_BRAND.appName}
          </h1>
          <p className="text-slate-400 max-w-sm mx-auto text-lg">
            {licensed ? t('license.activeHelp') : t('license.trialHeadline')}
          </p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 md:p-12 space-y-8 relative overflow-hidden group">
          <div className="flex items-center justify-between relative">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('license.status')}</span>
              <p className={cn('text-2xl font-bold tracking-tight', licensed ? 'text-green-400' : license?.status === 'license_invalid' ? 'text-red-400' : 'text-blue-400')}>
                {displayStatus(license, t)}
              </p>
            </div>
            <div className="text-right space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {licensed ? t('license.memberSince') : t('license.timeRemaining')}
              </span>
              <p className="text-2xl font-bold text-white tracking-tight">
                {licensed ? new Date(license?.activatedAt ?? Date.now()).getFullYear() : `${daysLeft} ${t('license.days')}`}
              </p>
            </div>
          </div>

          {!licensed && (
            <div className="space-y-6 pt-4 relative">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">{t('license.unlockCode')}</label>
                <div className="relative">
                  <input type="text" placeholder={t('license.keyPlaceholder')} value={key} onChange={(e) => setKey(e.target.value.toUpperCase())} className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono tracking-widest" />
                  {key.length >= 8 && <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={20} />}
                </div>
              </div>
              <button onClick={handleActivate} disabled={activating || key.length < 8} className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black text-lg shadow-2xl hover:bg-blue-500 hover:text-white transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale">
                {activating ? t('license.verifying') : t('license.activate')}
              </button>
              <button onClick={handlePurchase} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest">
                {t('license.buy')}
              </button>
              {purchaseMessage && <p className="text-xs font-bold text-blue-200">{purchaseMessage}</p>}
            </div>
          )}
          <p className="text-xs font-bold text-slate-400">{t('license.offlineSafe')}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 text-white">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-4"><Cloud size={14} /> {t('license.cloudEntitled')}: {license?.cloudEntitled ? t('license.cloudIncluded') : t('license.cloudNotIncluded')}</div>
          <LicenseValueCard planId="core" status={licensed ? 'active' : license?.status === 'trial_expired' ? 'expired' : 'trial'} />
          <p className="mt-5 text-sm text-slate-400 font-bold leading-relaxed">{SITEPROOF_OFFER.roiPrinciple}</p>
        </div>

        <button onClick={() => navigate('/')} className="w-full text-slate-500 py-2 text-sm font-bold hover:text-slate-300 transition-colors flex items-center justify-center gap-2">
          <ArrowLeft size={16} /> {t('license.returnDashboard')}
        </button>

        {!licensed && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 p-5 rounded-3xl space-y-2">
              <Zap className="text-yellow-400" size={20} />
              <h4 className="text-white font-bold text-sm">{t('license.offlineFirst')}</h4>
              <p className="text-slate-500 text-xs">{t('license.fullLowSignal')}</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-5 rounded-3xl space-y-2">
              <ShieldCheck className="text-blue-400" size={20} />
              <h4 className="text-white font-bold text-sm">{t('license.privacyCore')}</h4>
              <p className="text-slate-500 text-xs">{t('license.devicePrivacy')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
