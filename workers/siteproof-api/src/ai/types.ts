export type AiTaskType =
  | 'summarize_voice_note'
  | 'extract_job_details'
  | 'classify_proof'
  | 'detect_change_order'
  | 'review_feature'
  | 'business_bio'
  | 'taglines'
  | 'transcribe_audio'
  | 'summarize_job';

export interface AiProvider {
  run(task: AiTaskType, input: Record<string, unknown>): Promise<unknown>;
}

export interface WorkersAiRunOptions {
  messages?: Array<{ role: 'system' | 'user'; content: string }>;
  prompt?: string;
  audio?: string;
}

export interface WorkersAiBinding {
  run(model: string, options: WorkersAiRunOptions): Promise<unknown>;
}

export interface WorkerEnv {
  AI: WorkersAiBinding;
  SITEPROOF_DB?: unknown;
  DB?: unknown;
  SITEPROOF_MEDIA?: unknown;
  SITEPROOF_EXPORTS?: unknown;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SITEPROOF_LICENSE_SIGNING_SECRET?: string;
  SITEPROOF_APP_URL?: string;
  CHECKOUT_SUCCESS_URL?: string;
  CHECKOUT_CANCEL_URL?: string;
  AI_TEXT_MODEL?: string;
  AI_TRANSCRIBE_MODEL?: string;
}
