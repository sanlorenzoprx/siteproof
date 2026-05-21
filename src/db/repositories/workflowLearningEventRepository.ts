import { WorkflowLearningEvent } from '../schema';
import { BaseRepository } from './baseRepository';

class WorkflowLearningEventRepository extends BaseRepository<WorkflowLearningEvent> {
  constructor() {
    super('workflow_learning_events', 'learning_event_id', 'workflow_learning_event');
  }

  getByJobId(jobId: string): Promise<WorkflowLearningEvent[]> {
    return this.getByIndex('job_id', jobId);
  }

  getByPackId(packId: string): Promise<WorkflowLearningEvent[]> {
    return this.getByIndex('pack_id', packId);
  }
}

export const workflowLearningEventRepository = new WorkflowLearningEventRepository();
