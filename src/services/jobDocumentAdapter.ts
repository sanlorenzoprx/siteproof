import { jobDocumentsRepository } from '../db/repositories/jobDocumentsRepository';
import { mediaRepository } from '../db/repositories/mediaRepository';
import { proofRepository } from '../db/repositories/proofRepository';
import { JobDocument, JobDocumentSourceType, JobDocumentType, ProofObject } from '../db/schema';

export interface CreateJobDocumentAdapterInput {
  jobId: string;
  documentType: JobDocumentType;
  sourceType: JobDocumentSourceType;
  title: string;
  workflowStepId?: string | null;
  localUri?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number;
  userNote?: string | null;
  trade?: string | null;
  specialty?: string | null;
  jurisdictionId?: string | null;
  reportTags?: string[];
  inspectionTags?: string[];
  createProofObject?: boolean;
}

function tagsForDocumentType(documentType: JobDocumentType): { reportTags: string[]; inspectionTags: string[] } {
  if (documentType === 'customer_authorization') {
    return { reportTags: ['customer_completion', 'payment_handoff', 'office_ready'], inspectionTags: [] };
  }
  if (documentType === 'change_order_approval') {
    return { reportTags: ['change_order_evidence', 'payment_handoff', 'office_ready'], inspectionTags: [] };
  }
  if (documentType === 'other') {
    return { reportTags: ['office_ready'], inspectionTags: [] };
  }
  return { reportTags: ['inspection_readiness', 'office_ready'], inspectionTags: [documentType] };
}

function documentFromProof(proof: ProofObject): JobDocument {
  const timestamp = proof.captured_at ?? proof.created_at;
  return {
    document_id: `legacy-proof-${proof.proof_id}`,
    job_id: proof.job_id,
    workflow_step_id: proof.requirement_id ?? null,
    proof_object_id: proof.proof_id,
    media_asset_id: null,
    document_type: (proof.permit_tags[0] as JobDocumentType | undefined) ?? 'other',
    source_type: 'camera_capture',
    local_uri: null,
    file_name: proof.title,
    mime_type: null,
    user_note: proof.notes ?? proof.description ?? null,
    extracted_text: null,
    trade: typeof proof.metadata?.trade === 'string' ? proof.metadata.trade : null,
    specialty: typeof proof.metadata?.specialty === 'string' ? proof.metadata.specialty : null,
    jurisdiction_id: typeof proof.metadata?.jurisdictionId === 'string' ? proof.metadata.jurisdictionId : null,
    timestamp,
    gps_latitude: proof.gps_latitude ?? null,
    gps_longitude: proof.gps_longitude ?? null,
    gps_accuracy: proof.gps_accuracy_meters ?? null,
    report_tags: proof.export_tags,
    inspection_tags: proof.inspection_tags,
    document_sync_state: proof.sync_state === 'synced' ? 'synced' : proof.sync_state === 'local_only' ? 'local_only' : 'pending_sync',
    created_at: proof.created_at,
    updated_at: proof.updated_at,
    deleted_at: proof.deleted_at ?? null,
    sync_state: proof.sync_state,
    local_version: proof.local_version,
    remote_version: proof.remote_version,
    last_synced_at: proof.last_synced_at,
  };
}

export class JobDocumentAdapter {
  static async create(input: CreateJobDocumentAdapterInput): Promise<JobDocument> {
    const defaults = tagsForDocumentType(input.documentType);
    const reportTags = input.reportTags ?? defaults.reportTags;
    const inspectionTags = input.inspectionTags ?? defaults.inspectionTags;
    let proofObjectId: string | null = null;
    let mediaAssetId: string | null = null;

    if (input.createProofObject ?? true) {
      const proof = await proofRepository.createProof({
        job_id: input.jobId,
        requirement_id: input.workflowStepId ?? 'job_document',
        proof_type: 'document',
        title: input.title,
        description: input.userNote ?? null,
        required_flag: false,
        priority: 'recommended',
        inspection_tags: inspectionTags,
        permit_tags: [input.documentType],
        export_tags: reportTags,
        notes: input.userNote ?? null,
        metadata: {
          documentType: input.documentType,
          trade: input.trade,
          specialty: input.specialty,
          jurisdictionId: input.jurisdictionId,
          capture_runtime: 'job_document_adapter',
          offline_first: true,
        },
      });
      proofObjectId = proof.proof_id;

      if (input.localUri) {
        const media = await mediaRepository.createMedia({
          proof_id: proof.proof_id,
          job_id: input.jobId,
          local_uri: input.localUri,
          mime_type: input.mimeType ?? 'application/octet-stream',
          file_name: input.fileName ?? input.title,
          file_size: input.fileSize ?? 0,
          compression_state: 'not_needed',
          upload_state: 'local_only',
        });
        mediaAssetId = media.media_id;
      }
    }

    return jobDocumentsRepository.createJobDocument({
      job_id: input.jobId,
      workflow_step_id: input.workflowStepId ?? null,
      proof_object_id: proofObjectId,
      media_asset_id: mediaAssetId,
      document_type: input.documentType,
      source_type: input.sourceType,
      local_uri: input.localUri ?? null,
      file_name: input.fileName ?? input.title,
      mime_type: input.mimeType ?? null,
      user_note: input.userNote ?? null,
      extracted_text: null,
      trade: input.trade ?? null,
      specialty: input.specialty ?? null,
      jurisdiction_id: input.jurisdictionId ?? null,
      gps_latitude: null,
      gps_longitude: null,
      gps_accuracy: null,
      report_tags: reportTags,
      inspection_tags: inspectionTags,
      document_sync_state: input.localUri ? 'local_only' : 'pending_sync',
    });
  }

  static async listForJobIncludingLegacy(jobId: string): Promise<JobDocument[]> {
    const [documents, proof] = await Promise.all([
      jobDocumentsRepository.listJobDocumentsForJob(jobId).catch(() => []),
      proofRepository.getByJob(jobId).catch(() => []),
    ]);
    const linkedProofIds = new Set(documents.map((document) => document.proof_object_id).filter(Boolean));
    const legacyDocuments = proof
      .filter((item) => item.proof_type === 'document' && !linkedProofIds.has(item.proof_id))
      .map(documentFromProof);
    return [...documents, ...legacyDocuments];
  }
}
