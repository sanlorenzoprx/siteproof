import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, CheckCircle2, ShieldCheck, Sparkles, Wrench, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SiteProofDataService } from '../services/siteProofDataService';
import { AppSettingsService } from '../services/appSettingsService';
import { JobWorkflowService } from '../services/jobWorkflowService';
import { TemplateCatalogService } from '../services/templateCatalogService';
import { BusinessProfile, UserProfile } from '../domain/models';
import { VoiceDictation } from './VoiceDictation';
import { cn } from '../lib/utils';
import { SITEPROOF_BRAND } from '../config/brand';
import { useSettings } from '../contexts/SettingsContext';

interface OnboardingProps {
  onComplete?: () => void;
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

function emptyBusinessProfile(): BusinessProfile {
  return {
    companyName: 'My Field Company',
    tagline: SITEPROOF_BRAND.tagline,
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    linkedIn: '',
    businessBio: 'SiteProof field documentation profile. Full business details can be completed later in Settings.',
    licenseNumber: 'SET-IN-SETTINGS',
    regulatoryInfo: `${SITEPROOF_BRAND.shortDescription} Business details pending setup.`,
    adminPin: '',
  };
}

function firstWords(value: string, fallback: string): string {
  return value.trim().split(/\s+/).slice(0, 4).join(' ') || fallback;
}

function parseQuickJob(text: string, selectedTemplateId: string, uiLanguage: 'en' | 'es') {
  const selected = TemplateCatalogService.getTemplate(selectedTemplateId, uiLanguage);
  const forMatch = text.match(/\bfor\s+(.+?)(?:\s+at\s+|$)/i);
  const atMatch = text.match(/\bat\s+(.+)$/i);
  return {
    customerName: forMatch?.[1]?.trim() || firstWords(text, 'New Customer'),
    address: atMatch?.[1]?.trim() || 'GPS Auto / Field Site',
    jobType: selected.display_name,
    templateId: selected.template_id,
    notes: text.trim(),
  };
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { settings, updateSettings, t } = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('generator_install_v1');
  const [quickJobText, setQuickJobText] = useState('');
  const [firstAction, setFirstAction] = useState<'bid' | 'approved'>('approved');
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => TemplateCatalogService.getTemplate(selectedTemplateId, settings.uiLanguage),
    [selectedTemplateId, settings.uiLanguage],
  );
  const quickJobPreview = useMemo(
    () => parseQuickJob(quickJobText, selectedTemplateId, settings.uiLanguage),
    [quickJobText, selectedTemplateId, settings.uiLanguage],
  );
  const specialtyOptions = useMemo(
    () => TemplateCatalogService.getTemplateOptions(settings.uiLanguage),
    [settings.uiLanguage],
  );

  async function createFirstJob() {
    if (!quickJobText.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const business = emptyBusinessProfile();
      const user: UserProfile = {
        id: crypto.randomUUID(),
        fullName: 'Field Technician',
        email: '',
        role: 'Field Technician',
      };

      await SiteProofDataService.saveBusinessProfile(business);
      await SiteProofDataService.saveUserProfile(user);
      await AppSettingsService.setValue('primary_trade_specialty_template_id', selectedTemplateId);
      await AppSettingsService.setValue('onboarding_completed_at', new Date().toISOString());

      const job = await JobWorkflowService.createJob({
        ...quickJobPreview,
        mode: firstAction,
        status: firstAction === 'bid' ? 'INCOMING' : 'ACTIVE',
        technicianName: user.fullName,
        technicianRole: user.role,
      });

      setCreatedJobId(job.id);
      onComplete?.();
      setStep(5);
    } catch (err) {
      console.error(err);
      setError(t('onboarding.createError'));
    } finally {
      setLoading(false);
    }
  }

  function openCapture() {
    if (!createdJobId) return;
    navigate(`/job/${createdJobId}/camera`, { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans overflow-hidden text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-[40px] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <motion.div className="h-full bg-blue-500" animate={{ width: `${(step / 5) * 100}%` }} />
        </div>

        <div className="p-7 md:p-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="welcome" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-300">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-300 mb-3">{SITEPROOF_BRAND.appName}</p>
                    <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none uppercase">{t('onboarding.documentJob')}</h1>
                  </div>
                  <p className="text-slate-300 text-base leading-relaxed font-bold">{SITEPROOF_BRAND.elevatorPitch}</p>
                </div>

                <div className="grid gap-3">
                  {[
                    [t('onboarding.talk'), t('onboarding.talkHelp')],
                    [t('onboarding.capture'), t('onboarding.captureHelp')],
                    [t('onboarding.getPaid'), SITEPROOF_BRAND.proofLanguage.paid],
                  ].map(([title, body]) => (
                    <div key={title} className="bg-white/5 border border-white/10 rounded-3xl p-4 flex gap-3">
                      <CheckCircle2 className="text-blue-300 shrink-0 mt-0.5" size={18} />
                      <div>
                        <div className="font-black uppercase tracking-tight">{title}</div>
                        <div className="text-xs text-slate-400 font-bold">{body}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setStep(2)} className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  {t('onboarding.chooseLanguage')} <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="accessibility" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-7">
                <div className="space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-green-300">{t('onboarding.stepOne')}</p>
                  <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">{t('onboarding.accessibilityTitle')}</h1>
                  <p className="text-slate-300 text-sm leading-relaxed font-bold">{t('onboarding.accessibilityHelp')}</p>
                </div>

                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => void updateSettings({ uiLanguage: 'en', captureLanguage: 'en' })} className={cn('rounded-2xl border px-4 py-4 font-black', settings.uiLanguage === 'en' ? 'bg-white text-slate-950' : 'bg-white/5 border-white/10')}>{t('common.english')}</button>
                    <button onClick={() => void updateSettings({ uiLanguage: 'es', captureLanguage: 'es' })} className={cn('rounded-2xl border px-4 py-4 font-black', settings.uiLanguage === 'es' ? 'bg-white text-slate-950' : 'bg-white/5 border-white/10')}>{t('common.spanish')}</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['light', 'dark', 'system'] as const).map((themeMode) => (
                      <button key={themeMode} onClick={() => void updateSettings({ themeMode })} className={cn('rounded-2xl border px-3 py-3 text-xs font-black uppercase', settings.themeMode === themeMode ? 'bg-green-400 text-slate-950' : 'bg-white/5 border-white/10')}>
                        {t(`settingsDetail.${themeMode}`)}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {(['small', 'normal', 'large', 'xl', 'xxl'] as const).map((textSize) => (
                      <button key={textSize} onClick={() => void updateSettings({ textSize })} className={cn('rounded-2xl border px-2 py-3 font-black', settings.textSize === textSize ? 'bg-green-400 text-slate-950' : 'bg-white/5 border-white/10')}>
                        Aa
                      </button>
                    ))}
                  </div>
                  <button onClick={() => void updateSettings({ voiceHelpEnabled: !settings.voiceHelpEnabled })} className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4 font-black uppercase tracking-widest">
                    {t('settingsDetail.voiceHelp')}: {settings.voiceHelpEnabled ? t('capture.on') : t('capture.off')}
                  </button>
                </div>

                <button onClick={() => setStep(3)} className="w-full bg-green-500 text-slate-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  {t('common.save')} <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="trade-specialty" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-7">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-orange-500/20 rounded-3xl flex items-center justify-center text-orange-300">
                    <Wrench size={28} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-300 mb-3">{t('onboarding.tradeWorkflow')}</p>
                    <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">{t('onboarding.pickJobType')}</h1>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed font-bold">{t('onboarding.tradeHelp')}</p>
                </div>

                <div className="grid gap-3">
                  {specialtyOptions.map((option) => {
                    const active = selectedTemplateId === option.templateId;
                    return (
                      <button key={option.templateId} type="button" onClick={() => setSelectedTemplateId(option.templateId)} className={cn('text-left rounded-3xl p-5 border transition-all', active ? 'bg-orange-500 text-slate-950 border-orange-300' : 'bg-white/5 text-white border-white/10')}>
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="font-black uppercase tracking-tight">{option.displayName}</div>
                            <div className={cn('text-xs font-bold mt-1', active ? 'text-slate-800' : 'text-slate-400')}>{t('onboarding.guided')}</div>
                          </div>
                          {active && <CheckCircle2 size={22} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button onClick={() => setStep(4)} className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  {t('onboarding.firstAction')} <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="first-job" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-7">
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-300">
                    <Zap size={28} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-300 mb-3">{t('onboarding.voiceStart')}</p>
                    <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">{t('onboarding.createByVoice')}</h1>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed font-bold">{t('onboarding.firstActionHelp')}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setFirstAction('bid')} className={cn('rounded-3xl border px-4 py-5 font-black uppercase tracking-widest', firstAction === 'bid' ? 'bg-white text-slate-950' : 'bg-white/5 border-white/10')}>{t('jobs.bidJob')}</button>
                  <button onClick={() => setFirstAction('approved')} className={cn('rounded-3xl border px-4 py-5 font-black uppercase tracking-widest', firstAction === 'approved' ? 'bg-white text-slate-950' : 'bg-white/5 border-white/10')}>{t('jobs.startApprovedJob')}</button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 space-y-4">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('onboarding.example')}</div>
                  <p className="text-white font-black italic leading-relaxed">"New generator install for Mike at 123 Main Street."</p>
                  <div className="relative">
                    <textarea rows={4} value={quickJobText} onChange={(event) => setQuickJobText(event.target.value)} placeholder={t('onboarding.createPlaceholder')} className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-5 py-4 pr-16 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                    <VoiceDictation onResult={(text) => setQuickJobText(text)} className="absolute right-3 top-3 bg-white/10 text-white hover:bg-blue-500 hover:text-white" isTextArea />
                  </div>
                </div>

                {quickJobText.trim() && (
                  <div className="bg-blue-600/10 border border-blue-500/20 rounded-3xl p-5 space-y-2">
                    <div className="text-[10px] font-black text-blue-300 uppercase tracking-widest">{t('onboarding.willCreate')}</div>
                    <div className="text-sm text-blue-50 font-bold">{t('onboarding.customer')}: {quickJobPreview.customerName}</div>
                    <div className="text-sm text-blue-50 font-bold">{t('onboarding.site')}: {quickJobPreview.address}</div>
                    <div className="text-sm text-blue-50 font-bold">{t('onboarding.workflow')}: {selectedTemplate.display_name}</div>
                  </div>
                )}

                {error && <div className="text-sm font-bold text-red-300 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">{error}</div>}

                <div className="flex gap-3">
                  <button onClick={() => setStep(3)} className="w-1/3 bg-white/5 text-white/60 py-5 rounded-2xl font-black uppercase tracking-widest hover:text-white transition-all">{t('onboarding.back')}</button>
                  <button onClick={createFirstJob} disabled={!quickJobText.trim() || loading} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-40">
                    {loading ? t('onboarding.creating') : t('onboarding.createOpenCamera')}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="capture" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 text-center">
                <div className="mx-auto w-20 h-20 bg-blue-500/20 rounded-[32px] flex items-center justify-center text-blue-300">
                  <Camera size={36} />
                </div>
                <div className="space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-300">{t('onboarding.readyCapture')}</p>
                  <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">{t('onboarding.organized')}</h1>
                  <p className="text-slate-300 text-base leading-relaxed font-bold">{t('onboarding.firstJobLive')}</p>
                </div>
                <button onClick={openCapture} className="w-full bg-white text-slate-950 py-6 rounded-[30px] text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3">
                  <Camera size={22} /> {t('onboarding.openCapture')}
                </button>
                <button onClick={() => createdJobId && navigate(`/job/${createdJobId}`, { replace: true })} className="w-full bg-white/5 text-white/70 py-4 rounded-2xl font-black uppercase tracking-widest hover:text-white transition-all">
                  {t('onboarding.reviewFirst')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-8 pb-7 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600">
          <Sparkles size={14} /> {t('onboarding.footer')}
        </div>
      </motion.div>
    </div>
  );
}
