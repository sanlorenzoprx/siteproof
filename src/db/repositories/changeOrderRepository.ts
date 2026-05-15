import { BaseRepository } from './baseRepository';
import { ChangeOrderCandidate, baseSyncFields, baseTimestampFields, newId } from '../schema';

export type CreateChangeOrderCandidateInput = Omit<ChangeOrderCandidate, 'change_order_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sync_state' | 'local_version' | 'remote_version' | 'last_synced_at'>;

class ChangeOrderRepository extends BaseRepository<ChangeOrderCandidate> {
  constructor() {
    super('change_order_candidates', 'change_order_id', 'change_order_candidate');
  }

  async createCandidate(input: CreateChangeOrderCandidateInput): Promise<ChangeOrderCandidate> {
    return this.create({
      ...input,
      change_order_id: newId(),
      ...baseTimestampFields(),
      ...baseSyncFields(),
    });
  }

  getByJob(jobId: string): Promise<ChangeOrderCandidate[]> {
    return this.getByIndex('job_id', jobId);
  }
}

export const changeOrderRepository = new ChangeOrderRepository();
