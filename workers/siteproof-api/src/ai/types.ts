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

export interface R2BucketBinding {
  put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob | null,
    options?: {
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
  get?(key: string): Promise<{
    body: ReadableStream | null;
    size?: number;
    httpMetadata?: { contentType?: string };
    customMetadata?: Record<string, string>;
  } | null>;
  head?(key: string): Promise<{ size?: number; customMetadata?: Record<string, string> } | null>;
}

export interface WorkerEnv {
  AI: WorkersAiBinding;
  ALLOWED_ORIGINS?: string; // comma-separated allowed CORS origins
  RATE_LIMIT_KV?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  };
  STRIPE_WEBHOOK_SECRET?: string;
  SITEPROOF_DB?: unknown;
  DB?: unknown;
  SITEPROOF_MEDIA?: R2BucketBinding;
  SITEPROOF_EXPORTS?: R2BucketBinding;
  AI_TEXT_MODEL?: string;
  AI_TRANSCRIBE_MODEL?: string;
}
