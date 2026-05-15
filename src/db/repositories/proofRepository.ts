import { BaseRepository } from './baseRepository';
import { ProofObject, ProofType, RequirementPriority, baseSyncFields, baseTimestampFields, newId, nowIso } from '../schema';

export type CreateProofInput = Omit<ProofObject, 'proof_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sync_state' | 'local_version' | 'remote_version' | 'last_synced_at' | 'captured_at' | 'ai_labels' | 'user_labels' | 'inspection_tags' | 'permit_tags' | 'export_tags'> & {
  captured_at?: string;
  proof_type: ProofType;
  priority?: RequirementPriority;
  ai_labels?: string[];
  user_labels?: string[];
  inspection_tags?: string[];
  permit_tags?: string[];
  export_tags?: string[];
};

class ProofRepository extends BaseRepository<ProofObject> {
  constructor() {
    super('proof_objects', 'proof_id', 'proof_object');
  }

  async createProof(input: CreateProofInput): Promise<ProofObject> {
    return this.create({
      ...input,
      proof_id: newId(),
      captured_at: input.captured_at ?? nowIso(),
      ai_labels: input.ai_labels ?? [],
      user_labels: input.user_labels ?? [],
      inspection_tags: input.inspection_tags ?? [],
      permit_tags: input.permit_tags ?? [],
      export_tags: input.export_tags ?? [],
      ...baseTimestampFields(),
      ...baseSyncFields(),
    });
  }

  getByJob(jobId: string): Promise<ProofObject[]> {
    return this.getByIndex('job_id', jobId);
  }

  getByStage(stageInstanceId: string): Promise<ProofObject[]> {
    return this.getByIndex('stage_instance_id', stageInstanceId);
  }

  getByRequirement(requirementId: string): Promise<ProofObject[]> {
    return this.getByIndex('requirement_id', requirementId);
  }

  getByExportTag(tag: string): Promise<ProofObject[]> {
    return this.getByIndex('export_tags', tag);
  }
}

export const proofRepository = new ProofRepository();
