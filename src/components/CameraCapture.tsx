import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Camera, RefreshCw, X, Check, MapPin, Loader2, Zap, Mic, Video } from 'lucide-react';
import { SiteProofDataService } from '../services/siteProofDataService';
import { ProofCaptureService } from '../services/proofCaptureService';
import { TemplateCatalogService } from '../services/templateCatalogService';
import { AIService } from '../services/aiService';
import { JobDocumentCaptureRuntime } from '../services/jobDocumentCaptureRuntime';
import { JobDocumentType } from '../db/schema';

import { cn } from '../lib/utils';
import { MediaPipelineService } from '../services/mediaPipelineService';
import { useSettings } from '../contexts/SettingsContext';
import { HintCard } from './HintCard';
import { HintService } from '../services/hintService';
import {
  CaptureErrorCode,
  CaptureMode,
  CaptureIssueType,
  buildPhotoContextTranscript,
  buildPhotoDescriptionTranscript,
  classifyCameraError,
  formatCaptureGpsStatus,
  getIssueTypeOptions,
  getInitialCaptureMode,
  getPrimaryCaptureLabelKey,
  getReadyStatusKey,
  getUseCaptureLabelKey,
} from './cameraCaptureModel';

const modeDefaultCategoryKey: Record<CaptureMode, string> = {
  photo: 'capture.photoEvidenceCategory',
  video: 'capture.videoEvidenceCategory',
  document: 'capture.documentEvidenceCategory',
};

export function CameraCapture() {
  const { settings, t } = useSettings();
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
  const documentMode = searchParams.get('document') === '1';
  const initialCaptureMode = getInitialCaptureMode(documentMode);
  const documentType = (searchParams.get('documentType') || 'permit_document') as JobDocumentType;
  const returnTab = searchParams.get('returnTab') || 'proof';
  const [captureMode, setCaptureMode] = useState<CaptureMode>(initialCaptureMode);
  const [category, setCategory] = useState(searchParams.get('category') || t('capture.modePhoto'));
  const [description, setDescription] = useState('');
  const [captureError, setCaptureError] = useState<CaptureErrorCode | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordedVideoBlob, setRecordedVideoBlob] = useState<Blob | null>(null);
  const [recordedVideoMimeType, setRecordedVideoMimeType] = useState('video/webm');
  const [recordedVideoDurationMs, setRecordedVideoDurationMs] = useState(0);
  const [recordedVideoThumbnail, setRecordedVideoThumbnail] = useState<string | null>(null);
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(null);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [videoTimer, setVideoTimer] = useState(0);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<{ lat: number, lng: number, accuracy?: number } | null>(null);
  const [burstMode, setBurstMode] = useState(false);
  const [isIssue, setIsIssue] = useState(searchParams.get('category') === 'Change Order' || searchParams.get('category') === 'Deficiency');
  const [issueType, setIssueType] = useState<CaptureIssueType>(
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
  const videoChunksRef = useRef<Blob[]>([]);
  const videoStartedAtRef = useRef(0);
  const [isRecordingDescription, setIsRecordingDescription] = useState(false);
  const [descriptionTimer, setDescriptionTimer] = useState(0);
  const [isTranscribingDescription, setIsTranscribingDescription] = useState(false);
  const [descriptionVoiceText, setDescriptionVoiceText] = useState('');
  const [descriptionAudioBlob, setDescriptionAudioBlob] = useState<Blob | null>(null);
  const [descriptionRecorder, setDescriptionRecorder] = useState<MediaRecorder | null>(null);
  const descriptionAudioChunksRef = useRef<Blob[]>([]);
  const [captureFeedback, setCaptureFeedback] = useState(false);
  const [showAdvancedCapture, setShowAdvancedCapture] = useState(settings.uxMode === 'advanced');
  const [showVoiceTuningHint, setShowVoiceTuningHint] = useState(false);
  const [descriptionTranscriptionIssue, setDescriptionTranscriptionIssue] = useState(false);

  const categories = TemplateCatalogService.getCaptureCategories(templateId, requirementId, settings.uiLanguage);
  const hasRequirementContext = Boolean(requirementId || searchParams.get('category'));
  const hasCapturedMedia = Boolean(capturedImage || recordedVideoUrl);
  const maxVideoDurationSeconds = Math.max(30, Math.min(60, Math.round(settings.videoDefaults.maxVideoDurationSeconds || 60)));

  function getModeDefaultCategory(mode: CaptureMode) {
    return t(modeDefaultCategoryKey[mode]);
  }

  function getModeContextLabel() {
    if (captureMode === 'photo') return t('capture.capturingPhotoFor');
    if (captureMode === 'document') return t('capture.capturingDocumentFor');
    return t('capture.capturingVideoFor');
  }

  function getModePurposeText() {
    if (captureMode === 'photo') return t('capture.photoPurpose');
    if (captureMode === 'document') return t('capture.documentPurpose');
    return t('capture.videoPurpose');
  }

  function getCaptureErrorMessage(code: CaptureErrorCode) {
    switch (code) {
      case 'camera_permission_denied':
        return t('capture.cameraPermissionDenied');
      case 'camera_unavailable':
        return t('capture.cameraUnavailable');
      case 'video_unsupported':
        return t('capture.videoUnsupported');
      case 'save_failed':
        return t('capture.saveFailed');
      case 'description_save_failed':
        return t('capture.descriptionSaveFailed');
      default:
        return t('capture.genericCaptureError');
    }
  }

  function clearCapturedMedia() {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    setCapturedImage(null);
    setRecordedVideoUrl(null);
    setRecordedVideoBlob(null);
    setRecordedVideoDurationMs(0);
    setRecordedVideoThumbnail(null);
    setDescription('');
    setDescriptionVoiceText('');
    setDescriptionAudioBlob(null);
    setIsRecordingVideo(false);
  }

  function getSupportedAudioMimeType() {
    if (MediaRecorder.isTypeSupported('audio/webm')) return 'audio/webm';
    if (MediaRecorder.isTypeSupported('audio/ogg')) return 'audio/ogg';
    return 'audio/mp4';
  }

  function getSupportedVideoMimeType() {
    const preferred = settings.videoDefaults.preferredMimeTypes.length
      ? settings.videoDefaults.preferredMimeTypes
      : ['video/webm', 'video/mp4'];
    const supported = preferred.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
    return supported ?? 'video/webm';
  }

  function canRecordVideo() {
    return settings.videoDefaults.videoEnabled && typeof MediaRecorder !== 'undefined';
  }

  function playCaptureClick() {
    try {
      const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;
      const audioContext = new AudioContextConstructor();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(360, audioContext.currentTime + 0.08);
      gain.gain.setValueAtTime(0.55, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
      window.setTimeout(() => void audioContext.close(), 160);
    } catch (error) {
      console.warn('capture_click_unavailable', error);
    }
  }

  function runCaptureFeedback() {
    playCaptureClick();
    setCaptureFeedback(true);
    window.setTimeout(() => setCaptureFeedback(false), 180);
  }

  function selectCaptureMode(mode: CaptureMode) {
    clearCapturedMedia();
    setCaptureMode(mode);
    setCaptureError(mode === 'video' && !canRecordVideo() ? 'video_unsupported' : null);
    if (mode !== 'photo') setBurstMode(false);
    if (!hasRequirementContext) setCategory(getModeDefaultCategory(mode));
  }

  function CaptureModeSelector() {
    const modes: Array<{ key: CaptureMode; label: string }> = [
      { key: 'photo', label: t('capture.modePhoto') },
      { key: 'video', label: t('capture.modeVideo') },
      { key: 'document', label: t('capture.modeDocument') },
    ];

    return (
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label={t('capture.modeSelectorLabel')}>
        {modes.map((mode) => (
          <button
            key={mode.key}
            type="button"
            onClick={() => selectCaptureMode(mode.key)}
            className={cn(
              'py-3 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all',
              captureMode === mode.key
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                : 'bg-white/5 border-white/10 text-white/60'
            )}
            aria-pressed={captureMode === mode.key}
          >
            {mode.label}
          </button>
        ))}
      </div>
    );
  }

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
          const context = TemplateCatalogService.getRequirementContext(j.templateId, requirementId, settings.uiLanguage);
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
  }, [id, requirementId, settings.uiLanguage]);

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
          audio: captureMode === 'video',
        });
        if (!mounted) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error('camera_start_failed', err);
        setCaptureError(classifyCameraError(err));
        setPermissionError(t('capture.cameraError'));
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
  }, [captureMode, facingMode, id, navigate]);

  useEffect(() => {
    return () => {
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    };
  }, [recordedVideoUrl]);

  useEffect(() => {
    let interval: any;
    if (isRecordingVoice) {
      interval = setInterval(() => setVoiceTimer(t => t + 1), 1000);
    } else {
      setVoiceTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVoice]);

  useEffect(() => {
    let interval: any;
    if (isRecordingVideo) {
      interval = setInterval(() => setVideoTimer((current) => current + 1), 1000);
    } else {
      setVideoTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingVideo]);

  useEffect(() => {
    let interval: any;
    if (isRecordingDescription) {
      interval = setInterval(() => setDescriptionTimer((current) => current + 1), 1000);
    } else {
      setDescriptionTimer(0);
    }
    return () => clearInterval(interval);
  }, [isRecordingDescription]);

  useEffect(() => {
    let mounted = true;
    if (!hasCapturedMedia) {
      setShowVoiceTuningHint(false);
      return;
    }

    async function loadVoiceTuningHint() {
      if (descriptionTranscriptionIssue) {
        if (mounted) setShowVoiceTuningHint(true);
        return;
      }
      const shouldShow = await HintService.shouldShow({
        hintId: 'voice-tuning-capture',
        screen: 'camera',
        type: 'learning',
        textKey: 'hints.voiceTuningBody',
        maxShows: 3,
      }, settings);
      if (!mounted) return;
      setShowVoiceTuningHint(shouldShow);
      if (shouldShow) void HintService.markShown('voice-tuning-capture');
    }

    void loadVoiceTuningHint();
    return () => {
      mounted = false;
    };
  }, [hasCapturedMedia, descriptionTranscriptionIssue, settings.hintMode]);

  async function toggleVoiceRecording() {
    if (isRecordingVoice) {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      setIsRecordingVoice(false);
    } else {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const mimeType = getSupportedAudioMimeType();

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
            const text = await AIService.transcribeAudio(base64Audio, settings.captureLanguage, mimeType);
            
            if (id && text && text !== '(Unintelligible)') {
              await ProofCaptureService.saveVoiceNote({
                jobId: id,
                transcribedText: buildPhotoContextTranscript(category, text, t),
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
        setPermissionError(t('capture.microphoneRequired'));
      }
    }
  }

  async function toggleDescriptionRecording() {
    if (isRecordingDescription) {
      if (descriptionRecorder && descriptionRecorder.state !== 'inactive') {
        descriptionRecorder.stop();
      }
      setIsRecordingDescription(false);
      return;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(audioStream, { mimeType });
      descriptionAudioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) descriptionAudioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(descriptionAudioChunksRef.current, { type: mimeType });
        audioStream.getTracks().forEach((track) => track.stop());
        if (audioBlob.size < 100) return;

        setIsTranscribingDescription(true);
        try {
          const result = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => resolve(String(reader.result || ''));
          });
          const base64Audio = result.split(',')[1] || '';
          const text = await AIService.transcribeAudio(base64Audio, settings.captureLanguage, mimeType);
          const cleanText = text.trim();
          if (cleanText && !/unintelligible|unavailable/i.test(cleanText)) {
            setDescription((current) => [current.trim(), cleanText].filter(Boolean).join('\n'));
            setDescriptionVoiceText(cleanText);
            setDescriptionAudioBlob(audioBlob);
            setDescriptionTranscriptionIssue(false);
          } else {
            setDescriptionTranscriptionIssue(true);
          }
        } catch (err) {
          console.error('description_transcription_failed', err);
          setDescriptionTranscriptionIssue(true);
          setCaptureError('description_save_failed');
        } finally {
          setIsTranscribingDescription(false);
        }
      };

      recorder.start();
      setDescriptionRecorder(recorder);
      setIsRecordingDescription(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      setPermissionError(t('capture.microphoneRequired'));
    }
  }

  async function startVideoRecording() {
    if (!canRecordVideo() || !stream) {
      setCaptureError('video_unsupported');
      return;
    }

    try {
      const mimeType = getSupportedVideoMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      videoChunksRef.current = [];
      videoStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) videoChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const durationMs = Math.max(0, Date.now() - videoStartedAtRef.current);
        const videoBlob = new Blob(videoChunksRef.current, { type: mimeType });
        if (videoBlob.size < 100) {
          setCaptureError('video_unsupported');
          setIsRecordingVideo(false);
          return;
        }

        const maxBytes = settings.videoDefaults.maxVideoFileSizeMb * 1024 * 1024;
        if (videoBlob.size > maxBytes) {
          setCaptureError('save_failed');
          setIsRecordingVideo(false);
          return;
        }

        const localUrl = URL.createObjectURL(videoBlob);
        const thumbnail = settings.videoDefaults.generateVideoThumbnail
          ? await MediaPipelineService.generateVideoThumbnail(videoBlob)
          : null;
        runCaptureFeedback();
        setRecordedVideoBlob(videoBlob);
        setRecordedVideoMimeType(mimeType);
        setRecordedVideoDurationMs(durationMs);
        setRecordedVideoThumbnail(thumbnail);
        setRecordedVideoUrl(localUrl);
        setIsRecordingVideo(false);
      };

      setCaptureError(null);
      setVideoRecorder(recorder);
      setIsRecordingVideo(true);
      recorder.start(1000);
      window.setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, maxVideoDurationSeconds * 1000);
    } catch (err) {
      console.error('video_record_start_failed', err);
      setCaptureError('video_unsupported');
      setIsRecordingVideo(false);
    }
  }

  function stopVideoRecording() {
    if (videoRecorder && videoRecorder.state !== 'inactive') {
      videoRecorder.stop();
    }
    setIsRecordingVideo(false);
  }

  function takePhoto() {
    if (captureMode === 'video') {
      void startVideoRecording();
      return;
    }

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
        runCaptureFeedback();
        setCapturedImage(dataUrl);

        // Burst mode bypasses captions by design and stays photo-only for Phase 9.
        if (burstMode && captureMode === 'photo') {
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

    if (documentMode) {
      await JobDocumentCaptureRuntime.captureDocument({
        jobId: id,
        title: category,
        documentType,
        sourceType: 'camera_capture',
        stepId: requirementId,
        localUri: dataUrl,
        fileName: `${category.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.jpg`,
        mimeType: blob?.type || 'image/jpeg',
        fileSize: blob?.size ?? dataUrl.length,
        notes: 'Document saved as image. You can add a note later.',
      });
    } else {
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
    }
    // Visual feedback for burst
    const video = videoRef.current;
    if (video) {
       video.classList.add('opacity-50');
       setTimeout(() => video.classList.remove('opacity-50'), 100);
    }
    setCapturedImage(null);
  }

  async function saveCapture(notes: string) {
    if (!id || (!capturedImage && !recordedVideoBlob)) return;
    setSaving(true);
    setCaptureError(null);

    try {
      if (captureMode === 'video') {
        await ProofCaptureService.saveVideo({
          jobId: id,
          blob: recordedVideoBlob!,
          localUrl: recordedVideoUrl ?? undefined,
          thumbnailDataUrl: recordedVideoThumbnail,
          durationMs: recordedVideoDurationMs,
          mimeType: recordedVideoMimeType,
          category,
          requirementId,
          stageId,
          latitude: location?.lat,
          longitude: location?.lng,
          notes: notes.trim() || undefined,
        });
      } else if (captureMode === 'document') {
        if (!capturedImage || !canvasRef.current) return;
        const blob = await new Promise<Blob | null>(resolve =>
          canvasRef.current?.toBlob(resolve, 'image/jpeg', 0.9)
        );
        await JobDocumentCaptureRuntime.captureDocument({
          jobId: id,
          title: category,
          documentType,
          sourceType: 'camera_capture',
          stepId: requirementId,
          localUri: capturedImage,
          fileName: `${category.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.jpg`,
          mimeType: blob?.type || 'image/jpeg',
          fileSize: blob?.size ?? capturedImage.length,
          notes: notes.trim() || undefined,
        });
      } else {
        if (!capturedImage || !canvasRef.current) return;
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
          notes: notes.trim() || undefined,
          isIssue,
          issueType: isIssue ? issueType : undefined,
        });
      }

      if (descriptionVoiceText.trim()) {
        await ProofCaptureService.saveVoiceNote({
          jobId: id,
          transcribedText: buildPhotoDescriptionTranscript(category, descriptionVoiceText.trim(), t),
          audioBlob: descriptionAudioBlob || undefined,
          category,
          requirementId,
          stageId,
          isIssue: captureMode === 'photo' ? isIssue : false,
          isChangeOrder: captureMode === 'photo' && issueType === 'CHANGE_ORDER',
        });
      }

      // If we came from a specific checklist step, go back to checklist
      if (searchParams.get('category')) {
        navigate(`/job/${id}?tab=${encodeURIComponent(returnTab)}`);
      } else {
        clearCapturedMedia();
      }
    } catch (err) {
      console.error('capture_save_failed', err);
      setCaptureError('save_failed');
    } finally {
      setSaving(false);
    }
  }

  function handlePrimaryCapture() {
    if (captureMode === 'video') {
      if (isRecordingVideo) stopVideoRecording();
      else void startVideoRecording();
      return;
    }
    takePhoto();
  }

  async function handleSave() {
    await saveCapture(description);
  }

  async function handleSkipDescription() {
    await saveCapture('');
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
          {captureMode === 'photo' && showAdvancedCapture && (
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
              {t('capture.burst')} {burstMode ? t('capture.on') : t('capture.off')}
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/10">
            <MapPin size={14} className={location ? "text-green-400" : "text-slate-400"} />
            {formatCaptureGpsStatus(location, t)}
          </div>
        </div>
      </div>

      {/* Viewport */}
      <div
        className={cn(
          "flex-1 relative flex items-center justify-center bg-slate-900 transition-transform duration-150",
          captureFeedback && "scale-[0.8]"
        )}
      >
        {!hasCapturedMedia ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
        ) : recordedVideoUrl ? (
          <video
            src={recordedVideoUrl}
            poster={recordedVideoThumbnail ?? undefined}
            controls
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img 
            src={capturedImage ?? ''}
            className="w-full h-full object-cover" 
          />
        )}
        {captureFeedback && (
          <div className="absolute inset-0 z-20 bg-white/45" />
        )}
        <canvas ref={canvasRef} className="hidden" />
        {permissionError && (
          <div
            role="alert"
            aria-live="assertive"
            className="absolute left-4 right-4 top-4 mx-4 mt-4 text-sm font-bold text-red-700 bg-red-50 border border-red-300 rounded-xl px-4 py-3 flex items-center gap-2"
          >
            <span>⚠</span> {permissionError}
          </div>
        )}
        {!hasCapturedMedia && (
          <div className="absolute left-4 right-4 bottom-4 bg-black/45 backdrop-blur-md border border-white/10 rounded-3xl p-4 text-white">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-200 mb-1">{getModeContextLabel()}</div>
            <div className="text-lg font-black leading-tight">{captureMode === 'video' ? getModeDefaultCategory('video') : category}</div>
            <div className="text-xs text-white/75 font-bold mt-1">{getModePurposeText()}</div>
            {captureHint && <div className="text-xs text-white/70 font-semibold mt-1 leading-relaxed">{captureHint}</div>}
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-slate-900/90 backdrop-blur-xl border-t border-white/5 p-6 space-y-6">
        <CaptureModeSelector />
        {settings.uxMode === 'simple' && (
          <HintCard
            hint={{
              hintId: 'capture-caption',
              screen: 'camera',
              type: 'learning',
              textKey: 'hints.captureCaption',
              maxShows: 3,
            }}
          />
        )}
        {captureError && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/15 p-4 text-sm font-bold text-red-100">
            {getCaptureErrorMessage(captureError)}
            {(captureError === 'camera_permission_denied' || captureError === 'camera_unavailable') && (
              <button
                type="button"
                onClick={() => navigate(`/job/${id}`)}
                className="mt-3 w-full rounded-xl bg-white/10 px-4 py-3 text-white"
              >
                {t('capture.openJobWithoutCamera')}
              </button>
            )}
          </div>
        )}
        {!hasCapturedMedia ? (
          <>
            {showAdvancedCapture && (
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
            )}

            {captureMode === 'video' && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-white/75 space-y-2">
                <div>{t('capture.videoPurpose')}</div>
                <div>{t('capture.videoDurationLimit')}: {maxVideoDurationSeconds}s</div>
                {isRecordingVideo && (
                  <div className="text-red-100">{t('capture.recording')} {videoTimer}s</div>
                )}
              </div>
            )}

            <div className="flex items-center justify-center gap-4">
              {showAdvancedCapture && (
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
              )}
              <button
                onClick={handlePrimaryCapture}
                className={cn(
                  "min-h-20 flex-1 bg-white rounded-2xl flex items-center justify-center gap-3 px-5 shadow-[0_0_0_4px_rgba(255,255,255,0.2)] active:scale-95 transition-transform text-slate-900 font-black uppercase tracking-widest border-4 border-blue-300",
                  isRecordingVideo && "bg-red-50 border-red-300 text-red-700 animate-pulse"
                )}
              >
                {captureMode === 'video' ? <Video size={28} /> : <Camera className="text-slate-900" size={28} />}
                <span className="text-sm">{t(getPrimaryCaptureLabelKey(captureMode, isRecordingVideo))}</span>
              </button>
              <button onClick={() => setFacingMode((current) => current === 'environment' ? 'user' : 'environment')} className="text-white/50 p-2" aria-label={t('capture.switchCamera')}>
                <RefreshCw size={24} />
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-white">
              <span className="text-sm font-bold uppercase tracking-widest text-white/50">{t(getReadyStatusKey(captureMode))}</span>
              <span className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase italic tracking-tight">{category}</span>
            </div>
            {settings.uxMode === 'simple' && (
              <button
                type="button"
                onClick={() => setShowAdvancedCapture((current) => !current)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 py-3 text-xs font-black uppercase tracking-widest text-white/60"
              >
                {showAdvancedCapture ? t('settingsDetail.simpleMode') : t('settingsDetail.advancedMode')}
              </button>
            )}

            {captureMode === 'photo' && showAdvancedCapture && (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap size={18} className={cn(isIssue ? "text-orange-500 fill-orange-500" : "text-white/20")} />
                  <span className="text-xs font-bold text-white uppercase italic">{t('capture.deficiencyQuestion')}</span>
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
                  {getIssueTypeOptions(t).map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setIssueType(type.value)}
                      className={cn(
                        "py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border",
                        issueType === type.value
                          ? "bg-orange-500 border-orange-500 text-white" 
                          : "bg-white/5 border-white/10 text-white/40"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            <div>
              {showVoiceTuningHint && (
                <div className="mb-4 rounded-2xl border border-green-400/30 bg-green-500/15 p-4 text-green-50">
                  <div className="flex items-start gap-3">
                    <Mic size={20} className="shrink-0 mt-0.5 text-green-200" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black uppercase tracking-widest">{t('hints.voiceTuningTitle')}</div>
                      <p className="mt-1 text-sm font-bold text-green-50/85">
                        {descriptionTranscriptionIssue ? t('hints.voiceTuningIssueBody') : t('hints.voiceTuningBody')}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => navigate('/settings/speech')}
                          className="rounded-xl bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-950"
                        >
                          {t('common.yes')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowVoiceTuningHint(false);
                            if (!descriptionTranscriptionIssue) void HintService.dismiss('voice-tuning-capture');
                          }}
                          className="rounded-xl bg-white/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-white"
                        >
                          {t('common.no')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-xs font-black uppercase tracking-widest text-white/60">
                  {t('capture.descriptionLabel')}
                </label>
                <span className="text-[10px] font-black uppercase tracking-widest text-white/45">
                  {settings.captureLanguage === 'es' ? t('common.spanish') : t('common.english')}
                </span>
              </div>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t('capture.descriptionPlaceholder')}
                className="w-full min-h-24 rounded-2xl bg-white/10 border border-white/10 text-white placeholder:text-white/35 p-4 text-base outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={toggleDescriptionRecording}
                disabled={isTranscribingDescription}
                className={cn(
                  "mt-3 w-full min-h-12 rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                  isRecordingDescription
                    ? "bg-red-500 border-red-500 text-white animate-pulse"
                    : "bg-white/5 border-white/10 text-white"
                )}
              >
                {isTranscribingDescription ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Mic size={18} />
                )}
                {isTranscribingDescription
                  ? t('capture.transcribingDescription')
                  : isRecordingDescription
                    ? `${t('capture.stopDescriptionRecording')} ${descriptionTimer}s`
                    : t('capture.dictateDescription')}
              </button>
              {descriptionVoiceText && (
                <div className="mt-2 text-xs font-bold text-green-200">
                  {t('capture.descriptionAudioReady')}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                onClick={clearCapturedMedia}
                className="py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors"
              >
                {t('capture.retake')}
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="py-4 bg-blue-600 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 sm:col-span-2"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <Check size={20} />
                    <span>{t('capture.saveToJob')}</span>
                    <span className="text-white/70">({t(getUseCaptureLabelKey(captureMode))})</span>
                  </>
                )}
              </button>
              <button
                onClick={handleSkipDescription}
                disabled={saving}
                className="py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors sm:col-span-3"
              >
                {t('capture.skipDescription')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
