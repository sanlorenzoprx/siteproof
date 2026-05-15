import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, RefreshCw, X, Check, MapPin, Loader2, Zap, Mic } from 'lucide-react';
import { SiteProofDataService } from '../services/siteProofDataService';
import { ProofCaptureService } from '../services/proofCaptureService';
import { TemplateCatalogService } from '../services/templateCatalogService';
import { AIService } from '../services/aiService';

import { cn } from '../lib/utils';
import { MediaPipelineService } from '../services/mediaPipelineService';

export function CameraCapture() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const requirementId = searchParams.get('requirementId') || undefined;
  const stageId = searchParams.get('stageId') || undefined;
  const [category, setCategory] = useState(searchParams.get('category') || 'Photo');
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number, accuracy?: number } | null>(null);
  const [burstMode, setBurstMode] = useState(false);
  const [isIssue, setIsIssue] = useState(searchParams.get('category') === 'Change Order' || searchParams.get('category') === 'Deficiency');
  const [issueType, setIssueType] = useState<'SAFETY' | 'DEFICIENCY' | 'CHANGE_ORDER' | 'BLOCKED'>(
    searchParams.get('category') === 'Change Order' ? 'CHANGE_ORDER' : 'DEFICIENCY'
  );
  const [jobName, setJobName] = useState('Jobsite');
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [brandName, setBrandName] = useState('SITEPROOF');
  const [captureHint, setCaptureHint] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const categories = TemplateCatalogService.getCaptureCategories(templateId, requirementId);

  useEffect(() => {
    async function loadJob() {
      if (id) {
        const [j, profile] = await Promise.all([
          SiteProofDataService.getJobById(id),
          SiteProofDataService.getBusinessProfile(),
        ]);
        if (profile?.companyName) setBrandName(profile.companyName);
        if (j) {
          setJobName(j.customerName);
          setTemplateId(j.templateId);
          const context = TemplateCatalogService.getRequirementContext(j.templateId, requirementId);
          if (context) {
            setCategory(context.requirement.display_name);
            setCaptureHint(context.requirement.capture_hint || context.requirement.field_instruction || null);
          }
        }
      }
    }
    loadJob();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      }, () => {
        console.warn("Location access denied");
      }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
    }
  }, [id, requirementId]);

  useEffect(() => {
    let mounted = true;

    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (!mounted) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error('Camera access denied', err);
        alert('Could not access camera. Please check permissions.');
        navigate(`/job/${id}`);
      }
    }

    startCamera();
    return () => {
      mounted = false;
      setStream((current) => {
        current?.getTracks().forEach((t) => t.stop());
        return null;
      });
    };
  }, [facingMode, id, navigate]);

  useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      interval = setInterval(() => setVoiceTimer(t => t + 1), 1000);
    } else {
      setVoiceTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  async function toggleVoiceRecording() {
    if (isRecordingVoice) {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      setIsRecordingVoice(false);
    } else {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
          ? 'audio/webm' 
          : MediaRecorder.isTypeSupported('audio/ogg')
            ? 'audio/ogg'
            : 'audio/mp4';

        const recorder = new MediaRecorder(audioStream, { mimeType });
        audioChunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log(`CameraCapture: Voice tag captured, size: ${audioBlob.size} bytes`);
          
          if (audioBlob.size < 100) return;

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const result = reader.result as string;
            const base64Audio = result.split(',')[1];
            const text = await AIService.transcribeAudio(base64Audio);
            
            if (id && text && text !== '(Unintelligible)') {
              await ProofCaptureService.saveVoiceNote({
                jobId: id,
                transcribedText: `[Photo context: ${category}] ${text}`,
                audioBlob,
                category,
                requirementId,
                stageId,
              });
            }
            // Cleanup stream
            audioStream.getTracks().forEach(track => track.stop());
          };
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecordingVoice(true);
      } catch (err) {
        console.error("Microphone access denied", err);
        alert("Microphone required for voice tags.");
      }
    }
  }

  function takePhoto() {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // High res capture
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 1. Draw frame
        ctx.drawImage(video, 0, 0);
        
        MediaPipelineService.applyMetadataOverlay(canvas, {
          brand: brandName,
          jobName,
          category,
          latitude: location?.lat,
          longitude: location?.lng,
        });

        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setCapturedImage(dataUrl);

        // 3. Burst Mode (10X Improvement D)
        if (burstMode) {
          saveDirectly(dataUrl);
        }
      }
    }
  }

  async function saveDirectly(dataUrl: string) {
    if (!id || !canvasRef.current) return;
    
    // Convert canvas to high-quality blob for storage
    const blob = await new Promise<Blob | null>(resolve => 
      canvasRef.current?.toBlob(resolve, 'image/jpeg', 0.9)
    );

    await ProofCaptureService.savePhoto({
      jobId: id,
      dataUrl,
      blob: blob || undefined,
      category,
      requirementId,
      stageId,
      latitude: location?.lat,
      longitude: location?.lng,
      isIssue,
      issueType: isIssue ? issueType : undefined,
    });
    // Visual feedback for burst
    const video = videoRef.current;
    if (video) {
       video.classList.add('opacity-50');
       setTimeout(() => video.classList.remove('opacity-50'), 100);
    }
    setCapturedImage(null);
  }

  async function handleSave() {
    if (!id || !capturedImage || !canvasRef.current) return;
    setSaving(true);

    const blob = await new Promise<Blob | null>(resolve => 
      canvasRef.current?.toBlob(resolve, 'image/jpeg', 0.9)
    );

    await ProofCaptureService.savePhoto({
      jobId: id,
      dataUrl: capturedImage,
      blob: blob || undefined,
      category,
      requirementId,
      stageId,
      latitude: location?.lat,
      longitude: location?.lng,
      isIssue,
      issueType: isIssue ? issueType : undefined,
    });
    setSaving(false);
    
    // If we came from a specific checklist step, go back to checklist
    if (searchParams.get('category')) {
      navigate(`/job/${id}?tab=proof`);
    } else {
      setCapturedImage(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50 overflow-hidden font-sans">
      {/* Top Bar */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/50 to-transparent">
        <button 
          onClick={() => navigate(`/job/${id}`)}
          className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white"
        >
          <X size={24} />
        </button>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setBurstMode(!burstMode)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border transition-all",
              burstMode 
                ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/40" 
                : "bg-black/20 border-white/10 text-white/50"
            )}
          >
            <Zap size={14} className={burstMode ? "fill-white" : ""} />
            Burst {burstMode ? "ON" : "OFF"}
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/10">
            <MapPin size={14} className={location ? "text-green-400" : "text-slate-400"} />
            {location ? `GPS Locked${location.accuracy ? ` ±${Math.round(location.accuracy)}m` : ''}` : "Locating..."}
          </div>
        </div>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative flex items-center justify-center bg-slate-900">
        {!capturedImage ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
        ) : (
          <img 
            src={capturedImage} 
            className="w-full h-full object-cover" 
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        {!capturedImage && (
          <div className="absolute left-4 right-4 bottom-4 bg-black/45 backdrop-blur-md border border-white/10 rounded-3xl p-4 text-white">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200 mb-1">Capturing proof for</div>
            <div className="text-lg font-black leading-tight">{category}</div>
            {captureHint && <div className="text-xs text-white/70 font-semibold mt-1 leading-relaxed">{captureHint}</div>}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-t border-white/5 p-6 space-y-6">
        {!capturedImage ? (
          <>
            <div className="overflow-x-auto no-scrollbar">
              <div className="flex gap-2 min-w-max">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border",
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

            <div className="flex items-center justify-center gap-12">
              <button 
                onClick={toggleVoiceRecording}
                className={cn(
                  "w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all border",
                  isRecordingVoice ? "bg-red-500 border-red-500 text-white animate-pulse" : "bg-white/5 border-white/10 text-white/50"
                )}
              >
                <Mic size={20} />
                {isRecordingVoice && <span className="text-[8px] font-black">{voiceTimer}s</span>}
              </button>
              <button 
                onClick={takePhoto}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_0_4px_rgba(255,255,255,0.2)] active:scale-90 transition-transform"
              >
                <div className="w-16 h-16 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center">
                  <Camera className="text-slate-900" size={32} />
                </div>
              </button>
              <button onClick={() => setFacingMode((current) => current === 'environment' ? 'user' : 'environment')} className="text-white/50 p-2" aria-label="Switch camera">
                <RefreshCw size={24} />
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-white">
              <span className="text-sm font-bold uppercase tracking-widest text-white/50">Capture Context</span>
              <span className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-tight">{category}</span>
            </div>

            {/* Issue Tagging UI (10X Upgrade) */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap size={18} className={cn(isIssue ? "text-orange-500 fill-orange-500" : "text-white/20")} />
                  <span className="text-xs font-bold text-white uppercase italic">Deficiency or Issue?</span>
                </div>
                <button 
                  onClick={() => setIsIssue(!isIssue)}
                  className={cn(
                    "w-12 h-6 rounded-full p-1 transition-all",
                    isIssue ? "bg-orange-500" : "bg-white/20"
                  )}
                >
                  <div className={cn("w-4 h-4 bg-white rounded-full transition-all", isIssue ? "translate-x-6" : "translate-x-0")} />
                </button>
              </div>

              {isIssue && (
                <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-2">
                  {(['SAFETY', 'DEFICIENCY', 'CHANGE_ORDER', 'BLOCKED'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setIssueType(type)}
                      className={cn(
                        "py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border",
                        issueType === type 
                          ? "bg-orange-500 border-orange-500 text-white" 
                          : "bg-white/5 border-white/10 text-white/40"
                      )}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setCapturedImage(null)}
                className="py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors"
              >
                Retake
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <Check size={20} />
                    Save Photo
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
