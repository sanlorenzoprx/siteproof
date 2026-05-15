export interface SiteProofAiJobSummaryPayload {
  job: unknown;
  photos: unknown[];
  voiceNotes: unknown[];
  localSummary: string;
}

async function postAi<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`AI API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export class SiteProofAiClient {
  static async generateBusinessBio(voiceTranscript: string, companyName: string): Promise<string> {
    const response = await postAi<{ bio?: string }>('/api/ai/business-bio', {
      voiceTranscript,
      companyName,
    });
    return response.bio?.trim() || '';
  }

  static async generateTaglineOptions(companyName: string, voiceTranscript?: string): Promise<string[]> {
    const response = await postAi<{ taglines?: string[] }>('/api/ai/taglines', {
      companyName,
      voiceTranscript,
    });
    return response.taglines ?? [];
  }

  static async transcribeAudio(audioBase64: string, mimeType = 'audio/webm'): Promise<string> {
    const response = await postAi<{ transcript?: string }>('/api/ai/transcribe', {
      audioBase64,
      mimeType,
    });
    return response.transcript?.trim() || '';
  }

  static async summarizeJob(payload: SiteProofAiJobSummaryPayload): Promise<string> {
    const response = await postAi<{ summary?: string }>('/api/ai/summarize-job', payload);
    return response.summary?.trim() || payload.localSummary;
  }
}
