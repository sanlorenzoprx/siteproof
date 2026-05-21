import { JobDocument, JobDocumentSourceType, JobDocumentType } from '../db/schema';
import { JobDocumentAdapter } from './jobDocumentAdapter';

export class JobDocumentCaptureRuntime {
  static async captureDocument(input: {
    jobId: string;
    title: string;
    localUri?: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    documentType?: JobDocumentType;
    sourceType?: JobDocumentSourceType;
    stepId?: string;
    stageInstanceId?: string;
    trade?: string;
    specialty?: string;
    jurisdictionId?: string;
    reportTags?: string[];
    inspectionTags?: string[];
    permitTags?: string[];
    notes?: string;
  }): Promise<JobDocument> {
    return JobDocumentAdapter.create({
      jobId: input.jobId,
      workflowStepId: input.stepId,
      documentType: input.documentType ?? (input.permitTags?.[0] as JobDocumentType | undefined) ?? 'permit_document',
      sourceType: input.sourceType ?? (input.localUri ? 'camera_capture' : 'manual_note'),
      title: input.title,
      localUri: input.localUri,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      userNote: input.notes,
      trade: input.trade,
      specialty: input.specialty,
      jurisdictionId: input.jurisdictionId,
      reportTags: input.reportTags,
      inspectionTags: input.inspectionTags,
    });
  }
}
