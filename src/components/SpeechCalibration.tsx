import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Square, CheckCircle, Zap, ShieldCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AppSettingsService } from '../services/appSettingsService';
import { useSettings } from '../contexts/SettingsContext';

const CALIBRATION_SENTENCES = [
  "Verify the 200 amp service main breaker and grounding rod installation.",
  "Check the fuel line regulator for leaks and measure the pressure drop.",
  "The ATS is mounted and the control wiring matches the schematic."
];

export function SpeechCalibration() {
  const { t } = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'done'>('idle');
  const [completed, setCompleted] = useState(false);

  async function startStep() {
    setStatus('recording');
    // In a real app, we'd record audio here
    setTimeout(() => {
      setStatus('processing');
      setTimeout(() => {
        if (step < CALIBRATION_SENTENCES.length - 1) {
          setStep(s => s + 1);
          setStatus('idle');
        } else {
          setCompleted(true);
          setStatus('done');
          void AppSettingsService.setSpeechCalibrated(true);
        }
      }, 1500);
    }, 3000);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      <header className="p-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 bg-white/5 rounded-xl text-white/50 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">{t('speechCalibration.engine')}</span>
        <div className="w-10" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {!completed ? (
            <motion.div 
              key="active"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8 w-full"
            >
              <div className="space-y-2">
                <div className="flex justify-center gap-1 mb-6">
                  {CALIBRATION_SENTENCES.map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-1 rounded-full transition-all duration-500",
                        i === step ? "w-8 bg-blue-500" : i < step ? "w-4 bg-green-500" : "w-4 bg-white/10"
                      )}
                    />
                  ))}
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight italic">{t('speechCalibration.title')}</h1>
                <p className="text-slate-400 text-sm">{t('speechCalibration.subtitle')}</p>
              </div>

              <div className="bg-white/5 border border-white/10 p-8 rounded-3xl relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <p className="text-xl font-medium text-white leading-relaxed italic">
                  "{CALIBRATION_SENTENCES[step]}"
                </p>
                
                {status === 'recording' && (
                  <div className="absolute inset-0 bg-red-600/10 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                      <span className="text-red-500 font-black text-[10px] uppercase tracking-widest">{t('speechCalibration.listening')}</span>
                    </div>
                  </div>
                )}

                {status === 'processing' && (
                  <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="text-white animate-spin" size={24} />
                      <span className="text-white font-black text-[10px] uppercase tracking-widest">{t('speechCalibration.analyzing')}</span>
                    </div>
                  </div>
                )}
              </div>

              {status === 'idle' && (
                <button 
                  onClick={startStep}
                  className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 hover:bg-blue-500 active:scale-90 transition-all mx-auto"
                >
                  <Mic className="text-white" size={32} />
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="text-green-500" size={48} />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white italic tracking-tighter">{t('speechCalibration.optimizedTitle')}</h2>
                <p className="text-slate-400 text-sm max-w-xs mx-auto">
                  {t('speechCalibration.optimizedHelp')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                {[
                  { label: t('speechCalibration.backgroundNoise'), val: t('speechCalibration.filtered'), icon: Zap },
                  { label: t('speechCalibration.technicalLexicon'), val: t('speechCalibration.mapped'), icon: CheckCircle },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/5 p-4 rounded-2xl border border-white/10">
                    <stat.icon size={16} className="text-blue-500 mb-2" />
                    <div className="text-[10px] font-bold text-slate-500 uppercase">{stat.label}</div>
                    <div className="text-white font-bold">{stat.val}</div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => navigate(-1)}
                className="w-full py-4 bg-white text-slate-900 font-bold rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                {t('speechCalibration.finishSetup')}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="p-8 text-center">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">{t('speechCalibration.footerEngine')}</p>
      </footer>
    </div>
  );
}
