import { mediaRepository } from '../db/repositories/mediaRepository';
import { proofRepository } from '../db/repositories/proofRepository';
import { ProofObject } from '../db/schema';

export class JobDocumentCaptureRuntime {
  static async captureDocument(input: {
    jobId: string;
    title: string;
    localUri?: string;
    fileName?: string;
    mimeType?: string;
    fileSize?: number;
    stepId?: string;
    stageInstanceId?: string;
    reportTags?: string[];
    inspectionTags?: string[];
    permitTags?: string[];
    notes?: string;
  }): Promise<ProofObject> {
    const proof = await proofRepository.createProof({
      job_id: input.jobId,
      stage_instance_id: input.stageInstanceId ?? null,
      requirement_id: input.stepId ?? 'job_document',
      proof_type: 'document',
      title: input.title,
      description: input.notes ?? null,
      required_flag: false,
      priority: 'recommended',
      inspection_tags: input.inspectionTags ?? ['inspection_document'],
      permit_tags: input.permitTags ?? ['permit_document'],
      export_tags: input.reportTags ?? ['inspection_readiness', 'office_ready'],
      notes: input.notes ?? null,
      metadata: { capture_runtime: 'job_document_capture', offline_first: true },
    });

    if (input.localUri) {
      await mediaRepository.createMedia({
        proof_id: proof.proof_id,
        job_id: input.jobId,
        local_uri: input.localUri,
        mime_type: input.mimeType ?? 'application/octet-stream',
        file_name: input.fileName ?? input.title,
        file_size: input.fileSize ?? 0,
        compression_state: 'not_needed',
        upload_state: 'local_only',
      });
    }

    return proof;
  }
}
