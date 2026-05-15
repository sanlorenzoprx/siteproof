import { AiProvider, AiTaskType, WorkerEnv, WorkersAiBinding } from './types';

function textFromWorkersAiResult(result: unknown): string {
  if (typeof result === 'string') return result.trim();
  if (!result || typeof result !== 'object') return '';

  const value = result as Record<string, unknown>;
  const candidates = [value.response, value.result, value.text, value.transcription];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }

  const choices = value.choices;
  if (Array.isArray(choices)) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    if (typeof message?.content === 'string') return message.content.trim();
  }

  return '';
}

function systemPromptFor(task: AiTaskType, input: Record<string, unknown>): string {
  switch (task) {
    case 'business_bio':
      return `You are a professional business copywriter. Transform notes about "${String(input.companyName ?? 'SiteProof customer')}" into a concise 150-300 character business bio. Respond only with the bio text.`;
    case 'taglines':
      return 'You are a branding expert. Return only a JSON array of 4 short tagline strings.';
    case 'summarize_job':
    case 'summarize_voice_note':
      return 'You summarize field proof for contractor reports. Keep it factual, concise, and do not invent compliance claims.';
    case 'extract_job_details':
      return 'Extract only clear job details from the provided field notes. Return compact JSON.';
    case 'classify_proof':
      return 'Classify the proof item using only visible or provided evidence. Return compact JSON.';
    case 'detect_change_order':
      return 'Detect possible change-order language from field notes. Return compact JSON with conservative confidence.';
    case 'review_feature':
      return 'Review the SiteProof feature using architecture, workflow, proof, offline, sync, security, and test lenses. Return concise JSON.';
    default:
      return 'Process this SiteProof field task. Return concise factual output.';
  }
}

function userPromptFor(task: AiTaskType, input: Record<string, unknown>): string {
  if (task === 'business_bio') return String(input.voiceTranscript ?? '');
  if (task === 'taglines') return `Company: ${String(input.companyName ?? '')}\nContext: ${String(input.voiceTranscript ?? '')}`;
  return JSON.stringify(input);
}

export class WorkersAiProvider implements AiProvider {
  private readonly textModel: string;
  private readonly transcribeModel: string;

  constructor(private readonly ai: WorkersAiBinding, env: WorkerEnv) {
    this.textModel = env.AI_TEXT_MODEL || '@cf/meta/llama-3.1-8b-instruct';
    this.transcribeModel = env.AI_TRANSCRIBE_MODEL || '@cf/openai/whisper';
  }

  async run(task: AiTaskType, input: Record<string, unknown>): Promise<unknown> {
    if (task === 'transcribe_audio') {
      const audioBase64 = String(input.audioBase64 ?? '');
      if (!audioBase64 || audioBase64.length < 10) return '';
      return textFromWorkersAiResult(await this.ai.run(this.transcribeModel, { audio: audioBase64 }));
    }

    return textFromWorkersAiResult(await this.ai.run(this.textModel, {
      messages: [
        { role: 'system', content: systemPromptFor(task, input) },
        { role: 'user', content: userPromptFor(task, input) },
      ],
    }));
  }
}
