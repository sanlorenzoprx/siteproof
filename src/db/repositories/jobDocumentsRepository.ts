import { BaseRepository } from './baseRepository';
import {
  JobDocument,
  JobDocumentSyncState,
  JobDocumentType,
  JobDocumentSourceType,
  baseSyncFields,
  baseTimestampFields,
  newId,
  nowIso,
} from '../schema';

export type CreateJobDocumentInput = Omit<
  JobDocument,
  | 'document_id'
  | 'created_at'
  | 'updated_at'
  | 'deleted_at'
  | 'sync_state'
  | 'local_version'
  | 'remote_version'
  | 'last_synced_at'
  | 'timestamp'
  | 'document_sync_state'
> & {
  document_id?: string;
  timestamp?: string;
  document_type: JobDocumentType;
  source_type: JobDocumentSourceType;
  document_sync_state?: JobDocumentSyncState;
};

class JobDocumentsRepository extends BaseRepository<JobDocument> {
  constructor() {
    super('job_documents', 'document_id', 'job_document');
  }

  async createJobDocument(input: CreateJobDocumentInput): Promise<JobDocument> {
    return this.create({
      ...input,
      document_id: input.document_id ?? newId(),
      timestamp: input.timestamp ?? nowIso(),
      report_tags: input.report_tags ?? [],
      inspection_tags: input.inspection_tags ?? [],
      document_sync_state: input.document_sync_state ?? 'pending_sync',
      ...baseTimestampFields(),
      ...baseSyncFields(),
    });
  }

  getJobDocument(documentId: string): Promise<JobDocument | undefined> {
    return this.getById(documentId);
  }

  listJobDocumentsForJob(jobId: string): Promise<JobDocument[]> {
    return this.getByIndex('job_id', jobId);
  }

  async listJobDocumentsForWorkflowStep(jobId: string, workflowStepId: string): Promise<JobDocument[]> {
    const documents = await this.getByIndex('workflow_step_id', workflowStepId);
    return documents.filter((document) => document.job_id === jobId);
  }

  async updateJobDocument(documentId: string, patch: Partial<JobDocument>): Promise<JobDocument | undefined> {
    const current = await this.getById(documentId);
    if (!current) return undefined;
    return this.put({ ...current, ...patch, updated_at: nowIso() }, 'update');
  }

  async markJobDocumentSyncState(documentId: string, syncState: JobDocumentSyncState): Promise<JobDocument | undefined> {
    return this.updateJobDocument(documentId, {
      document_sync_state: syncState,
      sync_state: syncState === 'synced' ? 'synced' : syncState === 'local_only' ? 'local_only' : 'pending_upload',
    });
  }

  deleteJobDocument(documentId: string): Promise<void> {
    return this.softDelete(documentId);
  }
}

export const jobDocumentsRepository = new JobDocumentsRepository();
