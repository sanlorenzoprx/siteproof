import { JobPhoto, JobVideo, VoiceNote } from '../domain/models';
import { SiteProofDataService } from './siteProofDataService';
import { TemplateCatalogService } from './templateCatalogService';
import { MediaPipelineService } from './mediaPipelineService';
import { VoiceAIService, VoiceAIAnalysis } from './voiceAIService';
import { ProofIntegrityService } from './proofIntegrityService';
import { SettingsService } from './settingsService';
import { CloudSyncService } from './cloudSyncService';

export interface SavePhotoInput {
  jobId: string;
  dataUrl?: string;
  blob?: Blob;
  category?: string;
  requirementId?: string;
  stageId?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  isIssue?: boolean;
  issueType?: JobPhoto['issueType'];
}

export interface SaveVoiceNoteInput {
  jobId: string;
  transcribedText: string;
  audioBlob?: Blob;
  category?: string;
  requirementId?: string;
  stageId?: string;
  isIssue?: boolean;
  isChangeOrder?: boolean;
  analysis?: VoiceAIAnalysis;
}

export interface SaveVideoInput {
  jobId: string;
  blob: Blob;
  localUrl?: string;
  thumbnailDataUrl?: string | null;
  durationMs: number;
  mimeType: string;
  category?: string;
  requirementId?: string;
  stageId?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

function clampVideoDuration(value: number): number {
  return Math.max(30, Math.min(60, Math.round(value || 60)));
}

function dataUrlToBlob(dataUrl?: string | null): Blob | undefined {
  if (!dataUrl) return undefined;
  const [header, payload] = dataUrl.split(',');
  if (!payload) return undefined;
  const mimeType = header.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

function isWifiConnection(): boolean {
  const connection = (typeof navigator !== 'undefined' ? navigator : undefined) as Navigator & { connection?: { type?: string; effectiveType?: string } };
  const type = connection?.connection?.type?.toLowerCase();
  if (!type) return false;
  return type === 'wifi' || type === 'ethernet';
}

function proofMetadataPayload(
  proofType: 'photo' | 'video' | 'voice_note',
  proof: JobPhoto | JobVideo | VoiceNote,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    schemaVersion: 1,
    proofType,
    proofId: proof.id,
    jobId: proof.jobId,
    category: proof.category,
    requirementId: proof.requirementId ?? null,
    stageId: proof.stageId ?? null,
    timestamp: proof.timestamp,
    language: proof.language ?? null,
    proofHash: proof.proofHash ?? null,
    proofHashAlgorithm: proof.proofHashAlgorithm ?? null,
    integrityStatus: proof.integrityStatus ?? null,
    integrityStampedAt: proof.integrityStampedAt ?? null,
    custodyLog: proof.custodyLog ?? [],
    reportTags: {
      customerSafe: false,
      defaultVisibility: 'private',
      reportVariations: ['office_internal_job_record', 'daily_job_proof', 'photo_proof_timeline'],
    },
    ...extra,
  };
}

async function uploadProofMetadata(proofType: 'photo' | 'video' | 'voice_note', proof: JobPhoto | JobVideo | VoiceNote, extra: Record<string, unknown> = {}, online?: boolean) {
  return CloudSyncService.upload({
    localId: `${proof.id}_metadata`,
    jobId: proof.jobId,
    objectType: 'metadata',
    visibility: 'private',
    payload: proofMetadataPayload(proofType, proof, extra),
    contentType: 'application/json',
  }, online).catch(() => ({ state: 'error' as const, result: undefined }));
}

export class ProofCaptureService {
  static async savePhoto(input: SavePhotoInput): Promise<JobPhoto> {
    const settings = await SettingsService.getSettings();
    const job = await SiteProofDataService.getJobById(input.jobId);
    const context = TemplateCatalogService.getRequirementContext(job?.templateId, input.requirementId);
    const mediaResult = input.blob
      ? await MediaPipelineService.processPhotoBlob(input.blob, input.dataUrl)
      : undefined;

    const photo: JobPhoto = {
      id: crypto.randomUUID(),
      jobId: input.jobId,
      dataUrl: input.dataUrl || mediaResult?.previewDataUrl,
      blob: mediaResult?.originalBlob || input.blob,
      compressedBlob: mediaResult?.compressedBlob,
      thumbnailDataUrl: mediaResult?.thumbnailDataUrl || input.dataUrl,
      width: mediaResult?.width,
      height: mediaResult?.height,
      originalSize: mediaResult?.originalSize ?? input.blob?.size,
      compressedSize: mediaResult?.compressedSize,
      compressionState: mediaResult?.compressionState ?? (input.blob ? 'pending' : undefined),
      thumbnailState: mediaResult?.thumbnailState ?? (input.dataUrl ? 'generated' : undefined),
      qualityScore: mediaResult?.qualityScore,
      category: input.category || context?.requirement.display_name || 'Photo',
      requirementId: input.requirementId || context?.requirement.requirement_id,
      stageId: input.stageId || context?.stage.stage_id,
      timestamp: Date.now(),
      latitude: input.latitude,
      longitude: input.longitude,
      notes: input.notes,
      isIssue: input.isIssue,
      issueType: input.issueType,
      syncStatus: 'PENDING',
      language: settings.captureLanguage,
    };
    await ProofIntegrityService.stampPhoto(photo);
    const photoBlob = photo.compressedBlob ?? photo.blob ?? dataUrlToBlob(photo.dataUrl);
    if (photoBlob) {
      const photoSync = await CloudSyncService.upload({
        localId: photo.id,
        jobId: photo.jobId,
        objectType: 'photo',
        visibility: 'private',
        blob: photoBlob,
        contentType: photoBlob.type || 'image/jpeg',
        fileSize: photoBlob.size,
        sha256: photo.proofHash,
      }).catch(() => ({ state: 'error' as const, result: undefined }));
      photo.cloudObjectKey = photoSync.result?.cloudObjectKey;
    }
    await uploadProofMetadata('photo', photo, {
      notes: photo.notes ?? null,
      isIssue: photo.isIssue ?? false,
      issueType: photo.issueType ?? null,
      gps: { latitude: photo.latitude ?? null, longitude: photo.longitude ?? null },
      media: {
        width: photo.width ?? null,
        height: photo.height ?? null,
        originalSize: photo.originalSize ?? null,
        compressedSize: photo.compressedSize ?? null,
        thumbnailState: photo.thumbnailState ?? null,
        cloudObjectKey: photo.cloudObjectKey ?? null,
      },
    });
    await SiteProofDataService.savePhoto(photo);
    return photo;
  }

  static async saveVideo(input: SaveVideoInput): Promise<JobVideo> {
    const settings = await SettingsService.getSettings();
    if (!settings.videoDefaults.videoEnabled) throw new Error('Video proof capture is disabled in settings.');

    const maxDurationSeconds = clampVideoDuration(settings.videoDefaults.maxVideoDurationSeconds);
    if (input.durationMs > maxDurationSeconds * 1000 + 1000) {
      throw new Error(`Video proof exceeds the ${maxDurationSeconds}s duration limit.`);
    }

    const maxBytes = settings.videoDefaults.maxVideoFileSizeMb * 1024 * 1024;
    if (input.blob.size > maxBytes) {
      throw new Error(`Video proof exceeds the ${settings.videoDefaults.maxVideoFileSizeMb} MB file size limit.`);
    }

    const job = await SiteProofDataService.getJobById(input.jobId);
    const context = TemplateCatalogService.getRequirementContext(job?.templateId, input.requirementId);
    const thumbnailDataUrl = input.thumbnailDataUrl ?? (
      settings.videoDefaults.generateVideoThumbnail
        ? await MediaPipelineService.generateVideoThumbnail(input.blob)
        : null
    );
    const thumbnailBlob = dataUrlToBlob(thumbnailDataUrl);

    const video: JobVideo = {
      id: crypto.randomUUID(),
      jobId: input.jobId,
      blob: input.blob,
      localUrl: input.localUrl,
      thumbnailDataUrl: thumbnailDataUrl ?? undefined,
      thumbnailBlob,
      durationMs: input.durationMs,
      mimeType: input.mimeType || input.blob.type || 'video/webm',
      fileSize: input.blob.size,
      category: input.category || context?.requirement.display_name || 'Video',
      requirementId: input.requirementId || context?.requirement.requirement_id,
      stageId: input.stageId || context?.stage.stage_id,
      timestamp: Date.now(),
      latitude: input.latitude,
      longitude: input.longitude,
      notes: input.notes,
      syncStatus: 'PENDING',
      language: settings.captureLanguage,
    };

    await ProofIntegrityService.stampVideo(video);
    const shouldAttemptVideoUpload = !settings.videoDefaults.uploadVideoOverWifiOnly || isWifiConnection();
    const videoSync = await CloudSyncService.upload({
      localId: video.id,
      jobId: video.jobId,
      objectType: 'video',
      visibility: 'private',
      blob: video.blob,
      contentType: video.mimeType,
      fileSize: video.fileSize,
      sha256: video.proofHash,
    }, shouldAttemptVideoUpload).catch(() => ({ state: 'error' as const, result: undefined }));
    video.cloudSyncState = videoSync.state;
    video.cloudObjectKey = videoSync.result?.cloudObjectKey;

    if (thumbnailBlob) {
      const thumbnailSync = await CloudSyncService.upload({
        localId: `${video.id}_thumbnail`,
        jobId: video.jobId,
        objectType: 'thumbnail',
        visibility: settings.videoDefaults.includeVideoLinksInReports ? 'customer_visible' : 'private',
        blob: thumbnailBlob,
        contentType: thumbnailBlob.type || 'image/jpeg',
        fileSize: thumbnailBlob.size,
      }, shouldAttemptVideoUpload).catch(() => ({ state: 'error' as const, result: undefined }));
      video.thumbnailCloudObjectKey = thumbnailSync.result?.cloudObjectKey;
      if (videoSync.state === 'local_only' || videoSync.state === 'queued') video.cloudSyncState = videoSync.state;
      else if (thumbnailSync.state === 'error') video.cloudSyncState = 'error';
    }

    const metadataSync = await uploadProofMetadata('video', video, {
      notes: video.notes ?? null,
      gps: { latitude: video.latitude ?? null, longitude: video.longitude ?? null },
      media: {
        durationMs: video.durationMs,
        mimeType: video.mimeType,
        fileSize: video.fileSize,
        cloudObjectKey: video.cloudObjectKey ?? null,
        thumbnailCloudObjectKey: video.thumbnailCloudObjectKey ?? null,
      },
      reportTags: {
        customerSafe: settings.videoDefaults.includeVideoLinksInReports,
        defaultVisibility: settings.videoDefaults.includeVideoLinksInReports ? 'customer_visible' : 'private',
        reportVariations: ['office_internal_job_record', 'daily_job_proof', 'photo_proof_timeline'],
      },
    }, shouldAttemptVideoUpload);
    if (videoSync.state === 'synced' && metadataSync.state === 'error') video.cloudSyncState = 'error';

    await SiteProofDataService.saveVideo(video);
    return video;
  }

  static async saveVoiceNote(input: SaveVoiceNoteInput): Promise<VoiceNote> {
    const settings = await SettingsService.getSettings();
    const job = await SiteProofDataService.getJobById(input.jobId);
    const context = TemplateCatalogService.getRequirementContext(job?.templateId, input.requirementId);
    const analysis = VoiceAIService.mergeManualFlags(
      input.analysis ?? VoiceAIService.analyzeTranscript(input.transcribedText, settings.captureLanguage),
      { isIssue: input.isIssue, isChangeOrder: input.isChangeOrder },
    );
    const note: VoiceNote = {
      id: crypto.randomUUID(),
      jobId: input.jobId,
      transcribedText: input.transcribedText,
      transcriptOriginal: input.transcribedText,
      summary: analysis.summary,
      summaryOriginal: analysis.summary,
      language: analysis.language === 'unknown' ? settings.captureLanguage : analysis.language,
      extractedTasks: analysis.extractedTasks,
      materialMentions: analysis.materialMentions,
      issueMentions: analysis.issueMentions,
      customerRequests: analysis.customerRequests,
      changeOrderCandidates: analysis.changeOrderCandidates,
      aiConfidence: analysis.confidence,
      aiStatus: analysis.aiStatus,
      audioBlob: input.audioBlob,
      fileSize: input.audioBlob?.size,
      category: input.category || context?.requirement.display_name || 'Field Note',
      requirementId: input.requirementId || context?.requirement.requirement_id,
      stageId: input.stageId || context?.stage.stage_id,
      timestamp: Date.now(),
      isIssue: analysis.isIssue,
      isChangeOrder: analysis.isChangeOrder,
      syncStatus: 'PENDING',
    };
    await ProofIntegrityService.stampVoiceNote(note);
    if (note.audioBlob) {
      const audioSync = await CloudSyncService.upload({
        localId: note.id,
        jobId: note.jobId,
        objectType: 'voice_note',
        visibility: 'private',
        blob: note.audioBlob,
        contentType: note.audioBlob.type || 'audio/webm',
        fileSize: note.audioBlob.size,
        sha256: note.proofHash,
      }).catch(() => ({ state: 'error' as const, result: undefined }));
      note.cloudObjectKey = audioSync.result?.cloudObjectKey;
      note.cloudSyncState = audioSync.state;
    }
    const transcriptSync = await CloudSyncService.upload({
      localId: `${note.id}_transcript`,
      jobId: note.jobId,
      objectType: 'transcript',
      visibility: 'private',
      payload: {
        schemaVersion: 1,
        voiceNoteId: note.id,
        jobId: note.jobId,
        transcript: note.transcribedText,
        transcriptOriginal: note.transcriptOriginal ?? note.transcribedText,
        summary: note.summary ?? null,
        summaryOriginal: note.summaryOriginal ?? note.summary ?? null,
        language: note.language ?? 'unknown',
        aiConfidence: note.aiConfidence ?? null,
        aiStatus: note.aiStatus ?? 'local',
      },
      contentType: 'application/json',
    }).catch(() => ({ state: 'error' as const, result: undefined }));
    note.transcriptCloudObjectKey = transcriptSync.result?.cloudObjectKey;
    if (!note.cloudSyncState || transcriptSync.state === 'error') note.cloudSyncState = transcriptSync.state;

    const metadataSync = await uploadProofMetadata('voice_note', note, {
      transcriptCloudObjectKey: note.transcriptCloudObjectKey ?? null,
      audioCloudObjectKey: note.cloudObjectKey ?? null,
      tags: {
        extractedTasks: note.extractedTasks ?? [],
        materialMentions: note.materialMentions ?? [],
        issueMentions: note.issueMentions ?? [],
        customerRequests: note.customerRequests ?? [],
        changeOrderCandidates: note.changeOrderCandidates ?? [],
        isIssue: note.isIssue ?? false,
        isChangeOrder: note.isChangeOrder ?? false,
      },
      reportTags: {
        customerSafe: false,
        defaultVisibility: 'private',
        reportVariations: ['office_internal_job_record', 'daily_job_proof', 'change_order_evidence'],
      },
    });
    note.metadataCloudObjectKey = metadataSync.result?.cloudObjectKey;
    if (metadataSync.state === 'error') note.cloudSyncState = 'error';
    await SiteProofDataService.saveVoiceNote(note);
    return note;
  }
}
