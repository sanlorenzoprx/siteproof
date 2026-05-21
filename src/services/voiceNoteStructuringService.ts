export interface StructuredVoiceNoteResult {
  summary: string;
  materials: string[];
  issues: string[];
  customerRequests: string[];
  changeOrderCandidates: string[];
  inspectionNotes: string[];
  safetyNotes: string[];
  followUpItems: string[];
}

function findMatches(text: string, keywords: string[]) {
  const lower = text.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword));
}

export class VoiceNoteStructuringService {
  static structureTranscript(transcript: string): StructuredVoiceNoteResult {
    const trimmed = transcript.trim();
    return {
      summary: trimmed.length > 240 ? `${trimmed.slice(0, 237)}...` : trimmed,
      materials: findMatches(trimmed, ['pipe', 'wire', 'panel', 'shingle', 'unit', 'generator', 'fuel line', 'conduit']),
      issues: findMatches(trimmed, ['issue', 'problem', 'leak', 'damage', 'blocked', 'failed', 'missing']),
      customerRequests: findMatches(trimmed, ['customer asked', 'customer requested', 'owner asked', 'client requested']),
      changeOrderCandidates: findMatches(trimmed, ['extra', 'change order', 'additional', 'not in scope', 'hidden']),
      inspectionNotes: findMatches(trimmed, ['inspection', 'inspector', 'permit', 'correction', 'punch list', 'ahj']),
      safetyNotes: findMatches(trimmed, ['unsafe', 'hazard', 'safety', 'shut off', 'lockout']),
      followUpItems: findMatches(trimmed, ['follow up', 'return', 'schedule', 'call back', 'needs review']),
    };
  }
}
