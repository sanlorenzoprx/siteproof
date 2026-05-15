import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
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
  ShieldCheck,
  Trash2,
  Zap,
} from 'lucide-react';
import { format } from 'date-fns';
import { SiteProofDataService } from '../services/siteProofDataService';
import { PdfService, ReportMode } from '../services/pdfService';
import { Job, JobPhoto, VoiceNote } from '../types';
import { RuntimeSnapshot } from '../services/runtimeOrchestrator';
import { ProofRequirement, WorkflowStageTemplate, WorkflowTemplate } from '../templates/workflowTemplate.types';
import { TemplateCatalogService } from '../services/templateCatalogService';
import { cn } from '../lib/utils';
import { useInspectionReadiness } from '../hooks/useInspectionReadiness';
import { InspectionReadyCard } from './inspection/InspectionReadyCard';
import { MissingProofList } from './inspection/MissingProofList';
import { QualityWarningsPanel } from './inspection/QualityWarningsPanel';
import { ReadyForInspectionBanner } from './inspection/ReadyForInspectionBanner';
import { InspectionIssue } from '../features/inspection/inspectionReadinessService';
import { ExportPacketService } from '../features/export/exportPacketService';
import { ExportPacket } from '../db/schema';
import { MediaPipelineService } from '../services/mediaPipelineService';
import { TimelinePlayback } from './timeline/TimelinePlayback';

type DetailView = 'proof' | 'photos' | 'notes' | 'timeline' | 'export';

const PhotoThumbnail = ({ photo, className }: { photo: JobPhoto; className?: string }) => {
  const [url, setUrl] = useState<string>(photo.thumbnailDataUrl || photo.dataUrl || '');

  useEffect(() => {
    if (!photo.thumbnailDataUrl && !photo.dataUrl && photo.blob) {
      const objectUrl = URL.createObjectURL(photo.blob);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [photo]);

  return <img src={url} className={className} alt={photo.category} />;
};

function getTemplateForJob(job: Job | null): WorkflowTemplate | null {
  return TemplateCatalogService.getTemplate(job?.templateId);
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

function requirementActionLabel(requirement: ProofRequirement): string {
  if (requirement.proof_type === 'voice_note') return 'Record Note';
  if (requirement.proof_type === 'text_note') return 'Dictate Note';
  if (requirement.proof_type === 'signature') return 'Capture Signoff';
  if (requirement.proof_type === 'serial_number') return 'Capture Serial';
  if (requirement.proof_type === 'test_result') return 'Capture Test';
  return 'Take Photo';
}

function priorityBadge(requirement: ProofRequirement) {
  if (requirement.priority === 'required') return 'Required';
  if (requirement.priority === 'recommended') return 'Recommended';
  if (requirement.priority === 'conditional') return 'Conditional';
  return 'Optional';
}

export function JobDetail() {
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
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [exportPackets, setExportPackets] = useState<ExportPacket[]>([]);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const jobData = await SiteProofDataService.getJobById(id);
      if (!jobData) {
        navigate('/');
        return;
      }

      const [photosData, notesData, snapshot, syncState, exportsData] = await Promise.all([
        SiteProofDataService.getPhotos(id),
        SiteProofDataService.getVoiceNotes(id),
        SiteProofDataService.getRuntimeSnapshot(id),
        SiteProofDataService.getSyncState(),
        ExportPacketService.getPacketHistory(id),
      ]);

      setJob(jobData);
      setPhotos(photosData);
      setVoiceNotes(notesData);
      setRuntimeSnapshot(snapshot);
      setPendingSyncCount(syncState.pendingCount || 0);
      setExportPackets(exportsData.sort((a, b) => b.generated_at.localeCompare(a.generated_at)));

      const template = getTemplateForJob(jobData);
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
  }, [id, navigate]);

  const template = useMemo(() => getTemplateForJob(job), [job]);
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

  async function handleExportReport(mode: ReportMode) {
    setGeneratingReport(true);
    try {
      await PdfService.generateReport(job!, photos, voiceNotes, mode);
      const nextExports = await ExportPacketService.getPacketHistory(job!.id);
      setExportPackets(nextExports.sort((a, b) => b.generated_at.localeCompare(a.generated_at)));
    } catch (error) {
      console.error(error);
      alert('Report failed. Please try again.');
    } finally {
      setGeneratingReport(false);
    }
  }

  async function completeJob() {
    if (!job) return;
    await SiteProofDataService.saveJob({ ...job, status: 'COMPLETED' });
    navigate('/');
  }

  const currentStage = visibleStages.find((stage) => {
    const runtime = stageRuntimeByTemplateId.get(stage.stage_id);
    return runtime?.status !== 'complete';
  }) ?? visibleStages[visibleStages.length - 1];

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <div className="bg-white border-b border-slate-200 px-5 py-5 md:px-10 md:py-7">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-500 transition-all"
              aria-label="Back to jobs"
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
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-500" />{job.address}</span>
                <span className="flex items-center gap-1.5"><FileText size={14} className="text-slate-400" />{job.jobType}</span>
                {pendingSyncCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-orange-600">
                    <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    {pendingSyncCount} waiting to sync
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Saved locally
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate(`/job/${job.id}/camera?category=${encodeURIComponent(currentStage?.display_name ?? 'General Photo')}`)}
              className="bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center gap-2"
            >
              <Camera size={18} /> Take Photo
            </button>
            <button
              onClick={() => setActiveView('export')}
              className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <Download size={18} /> Generate Packet
            </button>
            <button
              onClick={async () => {
                if (confirm('Delete this job and its local proof?')) {
                  await SiteProofDataService.deleteJob(job.id);
                  navigate('/');
                }
              }}
              className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-red-500 transition-all"
              aria-label="Delete job"
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-5 md:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <main className="lg:col-span-8 space-y-6">
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

            <div className="flex gap-2 p-1.5 bg-slate-200/60 rounded-2xl w-fit overflow-x-auto no-scrollbar">
              {[
                { id: 'proof', label: 'Proof' },
                { id: 'photos', label: `Photos (${photos.length})` },
                { id: 'notes', label: `Notes (${voiceNotes.length})` },
                { id: 'timeline', label: 'Timeline' },
                { id: 'export', label: 'Export' },
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
              <section className="space-y-5">
                {visibleStages.map((stage, index) => (
                  <WorkflowStageCard
                    key={stage.stage_id}
                    jobId={job.id}
                    stage={stage}
                    index={index}
                    runtimeStage={stageRuntimeByTemplateId.get(stage.stage_id)}
                    proofByRequirement={proofByRequirement}
                    expanded={expandedStages[stage.stage_id] ?? false}
                    onToggle={() => setExpandedStages((current) => ({ ...current, [stage.stage_id]: !(current[stage.stage_id] ?? false) }))}
                    onCapture={(requirement) => navigate(requirementCapturePath(job.id, requirement, stage.stage_id))}
                  />
                ))}
              </section>
            )}

            {activeView === 'photos' && (
              <section className="space-y-5">
                <div className="bg-white rounded-[32px] border border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-black text-slate-950 text-lg tracking-tight">Jobsite Gallery</h3>
                    <p className="text-xs font-bold text-slate-500">Thumbnails, compression status, GPS proof, and requirement context.</p>
                  </div>
                  <button
                    onClick={() => navigate(`/job/${job.id}/camera`)}
                    className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20"
                  >
                    <Camera size={18} />
                    Add Photo
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {photos.map((photo) => (
                    <PhotoGalleryCard key={photo.id} photo={photo} />
                  ))}
                </div>
              </section>
            )}

            {activeView === 'notes' && (
              <section className="space-y-4">
                {voiceNotes.map((note) => (
                  <div key={note.id} className="bg-white p-6 rounded-[28px] border border-slate-200 flex items-start gap-5 shadow-sm">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                      <Mic size={22} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{note.category}</span>
                        <span className="text-[10px] font-bold text-slate-400">{format(note.timestamp, 'MMM d, h:mm a')}</span>
                      </div>
                      {note.summary && (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 mb-3">
                          <div className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">Voice AI Summary</div>
                          <p className="text-xs font-bold text-blue-950 leading-relaxed">{note.summary}</p>
                        </div>
                      )}
                      <p className="text-slate-900 font-bold leading-relaxed">“{note.transcribedText}”</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <VoiceChip icon={<Languages size={13} />} label={note.language === 'es' ? 'Spanish' : note.language === 'en' ? 'English' : 'Language Auto'} />
                        {note.materialMentions?.slice(0, 3).map((item) => (
                          <span key={item}><VoiceChip icon={<Wrench size={13} />} label={item} /></span>
                        ))}
                        {note.issueMentions?.length ? <VoiceChip tone="warning" icon={<AlertTriangle size={13} />} label={`${note.issueMentions.length} issue${note.issueMentions.length === 1 ? '' : 's'}`} /> : null}
                        {note.changeOrderCandidates?.length ? <VoiceChip tone="warning" icon={<Zap size={13} />} label="Change Order Candidate" /> : null}
                        {note.customerRequests?.length ? <VoiceChip icon={<Mic size={13} />} label="Customer Request" /> : null}
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => navigate(`/job/${job.id}/voice`)}
                  className="w-full py-8 border-4 border-dashed border-slate-200 rounded-[28px] flex flex-col items-center justify-center gap-4 text-slate-300 hover:border-blue-300 hover:text-blue-500 transition-all"
                >
                  <Mic size={38} />
                  <span className="font-black text-xs uppercase tracking-widest">Record Field Note</span>
                </button>
              </section>
            )}

            {activeView === 'timeline' && (
              <TimelinePlayback jobId={job.id} />
            )}

            {activeView === 'export' && (
              <section className="space-y-6">
                <div className="bg-slate-900 rounded-[36px] p-8 text-white overflow-hidden relative">
                  <div className="absolute -right-10 -top-10 opacity-5"><FileText size={220} /></div>
                  <div className="relative z-10">
                    <h2 className="text-3xl font-black tracking-tight mb-3">Generate Packet</h2>
                    <p className="text-sm font-bold text-slate-400 max-w-xl mb-8">
                      Create the right proof packet for the customer, inspector, office, or a dispute. Inspector packets use the required proof checklist.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <ExportButton title="Customer Packet" description="Polished summary, final photos, and customer-friendly notes." icon={<Zap size={26} />} onClick={() => handleExportReport(ReportMode.CUSTOMER)} disabled={generatingReport} />
                      <ExportButton title="Inspector Packet" description="Required proof, GPS/timestamps, and inspection-ready evidence." icon={<ShieldCheck size={26} />} onClick={() => handleExportReport(ReportMode.INSPECTOR)} disabled={generatingReport || (readiness?.blocking_items.length ?? missingRequired.length) > 0} blocked={(readiness?.blocking_items.length ?? missingRequired.length) > 0} />
                      <ExportButton title="Internal Record" description="Full job timeline for office backup and closeout." icon={<FileText size={26} />} onClick={() => handleExportReport(ReportMode.STANDARD)} disabled={generatingReport} />
                      <ExportButton title="Dispute Pack" description="Focused report for issues, deficiencies, and change-order proof." icon={<AlertTriangle size={26} />} onClick={() => handleExportReport(ReportMode.DISPUTE)} disabled={generatingReport} />
                    </div>

                    <div className="mt-8 bg-white/5 border border-white/10 rounded-[28px] p-5">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Generated Packet History</h3>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{exportPackets.length} saved locally</span>
                      </div>
                      {exportPackets.length === 0 ? (
                        <p className="text-xs font-bold text-slate-500">No packets generated yet. Generated PDFs are saved locally and queued for sync.</p>
                      ) : (
                        <div className="space-y-3">
                          {exportPackets.slice(0, 5).map((packet) => (
                            <div key={packet.export_id} className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 flex items-center justify-between gap-4">
                              <div>
                                <div className="text-sm font-black text-white">{packet.title}</div>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{format(new Date(packet.generated_at), 'MMM d, h:mm a')} • {packet.included_proof_ids.length} proof items</div>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-green-300">Saved</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </main>

          <aside className="lg:col-span-4 space-y-6">
            <ReadyForInspectionBanner readiness={readiness} />
            <section className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5 flex items-center gap-2">
                <ShieldCheck size={15} className="text-blue-500" /> Job Summary
              </h3>
              <div className="space-y-5">
                <SummaryRow label="Current Stage" value={currentStage?.display_name ?? 'Ready'} />
                <SummaryRow label="Photos" value={String(photos.length)} />
                <SummaryRow label="Voice Notes" value={String(voiceNotes.length)} />
                <SummaryRow label="Timeline Events" value={String(1 + photos.length + voiceNotes.length + exportPackets.length)} />
                <SummaryRow label="Issues / Change Orders" value={String(issueCount)} />
                <SummaryRow label="Template" value={template.display_name} />
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="bg-blue-50 p-5 rounded-3xl">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <MapPin size={15} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Offline Proof</span>
                  </div>
                  <p className="text-xs font-bold text-blue-900 leading-relaxed">
                    Evidence is saved locally with job, stage, timestamp, and GPS where available. Sync can complete later when internet returns.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">Fast Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                <button onClick={() => navigate(`/job/${job.id}/camera?category=Issue`)} className="w-full bg-orange-50 text-orange-700 p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-100 transition-all">
                  <AlertTriangle size={18} /> Report Issue
                </button>
                <button onClick={() => navigate(`/job/${job.id}/camera?category=Change%20Order`)} className="w-full bg-blue-50 text-blue-700 p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-100 transition-all">
                  <Zap size={18} /> Flag Change Order
                </button>
                <button onClick={() => navigate(`/job/${job.id}/voice?category=General`)} className="w-full bg-slate-100 text-slate-700 p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                  <Mic size={18} /> Record Note
                </button>
              </div>
            </section>

            <section className={cn('p-6 rounded-[32px] text-white shadow-xl', proofScore === 100 ? 'bg-green-600 shadow-green-600/20' : 'bg-slate-900 shadow-slate-900/20')}>
              <h4 className="text-xl font-black tracking-tight mb-2">{proofScore === 100 ? 'Ready to close' : 'Keep capturing proof'}</h4>
              <p className="text-xs font-bold opacity-80 mb-6">
                {proofScore === 100
                  ? 'Required proof is complete. You can close the job or generate packets.'
                  : 'Complete required proof before leaving the jobsite.'}
              </p>
              <button
                onClick={completeJob}
                disabled={proofScore < 100}
                className="w-full bg-white text-slate-950 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
              >
                Complete Job
              </button>
            </section>
          </aside>
        </div>
      </div>

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

function WorkflowStageCard({
  jobId,
  stage,
  index,
  runtimeStage,
  proofByRequirement,
  expanded,
  onToggle,
  onCapture,
}: {
  key?: React.Key;
  jobId: string;
  stage: WorkflowStageTemplate;
  index: number;
  runtimeStage?: RuntimeSnapshot['stages'][number];
  proofByRequirement: Map<string, number>;
  expanded: boolean;
  onToggle: () => void;
  onCapture: (requirement: ProofRequirement) => void;
}) {
  const required = stage.proof_requirements.filter((requirement) => requirement.priority === 'required');
  const completedRequired = required.filter((requirement) => (proofByRequirement.get(requirement.requirement_id) ?? 0) >= requirement.minimum_count).length;
  const stageComplete = required.length === 0 || completedRequired >= required.length;
  const statusLabel = stageComplete ? 'Complete' : runtimeStage?.status === 'in_progress' ? 'In Progress' : 'Needs Proof';

  return (
    <div className="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full p-5 md:p-6 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-all">
        <div className="flex items-center gap-4 min-w-0">
          <div className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0',
            stageComplete ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400',
          )}>
            {stageComplete ? <CheckCircle size={24} /> : index + 1}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-black text-slate-950 uppercase tracking-tight">{stage.display_name}</h3>
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                stageComplete ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700',
              )}>
                {statusLabel}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 leading-relaxed line-clamp-2">{stage.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:block text-xs font-black text-slate-400 uppercase tracking-widest">
            {completedRequired}/{required.length} required
          </span>
          {expanded ? <ChevronDown size={22} className="text-slate-400" /> : <ChevronRight size={22} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 md:px-6 pb-6 space-y-3">
          {stage.proof_requirements.map((requirement) => {
            const count = proofByRequirement.get(requirement.requirement_id) ?? 0;
            const done = count >= requirement.minimum_count;
            return (
              <div key={requirement.requirement_id} className={cn(
                'border rounded-3xl p-4 md:p-5 transition-all',
                done ? 'border-green-100 bg-green-50/40' : requirement.priority === 'required' ? 'border-orange-100 bg-orange-50/30' : 'border-slate-200 bg-white',
              )}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn('mt-0.5', done ? 'text-green-600' : 'text-slate-300')}>
                      {done ? <CheckCircle size={22} /> : <Circle size={22} />}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-black text-slate-950 text-sm md:text-base">{requirement.display_name}</h4>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest',
                          requirement.priority === 'required' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500',
                        )}>
                          {priorityBadge(requirement)}
                        </span>
                        {count > 0 && <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">{count} captured</span>}
                      </div>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">{requirement.field_instruction}</p>
                      {requirement.capture_hint && <p className="text-[11px] font-bold text-slate-400 mt-1">Tip: {requirement.capture_hint}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => onCapture(requirement)}
                    className={cn(
                      'shrink-0 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                      done ? 'bg-white border border-green-200 text-green-700 hover:bg-green-50' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/15',
                    )}
                  >
                    {requirement.proof_type === 'voice_note' || requirement.proof_type === 'text_note' ? <Mic size={16} /> : <Camera size={16} />}
                    {done ? 'Add More' : requirementActionLabel(requirement)}
                  </button>
                </div>
              </div>
            );
          })}

          {stage.checklist_items && stage.checklist_items.length > 0 && (
            <div className="mt-4 bg-slate-50 border border-slate-100 rounded-3xl p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Checklist</div>
              <div className="space-y-2">
                {stage.checklist_items.map((item) => (
                  <div key={item.checklist_id} className="flex items-start gap-3 text-xs font-bold text-slate-600">
                    <Circle size={14} className="mt-0.5 text-slate-300" />
                    <div>
                      <span className="text-slate-900">{item.display_name}</span>
                      <p className="text-slate-500 font-semibold mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


function PhotoGalleryCard({ photo }: { photo: JobPhoto; key?: React.Key }) {
  const hasGps = typeof photo.latitude === 'number' && typeof photo.longitude === 'number';
  const compressed = photo.compressionState === 'compressed' || photo.compressionState === 'not_needed';
  const quality = photo.qualityScore ? Math.round(photo.qualityScore * 100) : null;

  return (
    <div className="bg-white rounded-[30px] overflow-hidden border border-slate-200 shadow-sm">
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <PhotoThumbnail photo={photo} className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white', hasGps ? 'bg-green-600' : 'bg-red-500')}>
            {hasGps ? 'GPS' : 'No GPS'}
          </span>
          <span className={cn('px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white', compressed ? 'bg-blue-600' : 'bg-slate-600')}>
            {compressed ? 'Media Ready' : 'Processing'}
          </span>
        </div>
        {photo.isIssue && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
            {photo.issueType?.replace('_', ' ') || 'Issue'}
          </div>
        )}
      </div>
      <div className="p-4 space-y-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">{photo.category}</div>
          <div className="text-xs font-bold text-slate-500">{format(photo.timestamp, 'MMM d, h:mm a')}</div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 rounded-2xl p-2">
            <div className="text-[9px] font-black uppercase text-slate-400">Size</div>
            <div className="text-[11px] font-black text-slate-900">{MediaPipelineService.humanFileSize(photo.compressedSize ?? photo.originalSize)}</div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-2">
            <div className="text-[9px] font-black uppercase text-slate-400">Quality</div>
            <div className="text-[11px] font-black text-slate-900">{quality ? `${quality}%` : '—'}</div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-2">
            <div className="text-[9px] font-black uppercase text-slate-400">Pixels</div>
            <div className="text-[11px] font-black text-slate-900">{photo.width && photo.height ? `${photo.width}×${photo.height}` : '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportButton({
  title,
  description,
  icon,
  onClick,
  disabled,
  blocked,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  blocked?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-white/10 hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-white/10 border border-white/10 p-6 rounded-[28px] text-left transition-all"
    >
      <div className="text-white mb-4">{icon}</div>
      <h4 className="font-black uppercase tracking-tight text-lg mb-2">{title}</h4>
      <p className="text-xs font-bold text-slate-400 leading-relaxed">{blocked ? 'Blocked until required proof is complete.' : description}</p>
    </button>
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


function VoiceChip({ icon, label, tone = 'default' }: { icon: React.ReactNode; label: string; tone?: 'default' | 'warning' }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
      tone === 'warning' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600',
    )}>
      {icon}
      {label}
    </span>
  );
}
