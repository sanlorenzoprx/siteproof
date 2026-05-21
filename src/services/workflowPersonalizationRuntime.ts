import { workflowLearningEventRepository } from '../db/repositories/workflowLearningEventRepository';
import { WorkflowLearningEvent, baseSyncFields, baseTimestampFields, newId } from '../db/schema';

export class WorkflowPersonalizationRuntime {
  static recordEvent(input: Omit<WorkflowLearningEvent, 'learning_event_id' | 'created_at' | 'updated_at' | 'deleted_at' | 'sync_state' | 'local_version' | 'remote_version' | 'last_synced_at'>) {
    return workflowLearningEventRepository.create({
      ...input,
      learning_event_id: newId(),
      ...baseTimestampFields(),
      ...baseSyncFields(),
    });
  }

  static getJobLearningEvents(jobId: string) {
    return workflowLearningEventRepository.getByJobId(jobId);
  }

  static getPackLearningEvents(packId: string) {
    return workflowLearningEventRepository.getByPackId(packId);
  }
}
