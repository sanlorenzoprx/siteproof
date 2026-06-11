import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  Camera,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Circle,
  Download,
  FileText,
  MapPin,
  Mic,
  MoreVertical,
  Wrench,
  Languages,
  Mail,
  MessageSquare,
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { SiteProofDataService } from '../services/siteProofDataService';
import { PdfService } from '../services/pdfService';
import { APP_REPORT_TYPES, BID_REPORT_TYPES, SiteProofReportType } from '../features/export/reportTypes';
import { BidMetric, Job, JobPhoto, VoiceNote } from '../domain/models';
import { RuntimeOrchestrator, RuntimeSnapshot } from '../services/runtimeOrchestrator';
import { ChecklistItem, ProofRequirement, WorkflowStageTemplate, WorkflowTemplate } from '../templates/workflowTemplate.types';
import { TemplateCatalogService } from '../services/templateCatalogService';
import { cn } from '../lib/utils';
import { ReportLanguageToggle } from './reports/ReportLanguageToggle';
import { useSettings } from '../contexts/SettingsContext';
import { useInspectionReadiness } from '../hooks/useInspectionReadiness';
import { InspectionReadyCard } from './inspection/InspectionReadyCard';
import { MissingProofList } from './inspection/MissingProofList';
import { QualityWarningsPanel } from './inspection/QualityWarningsPanel';
import { ReadyForInspectionBanner } from './inspection/ReadyForInspectionBanner';
import { InspectionIssue } from '../features/inspection/inspectionReadinessService';
import { ExportPacketService } from '../features/export/exportPacketService';
import { ExportPacket } from '../db/schema';
import { proofRepository } from '../db/repositories/proofRepository';
import { MediaPipelineService } from '../services/mediaPipelineService';
import { TimelinePlayback } from './timeline/TimelinePlayback';
import { LicenseService } from '../services/licenseService';
import { SignaturePad } from './SignaturePad';
import { SignatureRecord, SignatureService } from '../services/signatureService';
import { JobDocumentQuickCapture } from './JobDocumentQuickCapture';
import { MissingProofDetectionService, MissingProofWarning } from '../services/missingProofDetectionService';
import { ProReportManifestBuilder } from '../services/proReportManifestBuilder';
import { ProReportType } from '../templates/tradeTemplatePack.types';
import { ReportShareService } from '../features/export/reportShareService';
import { JobWorkflowService } from '../services/jobWorkflowService';
import { HintCard } from './HintCard';
import { BidMetricEditor } from './bidding/BidMetricEditor';
import { BidPrivacyBanner } from './bidding/BidPrivacyBanner';
import { BidReportActions } from './bidding/BidReportActions';

type DetailView = 'proof' | 'photos' | 'notes' | 'timeline' | 'export';
const ProofSection = lazy(() => import('./jobDetailSections/ProofSection'));
const PhotosSection = lazy(() => import('./jobDetailSections/PhotosSection'));
const NotesSection = lazy(() => import('./jobDetailSections/NotesSection'));
const TimelineSection = lazy(() => import('./jobDetailSections/TimelineSection'));
const ExportSection = lazy(() => import('./jobDetailSections/ExportSection'));

function getTemplateForJob(job: Job | null, uiLanguage: 'en' | 'es'): WorkflowTemplate | null {
  return TemplateCatalogService.getTemplate(job?.templateId, uiLanguage);
}

function requirementCapturePath(jobId: string, requirement: ProofRequirement, stageId?: string): string {
  const params = new URLSearchParams({
    category: requirement.display_name,
    requirementId: requirement.requirement_id,
  });
  if (stageId) params.set('stageId', stageId);
  if (requirement.proof_type === 'voice_note' || requirement.proof_type === 'text_note') {
    return `/job/${jobId}/voice?${params.toString()}`;
  }
  return `/job/${jobId}/camera?${params.toString()}`;
}

function toProReportType(reportType: SiteProofReportType): ProReportType {
  switch (reportType) {
    case SiteProofReportType.CUSTOMER_COMPLETION:
      return 'customer_completion';
    case SiteProofReportType.INSPECTION_READINESS:
      return 'inspection_readiness';
    case SiteProofReportType.CHANGE_ORDER_EVIDENCE:
      return 'change_order_evidence';
    case SiteProofReportType.PAYMENT_FINAL_HANDOFF:
      return 'payment_handoff';
    case SiteProofReportType.PHOTO_PROOF_TIMELINE:
      return 'photo_timeline';
    case SiteProofReportType.OFFICE_INTERNAL_RECORD:
      return 'office_internal_record';
    case SiteProofReportType.ALL_REPORTS:
      return 'all_pro_reports';
    default:
      return 'office_internal_record';
  }
}

export function JobDetail() {
  const { settings, t } = useSettings();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [job, setJob] = useState<Job | null>(null);
  const [photos, setPhotos] = useState<JobPhoto[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<RuntimeSnapshot | null>(null);
  const [activeView, setActiveView] = useState<DetailView>((searchParams.get('tab') as DetailView) || 'proof');
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<SiteProofReportType>(SiteProofReportType.CUSTOMER_COMPLETION);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [exportPackets, setExportPackets] = useState<ExportPacket[]>([]);
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [shareRecipient, setShareRecipient] = useState('');
  const [shareError, setShareError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [documentCaptureSource, setDocumentCaptureSource] = useState<'setup' | 'checklist' | 'final' | null>(
    searchParams.get('document') === 'setup' ? 'setup' : null,
  );
  const [missingProofWarnings, setMissingProofWarnings] = useState<MissingProofWarning[]>([]);
  const [showMissingProofReview, setShowMissingProofReview] = useState(false);
  const [showCustomerBidConfirm, setShowCustomerBidConfirm] = useState(false);
  const [bidDraft, setBidDraft] = useState({
    scopeSummary: '',
    customerSummary: '',
    internalNotes: '',
    metrics: [] as BidMetric[],
    assumptions: '',
    exclusions: '',
    paymentTerms: '',
    estimateExpiresAt: '',
    finalEstimateText: '',
  });

  useEffect(() => {
    async function load() {
      if (!id) return;
      const jobData = await SiteProofDataService.getJobById(id);
      if (!jobData) {
        navigate('/');
        return;
      }

      const [photosData, notesData, snapshot, syncState, exportsData, signatureData] = await Promise.all([
        SiteProofDataService.getPhotos(id),
        SiteProofDataService.getVoiceNotes(id),
        SiteProofDataService.getRuntimeSnapshot(id),
        SiteProofDataService.getSyncState(),
        ExportPacketService.getPacketHistory(id),
        SignatureService.getByJob(id),
      ]);

      setJob(jobData);
      setBidDraft({
        scopeSummary: jobData.bidScopeSummary || jobData.notes || '',
        customerSummary: jobData.bidCustomerNotes || '',
        internalNotes: jobData.bidInternalNotes || '',
        metrics: jobData.bidMetrics ?? [],
        assumptions: jobData.bidAssumptions || settings.biddingDefaults.defaultAssumptions.join('\n'),
        exclusions: jobData.bidExclusions || settings.biddingDefaults.defaultExclusions.join('\n'),
        paymentTerms: jobData.bidPaymentTerms || settings.biddingDefaults.paymentTerms,
        estimateExpiresAt: jobData.bidEstimateExpiresAt || '',
        finalEstimateText: jobData.bidFinalEstimateText || '',
      });
      if (jobData.mode === 'bid') setSelectedReportType(SiteProofReportType.INTERNAL_BID_REPORT);
      setPhotos(photosData);
      setVoiceNotes(notesData);
      setRuntimeSnapshot(snapshot);
      setPendingSyncCount(syncState.pendingCount || 0);
      setExportPackets(exportsData.sort((a, b) => b.generated_at.localeCompare(a.generated_at)));
      setSignatures(signatureData);

      const template = getTemplateForJob(jobData, settings.uiLanguage);
      if (template) {
        setExpandedStages(
          Object.fromEntries(
            template.stages
              .filter((stage) => stage.visible_in_field_mode)
              .map((stage, index) => [stage.stage_id, index < 3]),
          ),
        );
      }
    }
    load();
  }, [id, navigate, settings.biddingDefaults.defaultAssumptions, settings.biddingDefaults.defaultExclusions, settings.biddingDefaults.paymentTerms, settings.uiLanguage]);

  const template = useMemo(() => getTemplateForJob(job, settings.uiLanguage), [job, settings.uiLanguage]);
  const visibleStages = useMemo(
    () => (template?.stages ?? []).filter((stage) => stage.visible_in_field_mode),
    [template],
  );

  const proofByRequirement = useMemo(() => {
    const map = new Map<string, number>();
    for (const proof of runtimeSnapshot?.proofs ?? []) {
      if (!proof.requirement_id) continue;
      map.set(proof.requirement_id, (map.get(proof.requirement_id) ?? 0) + 1);
    }
    return map;
  }, [runtimeSnapshot]);

  const stageRuntimeByTemplateId = useMemo(() => {
    const map = new Map<string, NonNullable<RuntimeSnapshot['stages']>[number]>();
    for (const stage of runtimeSnapshot?.stages ?? []) {
      map.set(stage.template_stage_id, stage);
    }
    return map;
  }, [runtimeSnapshot]);

  const proofScore = runtimeSnapshot?.proofScore ?? 0;
  const requiredCount = runtimeSnapshot?.requiredCount ?? 0;
  const completedRequiredCount = runtimeSnapshot?.completedRequiredCount ?? 0;
  const missingRequired = runtimeSnapshot?.missingRequired ?? [];
  const issueCount = photos.filter((photo) => photo.isIssue).length + voiceNotes.filter((note) => note.isIssue || note.isChangeOrder).length;
  const { readiness } = useInspectionReadiness(job?.id, (runtimeSnapshot?.proofs.length ?? 0) + (runtimeSnapshot?.stages.length ?? 0));

  const requirementById = useMemo(() => {
    const map = new Map<string, { requirement: ProofRequirement; stage: WorkflowStageTemplate }>();
    for (const stage of visibleStages) {
      for (const requirement of stage.proof_requirements ?? []) {
        map.set(requirement.requirement_id, { requirement, stage });
      }
    }
    return map;
  }, [visibleStages]);

  function captureInspectionIssue(issue: InspectionIssue) {
    const entry = requirementById.get(issue.requirement_id ?? '');
    if (!entry) {
      navigate(`/job/${job!.id}/camera?category=${encodeURIComponent(issue.title)}`);
      return;
    }
    navigate(requirementCapturePath(job!.id, entry.requirement, entry.stage.stage_id));
  }

  if (!job || !template) return null;

  async function saveBidDetails(markCustomerApproved = false) {
    if (!job) return;
    const updated: Job = {
      ...job,
      notes: bidDraft.scopeSummary,
      bidScopeSummary: bidDraft.scopeSummary,
      bidCustomerNotes: bidDraft.customerSummary,
      bidInternalNotes: bidDraft.internalNotes,
      bidMetrics: bidDraft.metrics,
      bidAssumptions: bidDraft.assumptions,
      bidExclusions: bidDraft.exclusions,
      bidPaymentTerms: bidDraft.paymentTerms,
      bidEstimateExpiresAt: bidDraft.estimateExpiresAt,
      bidFinalEstimateText: bidDraft.finalEstimateText,
      bidEstimateApprovedForCustomer: markCustomerApproved ? true : job.bidEstimateApprovedForCustomer,
    };
    await SiteProofDataService.saveJob(updated);
    setJob(updated);
  }

  async function generateBidReport(reportType: SiteProofReportType.INTERNAL_BID_REPORT | SiteProofReportType.CUSTOMER_BID_REPORT) {
    if (!job) return;
    await saveBidDetails(reportType === SiteProofReportType.CUSTOMER_BID_REPORT);
    setSelectedReportType(reportType);
    await handleGenerateSelectedReport(true, reportType);
  }

  async function handleGenerateSelectedReport(skipMissingProofReview = false, overrideReportType?: SiteProofReportType) {
    const targetReportType = overrideReportType ?? selectedReportType;
    const licenseState = await LicenseService.getLicenseState();
    setReportError(null);
    if (!LicenseService.canGenerateReport(licenseState)) {
      navigate('/license');
      return;
    }
    const isBidReport = targetReportType === SiteProofReportType.INTERNAL_BID_REPORT || targetReportType === SiteProofReportType.CUSTOMER_BID_REPORT;
    if (!skipMissingProofReview && !isBidReport) {
      const warnings = await MissingProofDetectionService.getWarnings(job!);
      if (warnings.length > 0) {
        setMissingProofWarnings(warnings.sort((a, b) => Number(b.required) - Number(a.required)));
        setShowMissingProofReview(true);
        setActiveView('export');
        return;
      }
    }
    setGeneratingReport(true);
    try {
      await ProReportManifestBuilder.build(job!, toProReportType(selectedReportType));
      const signatureDataUrl = signatures.find((signature) => signature.signerRole === 'customer')?.signatureDataUrl;
      if (!isBidReport) await ProReportManifestBuilder.build(job!, toProReportType(targetReportType));
      if (targetReportType === SiteProofReportType.ALL_REPORTS) {
        await PdfService.generateAllAppReports(job!, settings.exportLanguage, {}, signatureDataUrl);
      } else {
        await PdfService.generateAppReport(job!, targetReportType, signatureDataUrl, settings.exportLanguage);
      }
      const nextExports = await ExportPacketService.getPacketHistory(job!.id);
      setExportPackets(nextExports.sort((a, b) => b.generated_at.localeCompare(a.generated_at)));
    } catch (error) {
      console.error(error);
      setReportError(t('jobDetail.reportFailed'));
    } finally {
      setGeneratingReport(false);
    }
  }

  function captureMissingProof(warning: MissingProofWarning) {
    setShowMissingProofReview(false);
    navigate(`/job/${job!.id}/camera?category=${encodeURIComponent(warning.title)}&requirementId=${encodeURIComponent(warning.stepId)}&returnTab=export`);
  }

  async function markWarningNotNeeded(warning: MissingProofWarning) {
    await MissingProofDetectionService.markNotNeeded(job!, warning.stepId, 'Marked not needed during pre-report review.');
    setMissingProofWarnings((current) => current.filter((item) => item.stepId !== warning.stepId));
  }

  async function generateAnywayFromReview() {
    await Promise.all(
      missingProofWarnings.map((warning) =>
        MissingProofDetectionService.generateAnyway(job!, warning.stepId, 'Missing-proof warning ignored before Pro Report generation.'),
      ),
    );
    setShowMissingProofReview(false);
    setMissingProofWarnings([]);
    await handleGenerateSelectedReport(true);
  }

  async function sharePacket(packet: ExportPacket, channel: 'email' | 'sms') {
    const recipient = shareRecipient.trim() || ReportShareService.defaultRecipientForChannel(job!, channel);
    if (!recipient) {
      setShareError(channel === 'email' ? t('jobDetail.shareEmailRequired') : t('jobDetail.sharePhoneRequired'));
      return;
    }
    setShareError(null);
    const target = channel === 'email'
      ? ReportShareService.buildEmailTarget(packet, job!, recipient)
      : ReportShareService.buildSmsTarget(packet, job!, recipient);
    if (!target) {
      setShareError(t('jobDetail.shareNoLink'));
      return;
    }
    await ReportShareService.markShared(packet, target).catch((error) => console.warn('Report share status update failed:', error));
    const nextExports = await ExportPacketService.getPacketHistory(job!.id);
    setExportPackets(nextExports.sort((a, b) => b.generated_at.localeCompare(a.generated_at)));
    window.location.href = target.href;
  }

  async function completeChecklistItem(stage: WorkflowStageTemplate, item: ChecklistItem) {
    const runtimeStage = stageRuntimeByTemplateId.get(stage.stage_id);
    await proofRepository.createProof({
      job_id: job!.id,
      stage_instance_id: runtimeStage?.stage_instance_id ?? null,
      requirement_id: item.checklist_id,
      proof_type: 'checklist_item',
      title: item.display_name,
      description: item.description,
      required_flag: item.blocks_stage_completion,
      priority: item.priority,
      export_tags: item.export_tags,
      notes: null,
      metadata: {
        checklist_item: true,
        blocks_stage_completion: item.blocks_stage_completion,
      },
    });
    const snapshot = await RuntimeOrchestrator.recomputeJobCompletion(job!.id);
    setRuntimeSnapshot(snapshot);
  }

  async function completeJob() {
    if (!job) return;
    await SiteProofDataService.saveJob({ ...job, status: 'COMPLETED' });
    navigate('/');
  }

  async function convertBidToApprovedJob() {
    if (!job) return;
    const updated = await JobWorkflowService.convertBidToApprovedJob(job);
    setJob(updated);
  }

  const currentStage = visibleStages.find((stage) => {
    const runtime = stageRuntimeByTemplateId.get(stage.stage_id);
    return runtime?.status !== 'complete';
  }) ?? visibleStages[visibleStages.length - 1];
  const isBid = job.mode === 'bid';
  const reportOptions = isBid ? BID_REPORT_TYPES : ([...APP_REPORT_TYPES, SiteProofReportType.ALL_REPORTS] as const);
  const inspectionReportBlocked = selectedReportType === SiteProofReportType.INSPECTION_READINESS
    && (readiness?.blocking_items.length ?? missingRequired.length) > 0;
  const isSimpleMode = settings.uxMode === 'simple';

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="bg-white border-b border-slate-200 px-5 py-5 md:px-10 md:py-7">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-500 transition-all"
              aria-label={t('jobDetail.backJobs')}
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-4xl font-black text-slate-950 tracking-tight">{job.customerName}</h1>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest">
                  {template.display_name}
                </span>
                <span className={cn(
                  'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                  job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600',
                )}>
                  {job.status}
                </span>
                {isBid && (
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest">
                    {t('jobDetail.bidWorkspace')}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-500" />{job.address}</span>
                <span className="flex items-center gap-1.5"><FileText size={14} className="text-slate-400" />{job.jobType}</span>
                {pendingSyncCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-orange-600">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    {pendingSyncCount} {t('jobDetail.waitingSync')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {t('jobDetail.savedLocally')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate(`/job/${job.id}/camera?category=${encodeURIComponent(currentStage?.display_name ?? t('jobDetail.generalPhoto'))}`)}
              className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center gap-2"
            >
              <Camera size={18} /> {t('jobDetail.takePhoto')}
            </button>
            <button
              onClick={() => setActiveView('export')}
              className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <Download size={18} /> {t('jobDetail.generatePacket')}
            </button>
            <button
              onClick={async () => {
                if (confirm(t('jobDetail.deleteConfirm'))) {
                  await SiteProofDataService.deleteJob(job.id);
                  navigate('/');
                }
              }}
              className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-red-500 transition-all"
              aria-label={t('jobDetail.deleteJob')}
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-5 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <main className="lg:col-span-8 space-y-6">
            {isSimpleMode && (
              <section className="bg-white rounded-[32px] border border-slate-200 p-5 shadow-sm space-y-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{isBid ? t('jobDetail.bidWorkspace') : t('jobDetail.whatAdd')}</p>
                  <h2 className="text-2xl font-black text-slate-950">{job.customerName}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button onClick={() => navigate(`/job/${job.id}/camera?mode=photo`)} className="min-h-20 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"><Camera size={18} />{t('capture.modePhoto')}</button>
                  <button onClick={() => navigate(`/job/${job.id}/camera?document=1`)} className="min-h-20 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"><FileText size={18} />{t('capture.modeDocument')}</button>
                  <button onClick={() => navigate(`/job/${job.id}/voice`)} className="min-h-20 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"><Mic size={18} />{t('jobDetail.notes')}</button>
                  <button onClick={() => navigate(`/job/${job.id}/camera?mode=video`)} className="min-h-20 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"><Camera size={18} />{t('capture.modeVideo')}</button>
                </div>
                {isBid ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button onClick={() => { setSelectedReportType(SiteProofReportType.INTERNAL_BID_REPORT); setActiveView('export'); }} className="rounded-2xl bg-slate-900 px-4 py-4 text-white text-xs font-black uppercase tracking-widest">{t('jobDetail.createInternalBidReport')}</button>
                    <button onClick={() => setShowCustomerBidConfirm(true)} className="rounded-2xl bg-amber-50 px-4 py-4 text-amber-800 text-xs font-black uppercase tracking-widest">{t('jobDetail.createCustomerBidReport')}</button>
                    <button onClick={() => void convertBidToApprovedJob()} className="rounded-2xl bg-blue-600 px-4 py-4 text-white text-xs font-black uppercase tracking-widest">{t('jobDetail.convertApprovedJob')}</button>
                  </div>
                ) : (
                  <button onClick={() => setActiveView('export')} className="w-full rounded-2xl bg-slate-900 px-5 py-4 text-white text-xs font-black uppercase tracking-widest">{t('jobDetail.generatePacket')}</button>
                )}
              </section>
            )}
            {isBid && (
              <HintCard
                hint={{
                  hintId: 'bid-privacy-default',
                  screen: 'jobDetail',
                  type: 'privacy',
                  textKey: 'hints.bidPrivacy',
                  maxShows: 8,
                }}
              />
            )}
            {isBid && (
              <section className="bg-white rounded-[32px] border border-slate-200 p-5 md:p-6 shadow-sm space-y-5">
                <BidPrivacyBanner text={t('jobDetail.bidPrivacyWarning')} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('jobDetail.bidScopeSummary')}</span>
                    <textarea
                      value={bidDraft.scopeSummary}
                      onChange={(event) => setBidDraft((current) => ({ ...current, scopeSummary: event.target.value }))}
                      className="w-full min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('jobDetail.bidCustomerSummary')}</span>
                    <textarea
                      value={bidDraft.customerSummary}
                      onChange={(event) => setBidDraft((current) => ({ ...current, customerSummary: event.target.value }))}
                      className="w-full min-h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold"
                    />
                  </label>
                </div>
                <label className="block space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('jobDetail.bidInternalNotes')}</span>
                  <textarea
                    value={bidDraft.internalNotes}
                    onChange={(event) => setBidDraft((current) => ({ ...current, internalNotes: event.target.value }))}
                    className="w-full min-h-24 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950"
                  />
                </label>
                <BidMetricEditor
                  metrics={bidDraft.metrics}
                  onChange={(metrics) => setBidDraft((current) => ({ ...current, metrics }))}
                  t={t}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['assumptions', 'assumptions'],
                    ['exclusions', 'exclusions'],
                    ['paymentTerms', 'paymentTerms'],
                    ['finalEstimateText', 'finalEstimate'],
                    ['estimateExpiresAt', 'estimateExpiration'],
                  ].map(([field, label]) => (
                    <label key={field} className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t(`jobDetail.${label}`)}</span>
                      {field === 'estimateExpiresAt' ? (
                        <input
                          type="date"
                          value={bidDraft.estimateExpiresAt}
                          onChange={(event) => setBidDraft((current) => ({ ...current, estimateExpiresAt: event.target.value }))}
                          className="w-full min-h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold"
                        />
                      ) : (
                        <textarea
                          value={bidDraft[field as keyof typeof bidDraft] as string}
                          onChange={(event) => setBidDraft((current) => ({ ...current, [field]: event.target.value }))}
                          className="w-full min-h-20 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold"
                        />
                      )}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => void saveBidDetails()}
                    className="min-h-12 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white"
                  >
                    {t('jobDetail.saveBid')}
                  </button>
                  <div className="sm:col-span-2">
                    <BidReportActions
                      disabled={generatingReport}
                      onInternal={() => void generateBidReport(SiteProofReportType.INTERNAL_BID_REPORT)}
                      onCustomer={() => setShowCustomerBidConfirm(true)}
                      t={t}
                    />
                  </div>
                </div>
              </section>
            )}
            <InspectionReadyCard readiness={readiness} />

            {readiness?.blocking_items.length ? (
              <MissingProofList
                groupedItems={readiness.grouped_blocking_items}
                onCaptureIssue={captureInspectionIssue}
                getRequirement={(requirementId) => requirementById.get(requirementId ?? '')?.requirement}
              />
            ) : null}

            {readiness?.warning_items.length ? (
              <QualityWarningsPanel groupedItems={readiness.grouped_warning_items} />
            ) : null}

            {documentCaptureSource === 'setup' ? (
              <JobDocumentQuickCapture
                job={job}
                source="setup"
                onSaved={() => setDocumentCaptureSource(null)}
                onClose={() => setDocumentCaptureSource(null)}
              />
            ) : null}

            <div className="flex gap-2 p-1.5 bg-slate-200/60 rounded-2xl w-fit overflow-x-auto no-scrollbar">
              {[
                { id: 'proof', label: t('jobDetail.proof') },
                { id: 'photos', label: `${t('jobDetail.photos')} (${photos.length})` },
                { id: 'notes', label: `${t('jobDetail.notes')} (${voiceNotes.length})` },
                { id: 'timeline', label: t('jobDetail.timeline') },
                { id: 'export', label: t('jobDetail.export') },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as DetailView)}
                  className={cn(
                    'px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap',
                    activeView === tab.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeView === 'proof' && (
              <Suspense fallback={null}>
                <ProofSection
                  job={job}
                  documentCaptureSource={documentCaptureSource}
                  setDocumentCaptureSource={setDocumentCaptureSource}
                  visibleStages={visibleStages}
                  stageRuntimeByTemplateId={stageRuntimeByTemplateId}
                  proofByRequirement={proofByRequirement}
                  expandedStages={expandedStages}
                  onToggleStage={(stageId) => setExpandedStages((current) => ({ ...current, [stageId]: !(current[stageId] ?? false) }))}
                  onCaptureRequirement={(stage, requirement) => navigate(requirementCapturePath(job.id, requirement, stage.stage_id))}
                  onCompleteChecklistItem={(stage, item) => void completeChecklistItem(stage, item)}
                  t={t}
                />
              </Suspense>
            )}

            {activeView === 'photos' && (
              <Suspense fallback={null}>
                <PhotosSection
                  photos={photos}
                  onOpenCamera={() => navigate(`/job/${job.id}/camera`)}
                  t={t}
                />
              </Suspense>
            )}

            {activeView === 'notes' && (
              <Suspense fallback={null}>
                <NotesSection
                  voiceNotes={voiceNotes}
                  onRecordVoiceNote={() => navigate(`/job/${job.id}/voice`)}
                  t={t}
                />
              </Suspense>
            )}

            {activeView === 'timeline' && (
              <Suspense fallback={null}>
                <TimelineSection jobId={job.id} />
              </Suspense>
            )}

            {activeView === 'export' && (
              <Suspense fallback={null}>
                <ExportSection
                  job={job}
                  selectedReportType={selectedReportType}
                  reportOptions={reportOptions}
                  onChangeSelectedReportType={(next) => setSelectedReportType(next)}
                  inspectionReportBlocked={inspectionReportBlocked}
                  showMissingProofReview={showMissingProofReview}
                  missingProofWarnings={missingProofWarnings}
                  onCaptureMissingProof={captureMissingProof}
                  onMarkWarningNotNeeded={(warning) => void markWarningNotNeeded(warning)}
                  onGenerateAnywayFromReview={() => void generateAnywayFromReview()}
                  generatingReport={generatingReport}
                  onGenerateReport={() => {
                    if (selectedReportType === SiteProofReportType.CUSTOMER_BID_REPORT) setShowCustomerBidConfirm(true);
                    else void handleGenerateSelectedReport();
                  }}
                  reportError={reportError}
                  signatures={signatures}
                  onSignatureSaved={(record) => setSignatures((current) => [record, ...current])}
                  exportPackets={exportPackets}
                  shareRecipient={shareRecipient}
                  onChangeShareRecipient={(value) => {
                    setShareRecipient(value);
                    if (shareError) setShareError(null);
                  }}
                  shareError={shareError}
                  onSharePacket={(packet, channel) => void sharePacket(packet, channel)}
                  t={t}
                />
              </Suspense>
            )}
          </main>

          <aside className="lg:col-span-4 space-y-6">
            <ReadyForInspectionBanner readiness={readiness} />
            <section className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                <ShieldCheck size={15} className="text-blue-500" /> {t('jobDetail.jobSummary')}
              </h3>
              <div className="space-y-5">
                <SummaryRow label={t('jobDetail.currentStage')} value={currentStage?.display_name ?? t('jobDetail.ready')} />
                <SummaryRow label={t('jobDetail.photos')} value={String(photos.length)} />
                <SummaryRow label={t('jobDetail.voiceNotes')} value={String(voiceNotes.length)} />
                <SummaryRow label={t('jobDetail.timelineEvents')} value={String(1 + photos.length + voiceNotes.length + exportPackets.length)} />
                <SummaryRow label={t('jobDetail.issuesChangeOrders')} value={String(issueCount)} />
                <SummaryRow label={t('jobDetail.template')} value={template.display_name} />
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="bg-blue-50 p-5 rounded-3xl">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <MapPin size={15} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{t('jobDetail.offlineProof')}</span>
                  </div>
                  <p className="text-xs font-bold text-blue-900 leading-relaxed">
                    {t('jobDetail.offlineProofHelp')}
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">{t('jobDetail.fastActions')}</h3>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => navigate(`/job/${job.id}/camera?category=Issue`)} className="w-full bg-orange-50 text-orange-700 p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-100 transition-all">
                  <AlertTriangle size={18} /> {t('jobDetail.reportIssue')}
                </button>
                <button onClick={() => navigate(`/job/${job.id}/camera?category=Change%20Order`)} className="w-full bg-blue-50 text-blue-700 p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 transition-all">
                  <Zap size={18} /> {t('jobDetail.flagChangeOrder')}
                </button>
                <button onClick={() => navigate(`/job/${job.id}/voice?category=General`)} className="w-full bg-slate-100 text-slate-700 p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                  <Mic size={18} /> {t('jobDetail.recordNote')}
                </button>
              </div>
            </section>

            <section className={cn('p-6 rounded-[32px] text-white shadow-xl', proofScore === 100 ? 'bg-green-600 shadow-green-600/20' : 'bg-slate-900 shadow-slate-900/20')}>
              <h4 className="text-xl font-black tracking-tight mb-2">{proofScore === 100 ? t('jobDetail.readyClose') : t('jobDetail.keepCapturing')}</h4>
              <p className="text-xs font-bold opacity-80 mb-6">
                {proofScore === 100
                  ? t('jobDetail.readyCloseHelp')
                  : t('jobDetail.keepCapturingHelp')}
              </p>
              <button
                onClick={completeJob}
                disabled={proofScore < 100}
                className="w-full bg-white text-slate-950 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
              >
                {t('jobDetail.completeJob')}
              </button>
            </section>
          </aside>
        </div>
      </div>

      {showCustomerBidConfirm && (
        <div className="fixed inset-0 z-[70] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="w-full max-w-lg rounded-[32px] bg-white p-6 shadow-2xl space-y-5">
            <div>
              <h2 className="text-2xl font-black text-slate-950">{t('jobDetail.customerBidConfirmTitle')}</h2>
              <p className="mt-2 text-sm font-bold text-slate-600 leading-relaxed">{t('jobDetail.customerBidConfirmBody')}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setShowCustomerBidConfirm(false)}
                className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-700"
              >
                {t('common.no')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedReportType(SiteProofReportType.CUSTOMER_BID_REPORT);
                  setShowCustomerBidConfirm(false);
                  setActiveView('export');
                }}
                className="min-h-12 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-900"
              >
                {t('jobDetail.previewCustomerBid')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCustomerBidConfirm(false);
                  void generateBidReport(SiteProofReportType.CUSTOMER_BID_REPORT);
                }}
                className="min-h-12 rounded-2xl bg-blue-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white"
              >
                {t('jobDetail.generateCustomerBidReport')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 rounded-full p-2 flex items-center gap-2 shadow-2xl z-50 md:hidden">
        <button onClick={() => navigate(`/job/${job.id}/camera`)} className="bg-blue-600 text-white p-4 rounded-full active:scale-95 transition-all">
          <Camera size={24} />
        </button>
        <button onClick={() => navigate(`/job/${job.id}/voice`)} className="bg-white/10 text-white p-4 rounded-full active:scale-95 transition-all">
          <Mic size={24} />
        </button>
        <button onClick={() => setActiveView('export')} className="bg-white text-slate-900 p-4 rounded-full active:scale-95 transition-all">
          <FileText size={24} />
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-black text-slate-950 text-right">{value}</span>
    </div>
  );
}

