import { AppSettingsService } from './appSettingsService';

export type PendingAiTaskType =
  | 'business_bio'
  | 'taglines'
  | 'transcribe_audio'
  | 'summarize_job';

export interface PendingAiTask {
  id: string;
  type: PendingAiTaskType;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

const PENDING_AI_TASKS_KEY = 'pending_ai_tasks';
const MAX_PENDING_AI_TASKS = 100;

function newTaskId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class AiTaskQueueService {
  static async enqueue(type: PendingAiTaskType, error?: unknown): Promise<void> {
    const tasks = await this.getPendingTasks();
    const next: PendingAiTask = {
      id: newTaskId(),
      type,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      lastError: error instanceof Error ? error.message : typeof error === 'string' ? error : undefined,
    };

    await AppSettingsService.setValue<PendingAiTask[]>(
      PENDING_AI_TASKS_KEY,
      [next, ...tasks].slice(0, MAX_PENDING_AI_TASKS),
    );
  }

  static async getPendingTasks(): Promise<PendingAiTask[]> {
    return AppSettingsService.getValue<PendingAiTask[]>(PENDING_AI_TASKS_KEY, []);
  }
}
