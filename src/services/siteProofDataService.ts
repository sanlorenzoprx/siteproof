import { Job, JobPhoto, VoiceNote, License, BusinessProfile, UserProfile, SyncState } from '../types';
import { RuntimeOrchestrator, RuntimeSnapshot } from './runtimeOrchestrator';
import { AppSettingsService } from './appSettingsService';
import { jobRepository, customerRepository, proofRepository, mediaRepository, voiceNoteRepository, workflowStageRepository } from '../db/repositories';
import { Job as RuntimeJob, JobStatus as RuntimeJobStatus, ProofObject, MediaAsset, VoiceNote as RuntimeVoiceNote } from '../db/schema';

const BUSINESS_PROFILE_KEY = 'business_profile';
const USER_PROFILE_KEY = 'user_profile';
const LICENSE_KEY = 'license';
const SYNC_STATE_KEY = 'sync_state';

function runtimeStatusToLegacy(status: RuntimeJobStatus): Job['status'] {
  switch (status) {
    case 'draft': return 'INCOMING';
    case 'active': return 'ACTIVE';
    case 'waiting': return 'WAITING';
    case 'inspection_ready': return 'INSPECTION';
    case 'complete': return 'COMPLETED';
    case 'archived': return 'ARCHIVED';
    case 'cancelled': return 'ARCHIVED';
    default: return 'ACTIVE';
  }
}

function runtimeAddressToString(job: RuntimeJob): string {
  return job.jobsite_address?.formatted
    || [job.jobsite_address?.line1, job.city || job.jobsite_address?.city, job.state || job.jobsite_address?.state, job.jobsite_zip || job.jobsite_address?.postal_code]
      .filter(Boolean)
      .join(', ')
    || 'GPS Auto';
}

async function runtimeJobToUiJob(job: RuntimeJob): Promise<Job> {
  const customer = job.customer_id ? await customerRepository.getById(job.customer_id) : undefined;
  return {
    id: job.job_id,
    customerName: customer?.name || job.job_title || 'Field Job',
    address: runtimeAddressToString(job),
    jobType: job.job_type || job.trade_specialty || job.trade || 'Field Job',
    templateId: job.template_id,
    createdAt: Date.parse(job.created_at) || Date.now(),
    updatedAt: Date.parse(job.updated_at) || Date.now(),
    status: runtimeStatusToLegacy(job.status),
    syncStatus: job.sync_state === 'synced' ? 'SYNCED' : job.sync_state === 'failed' ? 'ERROR' : 'PENDING',
    notes: job.scope_summary || '',
    uiLanguageAtCreation: job.ui_language_at_creation,
    defaultCaptureLanguage: job.default_capture_language,
    defaultExportLanguage: job.default_export_language,
  };
}

function isoToMs(value?: string | null): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function syncStateToLegacy(syncState?: string | null): Job['syncStatus'] {
  if (syncState === 'synced') return 'SYNCED';
  if (syncState === 'failed' || syncState === 'conflict') return 'ERROR';
  return 'PENDING';
}

function proofLooksLikePhoto(proof: ProofObject): boolean {
  return proof.proof_type === 'photo' || proof.proof_type === 'serial_number' || proof.proof_type === 'test_result';
}

function metadataString(proof: ProofObject, key: string): string | undefined {
  const value = proof.metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function metadataNumber(proof: ProofObject, key: string): number | undefined {
  const value = proof.metadata?.[key];
  return typeof value === 'number' ? value : undefined;
}

async function runtimeProofsToUiPhotos(jobId: string): Promise<JobPhoto[]> {
  const [proofs, mediaAssets, stages] = await Promise.all([
    proofRepository.getByJob(jobId).catch(() => []),
    mediaRepository.getByJob(jobId).catch(() => []),
    workflowStageRepository.getByJob(jobId).catch(() => []),
  ]);

  const mediaByProof = new Map<string, MediaAsset[]>();
  for (const media of mediaAssets) {
    const next = mediaByProof.get(media.proof_id) ?? [];
    next.push(media);
    mediaByProof.set(media.proof_id, next);
  }

  return proofs
    .filter((proof) => !proof.deleted_at && proofLooksLikePhoto(proof))
    .map((proof): JobPhoto => {
      const media = mediaByProof.get(proof.proof_id)?.[0];
      const stage = stages.find((item) => item.stage_instance_id === proof.stage_instance_id);
      return {
        id: proof.proof_id,
        jobId: proof.job_id,
        dataUrl: metadataString(proof, 'data_url'),
        thumbnailDataUrl: metadataString(proof, 'thumbnail_data_url'),
        width: media?.width ?? metadataNumber(proof, 'width'),
        height: media?.height ?? metadataNumber(proof, 'height'),
        originalSize: media?.file_size ?? metadataNumber(proof, 'original_size'),
        compressedSize: metadataNumber(proof, 'compressed_size'),
        compressionState: media?.compression_state ?? (proof.metadata?.compression_state as JobPhoto['compressionState']),
        thumbnailState: proof.metadata?.thumbnail_state as JobPhoto['thumbnailState'],
        qualityScore: proof.quality_score ?? undefined,
        category: proof.title || 'Photo',
        requirementId: proof.requirement_id ?? undefined,
        stageId: stage?.template_stage_id,
        timestamp: isoToMs(proof.captured_at),
        latitude: proof.gps_latitude ?? undefined,
        longitude: proof.gps_longitude ?? undefined,
        notes: proof.notes ?? undefined,
        isIssue: proof.metadata?.is_issue === true || proof.user_labels.includes('issue'),
        issueType: proof.metadata?.issue_type as JobPhoto['issueType'],
        syncStatus: syncStateToLegacy(proof.sync_state),
        proofHash: proof.integrity_hash ?? proof.hash ?? undefined,
        proofHashAlgorithm: proof.hash_algorithm ?? undefined,
        integrityStatus: proof.integrity_status,
        integrityStampedAt: proof.integrity_stamped_at ?? undefined,
        custodyLog: (proof.chain_of_custody ?? proof.metadata?.custody_log) as JobPhoto['custodyLog'],
      };
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

async function runtimeVoiceNotesToUi(jobId: string): Promise<VoiceNote[]> {
  const [proofs, voiceNotes, stages] = await Promise.all([
    proofRepository.getByJob(jobId).catch(() => []),
    voiceNoteRepository.getByJob(jobId).catch(() => []),
    workflowStageRepository.getByJob(jobId).catch(() => []),
  ]);

  const voiceByProof = new Map(voiceNotes.map((note) => [note.proof_id, note] as const));
  return proofs
    .filter((proof) => !proof.deleted_at && (proof.proof_type === 'voice_note' || proof.proof_type === 'text_note'))
    .map((proof): VoiceNote => {
      const runtimeVoice: RuntimeVoiceNote | undefined = voiceByProof.get(proof.proof_id);
      const stage = stages.find((item) => item.stage_instance_id === proof.stage_instance_id);
      return {
        id: proof.proof_id,
        jobId: proof.job_id,
        audioUrl: metadataString(proof, 'audio_url'),
        durationMs: metadataNumber(proof, 'duration_ms'),
        fileSize: metadataNumber(proof, 'file_size'),
        transcribedText: runtimeVoice?.transcript || proof.description || proof.notes || '',
        summary: runtimeVoice?.summary || (proof.metadata?.summary as string | undefined),
        language: runtimeVoice?.language ?? (proof.metadata?.language as VoiceNote['language']) ?? 'unknown',
        extractedTasks: runtimeVoice?.extracted_tasks ?? [],
        materialMentions: runtimeVoice?.material_mentions ?? [],
        issueMentions: runtimeVoice?.issue_mentions ?? [],
        customerRequests: (proof.metadata?.customer_requests as string[] | undefined) ?? [],
        changeOrderCandidates: runtimeVoice?.change_order_candidates ?? [],
        aiConfidence: typeof proof.metadata?.ai_confidence === 'number' ? proof.metadata.ai_confidence : undefined,
        aiStatus: (proof.metadata?.ai_status as VoiceNote['aiStatus']) ?? 'local',
        timestamp: isoToMs(proof.captured_at),
        category: proof.title || 'Field Note',
        requirementId: proof.requirement_id ?? undefined,
        stageId: stage?.template_stage_id,
        isIssue: proof.metadata?.is_issue === true || proof.user_labels.includes('issue'),
        isChangeOrder: proof.metadata?.is_change_order === true || proof.user_labels.includes('change_order'),
        syncStatus: syncStateToLegacy(proof.sync_state),
        proofHash: proof.integrity_hash ?? proof.hash ?? undefined,
        proofHashAlgorithm: proof.hash_algorithm ?? undefined,
        integrityStatus: proof.integrity_status,
        integrityStampedAt: proof.integrity_stamped_at ?? undefined,
        custodyLog: (proof.chain_of_custody ?? proof.metadata?.custody_log) as VoiceNote['custodyLog'],
      };
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * Canonical application data facade.
 *
 * This replaces the old SiteProofDataService compatibility adapter. It keeps the UI
 * stable while routing persistence through the runtime repositories,
 * RuntimeOrchestrator, SyncRuntime, and app_settings store.
 */
export class SiteProofDataService {
  static async getSyncState(): Promise<SyncState> {
    const fallback = await RuntimeOrchestrator.getPendingSyncState().catch(() => ({
      lastSyncTime: null,
      lastError: null,
      pendingCount: 0,
      isSyncing: false,
    }));
    return AppSettingsService.getValue<SyncState>(SYNC_STATE_KEY, fallback);
  }

  static async updateSyncState(update: Partial<SyncState>): Promise<void> {
    const current = await this.getSyncState();
    await AppSettingsService.setValue<SyncState>(SYNC_STATE_KEY, { ...current, ...update });
  }

  static async getBusinessProfile(): Promise<BusinessProfile | null> {
    return AppSettingsService.getValue<BusinessProfile | null>(BUSINESS_PROFILE_KEY, null);
  }

  static async saveBusinessProfile(profile: BusinessProfile): Promise<void> {
    await AppSettingsService.setValue<BusinessProfile>(BUSINESS_PROFILE_KEY, profile);
  }

  static async getUserProfile(): Promise<UserProfile | null> {
    return AppSettingsService.getValue<UserProfile | null>(USER_PROFILE_KEY, null);
  }

  static async saveUserProfile(profile: UserProfile): Promise<void> {
    await AppSettingsService.setValue<UserProfile>(USER_PROFILE_KEY, profile);
  }

  static async setLastActiveJobId(id: string): Promise<void> {
    await AppSettingsService.setLastActiveJobId(id);
  }

  static async getLastActiveJobId(): Promise<string | null> {
    return AppSettingsService.getLastActiveJobId();
  }

  static async getJobs(): Promise<Job[]> {
    await RuntimeOrchestrator.initialize().catch((error) => console.warn('Runtime initialization failed:', error));
    const runtimeJobs = (await jobRepository.getAll())
      .filter((job) => !job.deleted_at)
      .sort((a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0));
    return Promise.all(runtimeJobs.map(runtimeJobToUiJob));
  }

  static async saveJob(job: Job): Promise<void> {
    await RuntimeOrchestrator.upsertJobFromLegacy({ ...job, updatedAt: Date.now(), syncStatus: job.syncStatus || 'PENDING' });
  }

  static async getRuntimeSnapshot(jobId: string): Promise<RuntimeSnapshot | null> {
    return RuntimeOrchestrator.getRuntimeSnapshot(jobId).catch((error) => {
      console.warn('Runtime snapshot failed:', error);
      return null;
    });
  }

  static async getJobById(id: string): Promise<Job | null> {
    const runtimeJob = await jobRepository.getById(id);
    if (runtimeJob && !runtimeJob.deleted_at) return runtimeJobToUiJob(runtimeJob);
    return null;
  }

  static async deleteJob(id: string): Promise<void> {
    await RuntimeOrchestrator.softDeleteJob(id).catch((error) => {
      console.warn('Runtime orchestration job delete failed:', error);
    });
  }

  static async getPhotos(jobId: string): Promise<JobPhoto[]> {
    return runtimeProofsToUiPhotos(jobId);
  }

  static async savePhoto(photo: JobPhoto): Promise<void> {
    await RuntimeOrchestrator.savePhotoFromLegacy(photo).catch((error) => {
      console.warn('Runtime orchestration photo capture failed:', error);
    });
  }

  static async getVoiceNotes(jobId: string): Promise<VoiceNote[]> {
    return runtimeVoiceNotesToUi(jobId);
  }

  static async saveVoiceNote(note: VoiceNote): Promise<void> {
    await RuntimeOrchestrator.saveVoiceNoteFromLegacy(note).catch((error) => {
      console.warn('Runtime orchestration voice note capture failed:', error);
    });
  }

  static async getLicense(): Promise<License | null> {
    return AppSettingsService.getValue<License | null>(LICENSE_KEY, null);
  }

  static async saveLicense(license: License): Promise<void> {
    await AppSettingsService.setValue<License>(LICENSE_KEY, license);
  }
}
