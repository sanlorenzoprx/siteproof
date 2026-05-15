import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Mic,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import { SiteProofDataService } from '../services/siteProofDataService';
import { AppSettingsService } from '../services/appSettingsService';
import { JobWorkflowService } from '../services/jobWorkflowService';
import { TemplateCatalogService } from '../services/templateCatalogService';
import { BusinessProfile, UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { VoiceDictation } from './VoiceDictation';
import { cn } from '../lib/utils';
import { SITEPROOF_BRAND } from '../config/brand';
import { useSettings } from '../contexts/SettingsContext';

interface OnboardingProps {
  onComplete?: () => void;
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5;

const tradeOptions = TemplateCatalogService.getTemplateOptions();

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

function parseQuickJob(text: string, selectedTemplateId: string) {
  const selected = TemplateCatalogService.getTemplate(selectedTemplateId);
  const forMatch = text.match(/\bfor\s+(.+?)(?:\s+at\s+|$)/i);
  const atMatch = text.match(/\bat\s+(.+)$/i);
  const customerName = forMatch?.[1]?.trim() || firstWords(text, 'New Customer');
  const address = atMatch?.[1]?.trim() || 'GPS Auto / Field Site';

  return {
    customerName,
    address,
    jobType: selected.display_name,
    templateId: selected.template_id,
    notes: text.trim(),
  };
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useSettings();
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [voiceSample, setVoiceSample] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('generator_install_v1');
  const [quickJobText, setQuickJobText] = useState('');
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => TemplateCatalogService.getTemplate(selectedTemplateId),
    [selectedTemplateId],
  );

  const quickJobPreview = useMemo(
    () => parseQuickJob(quickJobText, selectedTemplateId),
    [quickJobText, selectedTemplateId],
  );

  async function completeVoiceTuning() {
    await AppSettingsService.setSpeechCalibrated(true);
    await AppSettingsService.setValue('onboarding_voice_sample', voiceSample || 'Skipped voice sample');
    setStep(3);
  }

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
      await AppSettingsService.setValue('primary_trade_template_id', selectedTemplateId);
      await AppSettingsService.setValue('onboarding_completed_at', new Date().toISOString());

      const job = await JobWorkflowService.createJob({
        ...quickJobPreview,
        status: 'ACTIVE',
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] bg-blue-600/15 blur-[130px] rounded-full" />
        <div className="absolute top-[35%] right-[5%] w-[30%] h-[30%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[45%] h-[45%] bg-purple-600/10 blur-[130px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-[40px] shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <motion.div
            className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.55)]"
            animate={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        <div className="p-7 md:p-10">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-300">
                    <ShieldCheck size={28} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-300 mb-3">{SITEPROOF_BRAND.appName}</p>
                    <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter leading-none uppercase">
                      {t('onboarding.documentJob')}
                    </h1>
                  </div>
                  <p className="text-slate-300 text-base leading-relaxed font-bold">
                    {SITEPROOF_BRAND.elevatorPitch}
                  </p>
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

                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-50 transition-all active:scale-95"
                >
                  {t('onboarding.tune')} <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-7"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-green-500/20 rounded-3xl flex items-center justify-center text-green-300">
                    <Mic size={28} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-green-300 mb-3">{t('onboarding.stepOne')}</p>
                    <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">{t('onboarding.tune')} to your voice</h1>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed font-bold">
                    {t('onboarding.tuneVoiceHelp')}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 space-y-4">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('onboarding.trySaying')}</div>
                  <p className="text-white font-black italic leading-relaxed">
                    “Installed transfer switch, checked grounding, customer requested extra conduit on west wall.”
                  </p>
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={voiceSample}
                      onChange={(event) => setVoiceSample(event.target.value)}
                      placeholder="{t('onboarding.samplePlaceholder')}"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-5 py-4 pr-16 text-white font-bold focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    />
                    <VoiceDictation
                      onResult={(text) => setVoiceSample(text)}
                      className="absolute right-3 top-3 bg-white/10 text-white hover:bg-green-500 hover:text-white"
                      isTextArea
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(3)}
                    className="w-1/3 bg-white/5 text-white/60 py-5 rounded-2xl font-black uppercase tracking-widest hover:text-white transition-all"
                  >
                    {t('onboarding.skip')}
                  </button>
                  <button
                    onClick={completeVoiceTuning}
                    className="flex-1 bg-green-500 text-slate-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-400 transition-all active:scale-95"
                  >
                    {t('onboarding.voiceTuned')} <ArrowRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="trade"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-7"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-orange-500/20 rounded-3xl flex items-center justify-center text-orange-300">
                    <Wrench size={28} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-orange-300 mb-3">{t('onboarding.tradeWorkflow')}</p>
                    <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">{t('onboarding.pickJobType')}</h1>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed font-bold">
                    {t('onboarding.tradeHelp')}
                  </p>
                </div>

                <div className="grid gap-3">
                  {tradeOptions.map((option) => {
                    const active = selectedTemplateId === option.templateId;
                    return (
                      <button
                        key={option.templateId}
                        type="button"
                        onClick={() => setSelectedTemplateId(option.templateId)}
                        className={cn(
                          'text-left rounded-3xl p-5 border transition-all active:scale-[0.99]',
                          active
                            ? 'bg-orange-500 text-slate-950 border-orange-300 shadow-xl shadow-orange-500/20'
                            : 'bg-white/5 text-white border-white/10 hover:bg-white/10',
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <div className="font-black uppercase tracking-tight">{option.displayName}</div>
                            <div className={cn('text-xs font-bold mt-1', active ? 'text-slate-800' : 'text-slate-400')}>
                              Guided proof checklist · offline-ready · export-ready
                            </div>
                          </div>
                          {active && <CheckCircle2 size={22} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setStep(4)}
                  className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-50 transition-all active:scale-95"
                >
                  {t('onboarding.createFirstJob')} <ArrowRight size={20} />
                </button>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="first-job"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-7"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-blue-500/20 rounded-3xl flex items-center justify-center text-blue-300">
                    <Zap size={28} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-300 mb-3">{t('onboarding.voiceStart')}</p>
                    <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">{t('onboarding.createByVoice')}</h1>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed font-bold">
                    {t('onboarding.plainLanguage')}
                  </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[28px] p-5 space-y-4">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('onboarding.example')}</div>
                  <p className="text-white font-black italic leading-relaxed">
                    “New generator install for Mike at 123 Main Street.”
                  </p>
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={quickJobText}
                      onChange={(event) => setQuickJobText(event.target.value)}
                      placeholder="{t('onboarding.createPlaceholder')}"
                      className="w-full bg-slate-950/60 border border-white/10 rounded-2xl px-5 py-4 pr-16 text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                    <VoiceDictation
                      onResult={(text) => setQuickJobText(text)}
                      className="absolute right-3 top-3 bg-white/10 text-white hover:bg-blue-500 hover:text-white"
                      isTextArea
                    />
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
                  <button
                    onClick={() => setStep(3)}
                    className="w-1/3 bg-white/5 text-white/60 py-5 rounded-2xl font-black uppercase tracking-widest hover:text-white transition-all"
                  >
                    {t('onboarding.back')}
                  </button>
                  <button
                    onClick={createFirstJob}
                    disabled={!quickJobText.trim() || loading}
                    className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500 transition-all active:scale-95 disabled:opacity-40"
                  >
                    {loading ? t('onboarding.creating') : t('onboarding.createOpenCamera')}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="capture"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8 text-center"
              >
                <div className="mx-auto w-20 h-20 bg-blue-500/20 rounded-[32px] flex items-center justify-center text-blue-300">
                  <Camera size={36} />
                </div>
                <div className="space-y-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.28em] text-blue-300">{t('onboarding.readyCapture')}</p>
                  <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">
                    {t('onboarding.organized')}
                  </h1>
                  <p className="text-slate-300 text-base leading-relaxed font-bold">
                    Your first job is live. The next screen opens directly into capture so the first emotional experience is proof in motion — not paperwork.
                  </p>
                </div>
                <button
                  onClick={openCapture}
                  className="w-full bg-white text-slate-950 py-6 rounded-[30px] text-lg font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-50 transition-all active:scale-95"
                >
                  <Camera size={22} /> {t('onboarding.openCapture')}
                </button>
                <button
                  onClick={() => createdJobId && navigate(`/job/${createdJobId}`, { replace: true })}
                  className="w-full bg-white/5 text-white/70 py-4 rounded-2xl font-black uppercase tracking-widest hover:text-white transition-all"
                >
                  {t('onboarding.reviewFirst')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-8 pb-7 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600">
          <Sparkles size={14} /> Less typing · Better proof · Faster payment
        </div>
      </motion.div>
    </div>
  );
}
