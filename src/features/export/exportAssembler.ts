import { format } from 'date-fns';
import { jobRepository } from '../../db/repositories/jobRepository';
import { proofRepository } from '../../db/repositories/proofRepository';
import { mediaRepository } from '../../db/repositories/mediaRepository';
import { voiceNoteRepository } from '../../db/repositories/voiceNoteRepository';
import { workflowStageRepository } from '../../db/repositories/workflowStageRepository';
import { timelineRepository } from '../../db/repositories/timelineRepository';
import { customerRepository } from '../../db/repositories/customerRepository';
import { ExportPacketType, Job as RuntimeJob, MediaAsset, ProofObject, TimelineEvent, VoiceNote as RuntimeVoiceNote, WorkflowStageInstance } from '../../db/schema';
import { TemplateCatalogService } from '../../services/templateCatalogService';
import { SiteProofDataService } from '../../services/siteProofDataService';
import type { ReportMode } from '../../services/pdfService';
import { Job as LegacyJob, JobPhoto, VoiceNote as LegacyVoiceNote } from '../../types';
import { WorkflowTemplate } from '../../templates/workflowTemplate.types';
import type { SiteProofLanguage } from '../../types/settings';
import { filterProofBundlesForReport } from './reportFilters';
import { getReportDefinition } from './reportDefinitions';
import type { ReportDefinition } from './reportDefinitions';
import type { FilteredReportProofSelection, ReportFilterOptions } from './reportFilters';
import { SiteProofReportType } from './reportTypes';

export interface ExportProofBundle {
  proof: ProofObject;
  media: MediaAsset[];
  legacyPhoto?: JobPhoto;
  voiceNote?: RuntimeVoiceNote;
  legacyVoiceNote?: LegacyVoiceNote;
  stage?: WorkflowStageInstance;
  requirementLabel: string;
  stageLabel: string;
}

export interface ExportAssembly {
  runtimeJob: RuntimeJob;
  legacyJob: LegacyJob;
  template: WorkflowTemplate | null;
  stages: WorkflowStageInstance[];
  proofs: ProofObject[];
  mediaAssets: MediaAsset[];
  voiceNotes: RuntimeVoiceNote[];
  timelineEvents: TimelineEvent[];
  proofBundles: ExportProofBundle[];
  photos: JobPhoto[];
  notes: LegacyVoiceNote[];
  selectedProofIds: string[];
  includedSections: string[];
  packetType: ExportPacketType;
  reportType?: SiteProofReportType;
  reportDefinition?: ReportDefinition;
  openRequiredItems?: string[];
}

function isoToMs(value?: string | null): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function runtimeStatusToLegacy(status: RuntimeJob['status']): LegacyJob['status'] {
  if (status === 'draft') return 'INCOMING';
  if (status === 'waiting') return 'WAITING';
  if (status === 'inspection_ready') return 'INSPECTION';
  if (status === 'complete') return 'COMPLETED';
  if (status === 'archived') return 'ARCHIVED';
  return 'ACTIVE';
}

function addressToString(job: RuntimeJob): string {
  return job.jobsite_address?.formatted
    || [job.jobsite_address?.line1, job.city, job.state, job.jobsite_zip].filter(Boolean).join(', ')
    || 'Jobsite address not set';
}

function stageLabel(stages: WorkflowStageInstance[], proof: ProofObject): string {
  return stages.find((stage) => stage.stage_instance_id === proof.stage_instance_id)?.stage_name ?? 'Field Proof';
}

function requirementLabel(template: WorkflowTemplate | null, proof: ProofObject): string {
  if (!template || !proof.requirement_id) return proof.title;
  for (const stage of template.stages) {
    const req = stage.proof_requirements?.find((item) => item.requirement_id === proof.requirement_id);
    if (req) return req.display_name;
  }
  return proof.title;
}

function proofMatchesPacket(proof: ProofObject, packetType: ExportPacketType): boolean {
  if (proof.deleted_at) return false;
  if (
    packetType === 'customer_completion_report'
    || packetType === 'daily_job_proof_report'
    || packetType === 'inspection_readiness_report'
    || packetType === 'change_order_evidence_report'
    || packetType === 'photo_proof_timeline'
    || packetType === 'payment_final_handoff_report'
    || packetType === 'all_reports'
  ) return true;
  if (packetType === 'internal_record') return true;
  if (packetType === 'litigation_packet') return proof.user_labels.includes('issue') || proof.user_labels.includes('CHANGE_ORDER') || proof.metadata?.is_issue === true;
  return proof.export_tags.includes(packetType) || proof.export_tags.includes('internal_record');
}

function legacyModeToPacketType(mode: ReportMode): ExportPacketType {
  switch (mode as unknown as string) {
    case 'CUSTOMER':
      return 'customer_packet';
    case 'INSPECTOR':
      return 'inspector_packet';
    case 'WARRANTY':
      return 'warranty_packet';
    case 'DISPUTE':
      return 'litigation_packet';
    default:
      return 'internal_record';
  }
}

function reportTypeToPacketType(reportType: SiteProofReportType): ExportPacketType {
  switch (reportType) {
    case SiteProofReportType.CUSTOMER_COMPLETION:
      return 'customer_completion_report';
    case SiteProofReportType.DAILY_JOB_PROOF:
      return 'daily_job_proof_report';
    case SiteProofReportType.INSPECTION_READINESS:
      return 'inspection_readiness_report';
    case SiteProofReportType.CHANGE_ORDER_EVIDENCE:
      return 'change_order_evidence_report';
    case SiteProofReportType.PHOTO_PROOF_TIMELINE:
      return 'photo_proof_timeline';
    case SiteProofReportType.PAYMENT_FINAL_HANDOFF:
      return 'payment_final_handoff_report';
    case SiteProofReportType.ALL_REPORTS:
      return 'all_reports';
    default:
      return 'internal_record';
  }
}

export function filterAssemblyRelatedDataForReport(
  assembly: Pick<ExportAssembly, 'mediaAssets' | 'timelineEvents'>,
  selectedProofIds: string[],
  reportType: SiteProofReportType,
): Pick<ExportAssembly, 'mediaAssets' | 'timelineEvents'> {
  const selectedProofIdSet = new Set(selectedProofIds);
  const includeUnlinkedTimelineEvents = reportType === SiteProofReportType.PHOTO_PROOF_TIMELINE;

  return {
    mediaAssets: assembly.mediaAssets.filter((asset) => selectedProofIdSet.has(asset.proof_id)),
    timelineEvents: assembly.timelineEvents.filter((event) => {
      if (event.related_proof_ids.length === 0) {
        // Photo Proof Timeline is intentionally evidence-first and may retain unlinked job timeline rows.
        return includeUnlinkedTimelineEvents;
      }
      return event.related_proof_ids.some((proofId) => selectedProofIdSet.has(proofId));
    }),
  };
}

async function buildLegacyJob(runtimeJob: RuntimeJob): Promise<LegacyJob> {
  const customer = runtimeJob.customer_id ? await customerRepository.getById(runtimeJob.customer_id).catch(() => undefined) : undefined;
  return {
    id: runtimeJob.job_id,
    customerName: customer?.name || runtimeJob.job_title || 'SiteProof Job',
    address: addressToString(runtimeJob),
    jobType: runtimeJob.job_type,
    templateId: runtimeJob.template_id,
    createdAt: isoToMs(runtimeJob.created_at),
    updatedAt: isoToMs(runtimeJob.updated_at),
    technicianName: undefined,
    technicianRole: undefined,
    quotedAmount: undefined,
    status: runtimeStatusToLegacy(runtimeJob.status),
    syncStatus: runtimeJob.sync_state === 'synced' ? 'SYNCED' : runtimeJob.sync_state === 'failed' ? 'ERROR' : 'PENDING',
    notes: runtimeJob.scope_summary ?? '',
  };
}

async function resolveLegacyPhotos(jobId: string): Promise<Map<string, JobPhoto>> {
  const photos = await SiteProofDataService.getPhotos(jobId).catch(() => []);
  return new Map<string, JobPhoto>(photos.map((photo) => [photo.id, photo] as const));
}

async function resolveLegacyNotes(jobId: string): Promise<Map<string, LegacyVoiceNote>> {
  const notes = await SiteProofDataService.getVoiceNotes(jobId).catch(() => []);
  return new Map<string, LegacyVoiceNote>(notes.map((note) => [note.id, note] as const));
}

function proofToPhoto(bundle: ExportProofBundle): JobPhoto | null {
  if (bundle.legacyPhoto) {
    return {
      ...bundle.legacyPhoto,
      id: bundle.proof.proof_id,
      category: bundle.requirementLabel,
      requirementId: bundle.proof.requirement_id ?? bundle.legacyPhoto.requirementId,
      stageId: bundle.stage?.template_stage_id ?? bundle.legacyPhoto.stageId,
      timestamp: isoToMs(bundle.proof.captured_at),
      latitude: bundle.proof.gps_latitude ?? bundle.legacyPhoto.latitude,
      longitude: bundle.proof.gps_longitude ?? bundle.legacyPhoto.longitude,
      notes: bundle.proof.notes ?? bundle.legacyPhoto.notes,
      proofHash: bundle.proof.integrity_hash ?? bundle.proof.hash ?? bundle.legacyPhoto.proofHash,
      proofHashAlgorithm: bundle.proof.hash_algorithm ?? bundle.legacyPhoto.proofHashAlgorithm,
      integrityStatus: bundle.proof.integrity_status ?? bundle.legacyPhoto.integrityStatus,
      integrityStampedAt: bundle.proof.integrity_stamped_at ?? bundle.legacyPhoto.integrityStampedAt,
      custodyLog: (bundle.proof.chain_of_custody ?? bundle.proof.metadata?.custody_log ?? bundle.legacyPhoto.custodyLog) as JobPhoto['custodyLog'],
    };
  }

  if (bundle.proof.proof_type !== 'photo' && bundle.proof.proof_type !== 'serial_number' && bundle.proof.proof_type !== 'test_result') return null;

  return {
    id: bundle.proof.proof_id,
    jobId: bundle.proof.job_id,
    category: bundle.requirementLabel,
    requirementId: bundle.proof.requirement_id ?? undefined,
    stageId: bundle.stage?.template_stage_id,
    timestamp: isoToMs(bundle.proof.captured_at),
    latitude: bundle.proof.gps_latitude ?? undefined,
    longitude: bundle.proof.gps_longitude ?? undefined,
    notes: bundle.proof.notes ?? undefined,
    isIssue: bundle.proof.metadata?.is_issue === true || bundle.proof.user_labels.includes('issue'),
    issueType: bundle.proof.user_labels.includes('CHANGE_ORDER') ? 'CHANGE_ORDER' : undefined,
    qualityScore: bundle.proof.quality_score ?? undefined,
    syncStatus: bundle.proof.sync_state === 'synced' ? 'SYNCED' : 'PENDING',
    proofHash: bundle.proof.integrity_hash ?? bundle.proof.hash ?? undefined,
    proofHashAlgorithm: bundle.proof.hash_algorithm ?? undefined,
    integrityStatus: bundle.proof.integrity_status ?? undefined,
    integrityStampedAt: bundle.proof.integrity_stamped_at ?? undefined,
    custodyLog: (bundle.proof.chain_of_custody ?? bundle.proof.metadata?.custody_log) as JobPhoto['custodyLog'],
  };
}

function proofToVoiceNote(bundle: ExportProofBundle): LegacyVoiceNote | null {
  if (bundle.legacyVoiceNote) {
    return {
      ...bundle.legacyVoiceNote,
      id: bundle.proof.proof_id,
      category: bundle.requirementLabel,
      requirementId: bundle.proof.requirement_id ?? bundle.legacyVoiceNote.requirementId,
      stageId: bundle.stage?.template_stage_id ?? bundle.legacyVoiceNote.stageId,
      timestamp: isoToMs(bundle.proof.captured_at),
      proofHash: bundle.proof.integrity_hash ?? bundle.proof.hash ?? bundle.legacyVoiceNote.proofHash,
      proofHashAlgorithm: bundle.proof.hash_algorithm ?? bundle.legacyVoiceNote.proofHashAlgorithm,
      integrityStatus: bundle.proof.integrity_status ?? bundle.legacyVoiceNote.integrityStatus,
      integrityStampedAt: bundle.proof.integrity_stamped_at ?? bundle.legacyVoiceNote.integrityStampedAt,
      custodyLog: (bundle.proof.chain_of_custody ?? bundle.proof.metadata?.custody_log ?? bundle.legacyVoiceNote.custodyLog) as LegacyVoiceNote['custodyLog'],
    };
  }

  if (bundle.proof.proof_type !== 'voice_note' && bundle.proof.proof_type !== 'text_note') return null;
  const runtimeVoice = bundle.voiceNote;
  return {
    id: bundle.proof.proof_id,
    jobId: bundle.proof.job_id,
    transcribedText: runtimeVoice?.transcript || bundle.proof.description || bundle.proof.notes || '',
    summary: runtimeVoice?.summary || (bundle.proof.metadata?.summary as string | undefined),
    language: runtimeVoice?.language ?? (bundle.proof.metadata?.language as LegacyVoiceNote['language']) ?? 'unknown',
    extractedTasks: runtimeVoice?.extracted_tasks ?? [],
    materialMentions: runtimeVoice?.material_mentions ?? (bundle.proof.metadata?.materials as string[] | undefined) ?? [],
    issueMentions: runtimeVoice?.issue_mentions ?? (bundle.proof.metadata?.issues as string[] | undefined) ?? [],
    customerRequests: (bundle.proof.metadata?.customer_requests as string[] | undefined) ?? [],
    changeOrderCandidates: runtimeVoice?.change_order_candidates ?? (bundle.proof.metadata?.change_order_candidates as string[] | undefined) ?? [],
    aiConfidence: typeof bundle.proof.metadata?.ai_confidence === 'number' ? bundle.proof.metadata.ai_confidence : undefined,
    aiStatus: (bundle.proof.metadata?.ai_status as LegacyVoiceNote['aiStatus']) ?? 'local',
    timestamp: isoToMs(bundle.proof.captured_at),
    category: bundle.requirementLabel,
    requirementId: bundle.proof.requirement_id ?? undefined,
    stageId: bundle.stage?.template_stage_id,
    isIssue: bundle.proof.metadata?.is_issue === true || bundle.proof.user_labels.includes('issue'),
    isChangeOrder: bundle.proof.metadata?.is_change_order === true || bundle.proof.user_labels.includes('change_order'),
    syncStatus: bundle.proof.sync_state === 'synced' ? 'SYNCED' : 'PENDING',
    proofHash: bundle.proof.integrity_hash ?? bundle.proof.hash ?? undefined,
    proofHashAlgorithm: bundle.proof.hash_algorithm ?? undefined,
    integrityStatus: bundle.proof.integrity_status ?? undefined,
    integrityStampedAt: bundle.proof.integrity_stamped_at ?? undefined,
    custodyLog: (bundle.proof.chain_of_custody ?? bundle.proof.metadata?.custody_log) as JobPhoto['custodyLog'],
  };
}

export class ExportAssembler {
  static async assemble(jobId: string, mode: ReportMode, exportLanguage: SiteProofLanguage = 'en'): Promise<ExportAssembly | null> {
    return this.assembleForPacket(jobId, legacyModeToPacketType(mode), exportLanguage);
  }

  static async assembleForReport(
    jobId: string,
    reportType: SiteProofReportType,
    exportLanguage: SiteProofLanguage = 'en',
    options: ReportFilterOptions = {},
  ): Promise<ExportAssembly | null> {
    const reportDefinition = getReportDefinition(reportType);
    const assembly = await this.assembleForPacket(jobId, reportTypeToPacketType(reportType), exportLanguage);
    if (!assembly) return null;

    const filtered = filterProofBundlesForReport(assembly, reportDefinition, options);
    const selectedProofIdSet = new Set(filtered.selectedProofIds);
    const relatedData = filterAssemblyRelatedDataForReport(assembly, filtered.selectedProofIds, reportType);

    return {
      ...assembly,
      proofs: assembly.proofs.filter((proof) => selectedProofIdSet.has(proof.proof_id)),
      mediaAssets: relatedData.mediaAssets,
      timelineEvents: relatedData.timelineEvents,
      proofBundles: filtered.proofBundles,
      photos: filtered.photos,
      notes: filtered.notes,
      selectedProofIds: filtered.selectedProofIds,
      includedSections: filtered.includedSections,
      reportType,
      reportDefinition,
      openRequiredItems: filtered.openRequiredItems,
    };
  }

  private static async assembleForPacket(jobId: string, packetType: ExportPacketType, exportLanguage: SiteProofLanguage = 'en'): Promise<ExportAssembly | null> {
    const runtimeJob = await jobRepository.getById(jobId);
    if (!runtimeJob) return null;

    const [proofs, mediaAssets, voiceNotes, stages, timelineEvents] = await Promise.all([
      proofRepository.getByJob(jobId),
      mediaRepository.getByJob(jobId),
      voiceNoteRepository.getByJob(jobId),
      workflowStageRepository.getByJob(jobId),
      timelineRepository.getByJob(jobId),
    ]);

    const template = TemplateCatalogService.getTemplate(runtimeJob.template_id, exportLanguage);
    const legacyJob = await buildLegacyJob(runtimeJob);
    const legacyPhotos = await resolveLegacyPhotos(jobId);
    const legacyNotes = await resolveLegacyNotes(jobId);
    const voiceByProofId = new Map(voiceNotes.map((note) => [note.proof_id, note]));
    const mediaByProofId = mediaAssets.reduce<Map<string, MediaAsset[]>>((acc, media) => {
      const next = acc.get(media.proof_id) ?? [];
      next.push(media);
      acc.set(media.proof_id, next);
      return acc;
    }, new Map());

    const selectedProofs = proofs
      .filter((proof) => proofMatchesPacket(proof, packetType))
      .sort((a, b) => isoToMs(a.captured_at) - isoToMs(b.captured_at));

    const proofBundles: ExportProofBundle[] = selectedProofs.map((proof) => {
      const legacyPhotoId = typeof proof.metadata?.legacy_photo_id === 'string'
        ? proof.metadata.legacy_photo_id
        : typeof proof.metadata?.source_ui_photo_id === 'string' ? proof.metadata.source_ui_photo_id : undefined;
      const legacyVoiceId = typeof proof.metadata?.legacy_voice_note_id === 'string'
        ? proof.metadata.legacy_voice_note_id
        : typeof proof.metadata?.source_ui_voice_note_id === 'string' ? proof.metadata.source_ui_voice_note_id : undefined;
      const stage = stages.find((item) => item.stage_instance_id === proof.stage_instance_id);
      return {
        proof,
        media: mediaByProofId.get(proof.proof_id) ?? [],
        legacyPhoto: legacyPhotoId ? legacyPhotos.get(legacyPhotoId) : undefined,
        voiceNote: voiceByProofId.get(proof.proof_id),
        legacyVoiceNote: legacyVoiceId ? legacyNotes.get(legacyVoiceId) : undefined,
        stage,
        requirementLabel: requirementLabel(template, proof),
        stageLabel: stageLabel(stages, proof),
      };
    });

    const photos = proofBundles.map(proofToPhoto).filter((item): item is JobPhoto => Boolean(item));
    const notes = proofBundles.map(proofToVoiceNote).filter((item): item is LegacyVoiceNote => Boolean(item));
    const includedSections = [
      'job_summary',
      'proof_checklist',
      ...(photos.length ? ['photo_evidence'] : []),
      ...(notes.length ? ['voice_insights'] : []),
      ...(timelineEvents.length ? ['timeline'] : ['timeline']),
    ];

    return {
      runtimeJob,
      legacyJob,
      template,
      stages,
      proofs: selectedProofs,
      mediaAssets,
      voiceNotes,
      timelineEvents,
      proofBundles,
      photos,
      notes,
      selectedProofIds: selectedProofs.map((proof) => proof.proof_id),
      includedSections,
      packetType,
    };
  }

  static describeAssembly(assembly: ExportAssembly): string {
    return [
      `${assembly.proofs.length} canonical proof object${assembly.proofs.length === 1 ? '' : 's'}`,
      `${assembly.mediaAssets.length} media asset${assembly.mediaAssets.length === 1 ? '' : 's'}`,
      `${assembly.voiceNotes.length} structured voice note${assembly.voiceNotes.length === 1 ? '' : 's'}`,
      `generated ${format(Date.now(), 'PP p')}`,
    ].join(' • ');
  }

  static filterForReport(
    assembly: ExportAssembly,
    definition: ReportDefinition,
    options: ReportFilterOptions = {},
  ): FilteredReportProofSelection {
    return filterProofBundlesForReport(assembly, definition, options);
  }
}
