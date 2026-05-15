import { VoiceNote } from '../types';

export type VoiceLanguage = 'en' | 'es' | 'unknown';

export interface VoiceAIAnalysis {
  language: VoiceLanguage;
  summary: string;
  extractedTasks: string[];
  materialMentions: string[];
  issueMentions: string[];
  customerRequests: string[];
  changeOrderCandidates: string[];
  isIssue: boolean;
  isChangeOrder: boolean;
  confidence: number;
  aiStatus: 'local' | 'cloud' | 'unavailable';
}

const MATERIAL_PATTERNS = [
  /\b(?:conduit|wire|wires|breaker|panel|meter|transfer switch|ats|generator|pad|concrete|fuel line|gas line|propane|natural gas|disconnect|ground(?:ing)?|rod|lug|battery|trench|pipe|cable|junction box|receptacle|outlet)\b/gi,
  /\b(?:conducto|cable|cables|breaker|panel|medidor|transferencia|generador|base|concreto|línea de gas|linea de gas|propano|gas natural|desconectador|tierra|varilla|batería|bateria|zanja|tubería|tuberia|caja|tomacorriente)\b/gi,
];

const ISSUE_PATTERNS = [
  /\b(?:issue|problem|blocked|unsafe|hazard|missing|damaged|broken|failed|failure|deficiency|defective|corroded|leaking|leak|wet|mold|rot|rotted|cracked|not working|won't fit|cannot access)\b/gi,
  /\b(?:problema|bloqueado|inseguro|peligro|falta|dañado|danado|roto|fall[oó]|deficiencia|defectuoso|corro[ií]do|goteo|mojado|moho|podrido|rajado|no funciona|no cabe|sin acceso)\b/gi,
];

const CHANGE_ORDER_PATTERNS = [
  /\b(?:change order|extra work|additional work|customer requested|relocate|relocation|upgrade|upsized|unexpected|not in scope|extra trench|extra conduit|added|add-on|billable|more time|additional charge)\b/gi,
  /\b(?:orden de cambio|trabajo extra|trabajo adicional|cliente pidi[oó]|reubicar|reubicaci[oó]n|mejora|inesperado|fuera del alcance|zanja extra|conducto extra|añadido|anadido|facturable|m[aá]s tiempo|cargo adicional)\b/gi,
];

const CUSTOMER_REQUEST_PATTERNS = [
  /\b(?:customer asked|customer requested|client asked|client requested|owner asked|owner requested|homeowner asked|homeowner requested|wants|would like|requested)\b[^.?!]*/gi,
  /\b(?:cliente pidi[oó]|cliente solicit[oó]|dueño pidi[oó]|dueno pidio|propietario pidi[oó]|quiere|solicit[oó])\b[^.?!]*/gi,
];

const TASK_PATTERNS = [
  /\b(?:need to|needs to|must|follow up|return to|schedule|call|order|pick up|install|replace|repair|verify|check|send|document)\b[^.?!]*/gi,
  /\b(?:hay que|necesita|necesitamos|debe|seguimiento|volver|programar|llamar|ordenar|recoger|instalar|reemplazar|reparar|verificar|revisar|enviar|documentar)\b[^.?!]*/gi,
];

function uniqueClean(values: string[], max = 6): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.replace(/\s+/g, ' ').trim())
    .filter((value) => value.length > 1)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, max);
}

function extractMatches(text: string, patterns: RegExp[], max = 6): string[] {
  const matches: string[] = [];
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      matches.push(match[0]);
    }
  }
  return uniqueClean(matches, max);
}

function detectLanguage(text: string): VoiceLanguage {
  const lower = text.toLowerCase();
  const spanishHits = [
    'el ', 'la ', 'los ', 'las ', 'que ', 'para ', 'con ', 'cliente', 'trabajo', 'necesita', 'hay que', 'generador', 'medidor', 'tierra', 'zanja', 'permiso', 'inspección', 'inspeccion', 'dañado', 'danado', 'reparar', 'instalar', 'solicitó', 'solicito', 'pidió', 'pidio',
  ].filter((token) => lower.includes(token)).length;
  const englishHits = [
    'the ', 'and ', 'customer', 'work', 'need', 'install', 'repair', 'panel', 'meter', 'generator', 'inspection', 'permit', 'requested', 'issue', 'change order',
  ].filter((token) => lower.includes(token)).length;

  if (spanishHits >= 2 && spanishHits > englishHits) return 'es';
  if (englishHits >= 2) return 'en';
  return 'unknown';
}

function sentenceSplit(text: string): string[] {
  return text
    .split(/[.?!\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildSummary(text: string, language: VoiceLanguage): string {
  const sentences = sentenceSplit(text);
  if (sentences.length === 0) return language === 'es' ? 'Nota de campo guardada sin transcripción clara.' : 'Field note saved without a clear transcript.';
  const first = sentences[0];
  const second = sentences.find((sentence) => /issue|problem|extra|change|requested|problema|extra|cambio|solicit|pidi/i.test(sentence));
  const summary = uniqueClean([first, second ?? ''], 2).join('. ');
  return summary.length > 180 ? `${summary.slice(0, 177).trim()}...` : summary;
}

export class VoiceAIService {
  static analyzeTranscript(transcript: string): VoiceAIAnalysis {
    const cleanTranscript = transcript?.trim() || '';
    const language = detectLanguage(cleanTranscript);
    const materialMentions = extractMatches(cleanTranscript, MATERIAL_PATTERNS, 8);
    const issueMentions = extractMatches(cleanTranscript, ISSUE_PATTERNS, 8);
    const customerRequests = extractMatches(cleanTranscript, CUSTOMER_REQUEST_PATTERNS, 5);
    const changeOrderCandidates = extractMatches(cleanTranscript, CHANGE_ORDER_PATTERNS, 6);
    const extractedTasks = extractMatches(cleanTranscript, TASK_PATTERNS, 6);
    const hasMeaningfulTranscript = cleanTranscript.length > 3 && !/unintelligible|unavailable|no speech/i.test(cleanTranscript);

    return {
      language,
      summary: buildSummary(cleanTranscript, language),
      extractedTasks,
      materialMentions,
      issueMentions,
      customerRequests,
      changeOrderCandidates,
      isIssue: issueMentions.length > 0,
      isChangeOrder: changeOrderCandidates.length > 0 || customerRequests.some((request) => /relocate|upgrade|extra|additional|reubicar|mejora|extra|adicional/i.test(request)),
      confidence: hasMeaningfulTranscript ? 0.74 : 0.2,
      aiStatus: 'local',
    };
  }

  static mergeManualFlags(analysis: VoiceAIAnalysis, flags: Pick<VoiceNote, 'isIssue' | 'isChangeOrder'>): VoiceAIAnalysis {
    return {
      ...analysis,
      isIssue: analysis.isIssue || Boolean(flags.isIssue),
      isChangeOrder: analysis.isChangeOrder || Boolean(flags.isChangeOrder),
    };
  }
}
