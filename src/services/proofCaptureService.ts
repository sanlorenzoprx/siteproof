import { JobPhoto, VoiceNote } from '../types';
import { SiteProofDataService } from './siteProofDataService';
import { TemplateCatalogService } from './templateCatalogService';
import { MediaPipelineService } from './mediaPipelineService';
import { VoiceAIService, VoiceAIAnalysis } from './voiceAIService';
import { ProofIntegrityService } from './proofIntegrityService';

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

export class ProofCaptureService {
  static async savePhoto(input: SavePhotoInput): Promise<JobPhoto> {
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
    };
    await ProofIntegrityService.stampPhoto(photo);
    await SiteProofDataService.savePhoto(photo);
    return photo;
  }

  static async saveVoiceNote(input: SaveVoiceNoteInput): Promise<VoiceNote> {
    const job = await SiteProofDataService.getJobById(input.jobId);
    const context = TemplateCatalogService.getRequirementContext(job?.templateId, input.requirementId);
    const analysis = VoiceAIService.mergeManualFlags(
      input.analysis ?? VoiceAIService.analyzeTranscript(input.transcribedText),
      { isIssue: input.isIssue, isChangeOrder: input.isChangeOrder },
    );
    const note: VoiceNote = {
      id: crypto.randomUUID(),
      jobId: input.jobId,
      transcribedText: input.transcribedText,
      summary: analysis.summary,
      language: analysis.language,
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
