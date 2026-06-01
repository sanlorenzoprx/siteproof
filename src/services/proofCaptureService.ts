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
    await SiteProofDataService.saveVoiceNote(note);
    return note;
  }
}
