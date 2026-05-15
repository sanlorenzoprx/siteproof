import { BaseRepository } from './baseRepository';
import { WorkflowStageInstance, StageStatus, baseSyncFields, baseTimestampFields, newId } from '../schema';

export type CreateStageInput = Omit<WorkflowStageInstance, 'stage_instance_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sync_state' | 'local_version' | 'remote_version' | 'last_synced_at' | 'status' | 'completed_required_count' | 'completed_recommended_count' | 'missing_items'> & {
  status?: StageStatus;
  completed_required_count?: number;
  completed_recommended_count?: number;
  missing_items?: string[];
};

class WorkflowStageRepository extends BaseRepository<WorkflowStageInstance> {
  constructor() {
    super('workflow_stage_instances', 'stage_instance_id', 'workflow_stage_instance');
  }

  async createStage(input: CreateStageInput): Promise<WorkflowStageInstance> {
    return this.create({
      ...input,
      stage_instance_id: newId(),
      status: input.status ?? 'not_started',
      completed_required_count: input.completed_required_count ?? 0,
      completed_recommended_count: input.completed_recommended_count ?? 0,
      missing_items: input.missing_items ?? [],
      ...baseTimestampFields(),
      ...baseSyncFields(),
    });
  }

  async getByJob(jobId: string): Promise<WorkflowStageInstance[]> {
    const stages = await this.getByIndex('job_id', jobId);
    return stages.sort((a, b) => a.sort_order - b.sort_order);
  }

  async updateStatus(stageId: string, status: StageStatus): Promise<WorkflowStageInstance | undefined> {
    const stage = await this.getById(stageId);
    if (!stage) return undefined;
    const now = new Date().toISOString();
    return this.put({
      ...stage,
      status,
      started_at: status === 'in_progress' && !stage.started_at ? now : stage.started_at,
      completed_at: status === 'complete' ? now : stage.completed_at,
    });
  }
}

export const workflowStageRepository = new WorkflowStageRepository();
