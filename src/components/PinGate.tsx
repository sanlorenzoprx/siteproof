import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Unlock, ArrowRight, AlertCircle } from 'lucide-react';
import { SiteProofDataService } from '../services/siteProofDataService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PinGateProps {
  children: React.ReactNode;
}

export function PinGate({ children }: PinGateProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminPin, setAdminPin] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const biz = await SiteProofDataService.getBusinessProfile();
      setAdminPin(biz?.adminPin || null);
      
      // Session persistence for current browser session
      const sessionUnlocked = sessionStorage.getItem('siteproof_admin_unlocked') === 'true';
      if (sessionUnlocked || !biz?.adminPin) {
        setIsUnlocked(true);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleVerify() {
    if (pin === adminPin) {
      setIsUnlocked(true);
      sessionStorage.setItem('siteproof_admin_unlocked', 'true');
    } else {
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 500);
    }
  }

  if (loading) return null;
  if (isUnlocked) return <>{children}</>;

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[40px] shadow-2xl border border-slate-200 p-8 md:p-12 text-center space-y-8"
      >
        <div className="space-y-4">
          <div className={cn(
            "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto transition-all",
            error ? "bg-red-100 text-red-600 animate-shake" : "bg-orange-100 text-orange-600"
          )}>
            <Lock size={40} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">HQ Restricted</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Please enter your 4-6 digit Admin PIN to access business analytics and scheduling.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center gap-2">
            <input 
              type="password"
              maxLength={6}
              autoFocus
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              className={cn(
                "w-full bg-slate-50 border-2 rounded-2xl px-5 py-4 text-slate-900 focus:outline-none transition-all font-mono text-center tracking-[0.5em] text-2xl",
                error ? "border-red-500 bg-red-50" : "border-slate-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
              )}
              placeholder="••••••"
            />
          </div>

          <button 
            onClick={handleVerify}
            disabled={pin.length < 4}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-30 shadow-xl shadow-black/10"
          >
            Authorize Access <Unlock size={20} />
          </button>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1"
            >
              <AlertCircle size={14} /> Incorrect PIN
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
