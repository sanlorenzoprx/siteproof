import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Mic, X, Check, Loader2, Zap, ShieldCheck, Languages, Wrench, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { ProofCaptureService } from '../services/proofCaptureService';
import { SiteProofDataService } from '../services/siteProofDataService';
import { TemplateCatalogService } from '../services/templateCatalogService';
import { AIService } from '../services/aiService';
import { VoiceAIAnalysis, VoiceAIService } from '../services/voiceAIService';

import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AppSettingsService } from '../services/appSettingsService';
import { useSettings } from '../contexts/SettingsContext';

export function VoiceNoteCapture() {
  const { settings, updateSettings, t } = useSettings();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requirementId = searchParams.get('requirementId') || undefined;
  const stageId = searchParams.get('stageId') || undefined;
  const initialCategory = searchParams.get('category') || 'General';
  
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'done'>('idle');
  const [timer, setTimer] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<VoiceAIAnalysis | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [speechCalibrated, setSpeechCalibrated] = useState(false);

  useEffect(() => {
    let mounted = true;
    AppSettingsService.isSpeechCalibrated().then((value) => {
      if (mounted) setSpeechCalibrated(value);
    });
    return () => { mounted = false; };
  }, []);

  const categories = TemplateCatalogService.getCaptureCategories(templateId, requirementId).filter((value, index, arr) => arr.indexOf(value) === index);

  useEffect(() => {
    async function loadJobContext() {
      if (!id) return;
      const job = await SiteProofDataService.getJobById(id);
      setTemplateId(job?.templateId);
      const context = TemplateCatalogService.getRequirementContext(job?.templateId, requirementId);
      if (context) setCategory(context.requirement.display_name);
    }
    loadJobContext();
  }, [id, requirementId]);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/ogg')
          ? 'audio/ogg'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const fullBlob = new Blob(chunks, { type: mimeType });
        console.log(`VoiceNoteCapture: Audio captured, size: ${fullBlob.size} bytes`);
        
        if (fullBlob.size < 100) {
          setStatus('idle');
          return;
        }

        setAudioBlob(fullBlob);
        setStatus('processing');
        
        try {
          const reader = new FileReader();
          reader.readAsDataURL(fullBlob);
          reader.onloadend = async () => {
            const result = reader.result as string;
            const base64Audio = result.split(',')[1];
            const text = await AIService.transcribeAudio(base64Audio); 
            
            const transcript = (!text || text === '(Unintelligible)') ? (text || "No speech detected.") : text;
            setTranscribedText(transcript);
            setAnalysis(VoiceAIService.analyzeTranscript(transcript, settings.captureLanguage));
            setStatus('done');
          };
        } catch (e) {
          console.error(e);
          setStatus('idle');
        } finally {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setStatus('recording');
    } catch (e) {
      console.error("Microphone access denied", e);
      alert("Microphone access is required for voice notes.");
    }
  }

  async function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setIsRecording(false);
  }

  async function handleSave() {
    if (!id || !transcribedText) return;
    
    const finalAnalysis = analysis ?? VoiceAIService.analyzeTranscript(transcribedText, settings.captureLanguage);
    await ProofCaptureService.saveVoiceNote({
      jobId: id,
      transcribedText,
      audioBlob: audioBlob || undefined,
      category,
      requirementId,
      stageId,
      isIssue: finalAnalysis.isIssue,
      isChangeOrder: finalAnalysis.isChangeOrder,
      analysis: finalAnalysis,
    });
    navigate(`/job/${id}`);
  }

  function updateTranscript(value: string) {
    setTranscribedText(value);
    setAnalysis(VoiceAIService.analyzeTranscript(value, settings.captureLanguage));
  }

  const formatTimer = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col z-50 overflow-hidden font-sans">
      {/* Header */}
      <div className="p-4 flex items-center justify-between z-10">
        <button 
          onClick={() => navigate(`/job/${id}`)}
          className="p-2 bg-white/5 rounded-full text-white/50 hover:text-white"
        >
          <X size={24} />
        </button>
        <span className="text-white/30 text-xs font-bold uppercase tracking-[0.2em]">{t('voice.title')}</span>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-12">
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-6"
            >
              <div className="w-24 h-24 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto">
                <Mic className="text-blue-600" size={48} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white tracking-tight">{t('voice.speakNotes')}</h2>
                <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">
                  SiteProof will automatically transcribe your voice memos and add them to the job report.
                </p>
                <div className="flex justify-center gap-2">
                  <button onClick={() => void updateSettings({ captureLanguage: 'en' })} className={`px-3 py-2 rounded-xl text-xs font-black ${settings.captureLanguage === 'en' ? 'bg-white text-slate-950' : 'bg-white/10 text-white'}`}>English</button>
                  <button onClick={() => void updateSettings({ captureLanguage: 'es' })} className={`px-3 py-2 rounded-xl text-xs font-black ${settings.captureLanguage === 'es' ? 'bg-white text-slate-950' : 'bg-white/10 text-white'}`}>Español</button>
                </div>
                
                {speechCalibrated ? (
                  <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-4 py-2 rounded-xl mx-auto w-fit">
                    <ShieldCheck size={14} className="text-green-500" />
                    <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Optimized Voice Profile Active</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => navigate('/settings/speech')}
                    className="flex items-center gap-2 bg-blue-600/10 border border-blue-600/20 px-4 py-2 rounded-xl mx-auto w-fit hover:bg-blue-600/20 transition-all"
                  >
                    <Zap size={14} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Boost Accuracy: Calibrate Voice</span>
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {status === 'recording' && (
            <motion.div 
              key="recording"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 blur-3xl animate-pulse rounded-full" />
                <div className="text-6xl font-mono text-white tracking-tighter tabular-nums relative">
                  {formatTimer(timer)}
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span className="text-red-500 font-bold uppercase tracking-widest text-xs">Recording Live</span>
              </div>
            </motion.div>
          )}

          {status === 'processing' && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <Loader2 className="animate-spin text-blue-500 mx-auto" size={48} />
              <p className="text-white font-bold tracking-tight">Transcribing note...</p>
            </motion.div>
          )}

          {status === 'done' && (
            <motion.div 
              key="done"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md space-y-6"
            >
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-left space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest block">Transcribed Result</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Languages size={13} /> {analysis?.language === 'es' ? 'Spanish' : analysis?.language === 'en' ? 'English' : 'Auto'}
                  </span>
                </div>
                <textarea
                  value={transcribedText}
                  onChange={(event) => updateTranscript(event.target.value)}
                  className="w-full min-h-28 bg-slate-950/70 border border-white/10 rounded-2xl p-4 text-white text-base font-medium leading-relaxed outline-none focus:border-blue-500"
                />
                <p className="text-[11px] font-bold text-slate-500 mt-2">{t('capture.manualFallback')}</p>
              </div>

              {analysis && (
                <div className="grid grid-cols-1 gap-3 text-left">
                  <VoiceInsight title="Summary" icon={<ClipboardCheck size={16} />} items={[analysis.summary]} empty="No clear summary yet." />
                  <VoiceInsight title="Materials" icon={<Wrench size={16} />} items={analysis.materialMentions} empty="No materials detected." />
                  <VoiceInsight title="Issues" icon={<AlertTriangle size={16} />} items={analysis.issueMentions} empty="No issues detected." tone={analysis.issueMentions.length ? 'warning' : 'default'} />
                  <VoiceInsight title="Change Orders" icon={<Zap size={16} />} items={analysis.changeOrderCandidates} empty="No change-order language detected." tone={analysis.changeOrderCandidates.length ? 'warning' : 'default'} />
                  <VoiceInsight title="Customer Requests" icon={<Mic size={16} />} items={analysis.customerRequests} empty="No customer requests detected." />
                </div>
              )}
              
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Assign Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                        category === cat 
                          ? "bg-blue-600 border-blue-600 text-white" 
                          : "bg-white/5 border-white/10 text-white/50"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="p-12 flex justify-center sticky bottom-0 z-10">
        {status === 'idle' && (
          <button 
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_0_8px_rgba(255,255,255,0.1)] active:scale-95 transition-transform"
          >
            <Mic className="text-slate-900" size={36} />
          </button>
        )}

        {status === 'recording' && (
          <div className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
            Release to Transcribe
          </div>
        )}

        {status === 'done' && (
          <div className="flex gap-4 w-full max-w-sm">
            <button 
              onClick={() => { setStatus('idle'); setTranscribedText(''); setAnalysis(null); setAudioBlob(null); }}
              className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl border border-white/10"
            >
              Discard
            </button>
            <button 
              onClick={handleSave}
              className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              <Check size={20} />
              Attach Note
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function VoiceInsight({
  title,
  icon,
  items,
  empty,
  tone = 'default',
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  empty: string;
  tone?: 'default' | 'warning';
}) {
  const visibleItems = items.filter(Boolean);
  return (
    <div className={cn(
      'border rounded-2xl p-4',
      tone === 'warning' ? 'bg-orange-500/10 border-orange-500/20' : 'bg-white/5 border-white/10',
    )}>
      <div className={cn(
        'flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2',
        tone === 'warning' ? 'text-orange-300' : 'text-slate-400',
      )}>
        {icon}
        {title}
      </div>
      {visibleItems.length === 0 ? (
        <p className="text-xs font-bold text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {visibleItems.map((item, index) => (
            <li key={`${title}-${index}`} className="text-xs font-bold text-white leading-relaxed">• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
