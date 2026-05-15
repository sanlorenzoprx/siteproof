import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, Zap, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { SiteProofDataService } from '../services/siteProofDataService';
import { License } from '../types';
import { cn } from '../lib/utils';
import { SITEPROOF_BRAND } from '../config/brand';
import { SITEPROOF_OFFER } from '../config/offer';
import { LicenseValueCard } from './LicenseValueCard';

interface LicenseScreenProps {
  license: License | null;
  onUpdate: (license: License) => void;
}

export function LicenseScreen({ license, onUpdate }: LicenseScreenProps) {
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [activating, setActivating] = useState(false);

  const isExpired = license && !license.isActivated && license.expiresAt && Date.now() > license.expiresAt;
  const daysLeft = license?.expiresAt ? Math.max(0, Math.ceil((license.expiresAt - Date.now()) / (1000 * 60 * 60 * 24))) : 0;

  async function handleActivate() {
    if (!license || key.length < 8) return;
    setActivating(true);
    // Simulate activation logic
    const updated: License = {
      ...license,
      licenseKey: key,
      isActivated: true,
      expiresAt: null
    };
    await SiteProofDataService.saveLicense(updated);
    onUpdate(updated);
    setActivating(false);
    navigate('/');
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans selection:bg-blue-500/30">
      <div className="max-w-xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
            <Lock size={12} />
            Yearly License
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tighter uppercase italic">
            {license?.isActivated ? "System Active" : SITEPROOF_BRAND.appName}
          </h1>
          <p className="text-slate-400 max-w-sm mx-auto text-lg">
            {license?.isActivated 
              ? "Your yearly SiteProof license is active and protecting job documentation." 
              : "Document jobs fast, protect the company, and get paid faster."
            }
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[32px] p-8 md:p-12 space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -mr-32 -mt-32 transition-colors group-hover:bg-blue-600/20" />
          
          <div className="flex items-center justify-between relative">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</span>
              <p className={cn(
                "text-2xl font-bold tracking-tight",
                license?.isActivated ? "text-green-400" : (isExpired ? "text-red-400" : "text-blue-400")
              )}>
                {license?.isActivated ? "Active Yearly" : (isExpired ? "Expired" : "Free Trial")}
              </p>
            </div>
            
            <div className="text-right space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                {license?.isActivated ? "Member Since" : "Time Remaining"}
              </span>
              <p className="text-2xl font-bold text-white tracking-tight">
                {license?.isActivated 
                  ? new Date(license.installedAt).getFullYear() 
                  : `${daysLeft} Days`
                }
              </p>
            </div>
          </div>

          {!license?.isActivated && (
            <div className="space-y-6 pt-4 relative">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Unlock System Code</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter 8-digit license key"
                    value={key}
                    onChange={e => setKey(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono tracking-widest"
                  />
                  {key.length >= 8 && (
                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500" size={20} />
                  )}
                </div>
              </div>

              <button
                onClick={handleActivate}
                disabled={activating || key.length < 8}
                className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black text-lg shadow-2xl hover:bg-blue-500 hover:text-white transition-all active:scale-[0.98] disabled:opacity-30 disabled:grayscale"
              >
                {activating ? "Verifying..." : "Activate Yearly License"}
              </button>

              {!isExpired && (
                <button 
                  onClick={() => navigate('/')}
                  className="w-full text-slate-500 py-2 text-sm font-bold hover:text-slate-300 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} />
                  Return to Dashboard
                </button>
              )}
            </div>
          )}
        </div>

        <div className="bg-slate-900/50 backdrop-blur-3xl border border-white/10 rounded-[32px] p-6 text-white">
          <LicenseValueCard
            planId="core"
            status={license?.isActivated ? 'active' : isExpired ? 'expired' : 'trial'}
          />
          <p className="mt-5 text-sm text-slate-400 font-bold leading-relaxed">
            {SITEPROOF_OFFER.roiPrinciple}
          </p>
        </div>

        {/* Benefits Grid */}
        {!license?.isActivated && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 p-5 rounded-3xl space-y-2">
              <Zap className="text-yellow-400" size={20} />
              <h4 className="text-white font-bold text-sm">Offline First</h4>
              <p className="text-slate-500 text-xs">Full functionality in low-signal job sites.</p>
            </div>
            <div className="bg-white/5 border border-white/5 p-5 rounded-3xl space-y-2">
              <ShieldCheck className="text-blue-400" size={20} />
              <h4 className="text-white font-bold text-sm">Privacy Core</h4>
              <p className="text-slate-500 text-xs">All data stays encrypted on your device.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
