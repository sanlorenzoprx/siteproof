import { Job, JobPhoto, VoiceNote } from '../types';
import { AIService } from './aiService';
import { TemplateCatalogService } from './templateCatalogService';

export interface AuditResult {
  score: number;
  missingSteps: string[];
  suggestions: string[];
  issuesIdentified: { type: string; description: string; impact: string }[];
  isChangeOrderCandidate: boolean;
}

export class AIForemanService {
  static async auditProject(job: Job, photos: JobPhoto[], voiceNotes: VoiceNote[]): Promise<AuditResult> {
    const template = TemplateCatalogService.getTemplate(job.templateId);
    const requiredSteps = template.stages.flatMap(stage =>
      (stage.proof_requirements ?? [])
        .filter(requirement => requirement.priority === 'required')
        .map(requirement => ({ stage, requirement })),
    );
    const missingSteps = requiredSteps
      .filter(({ requirement }) => !photos.some(p => p.requirementId === requirement.requirement_id || p.category === requirement.display_name))
      .map(({ requirement }) => requirement.display_name);

    const score = requiredSteps.length > 0 
      ? Math.round(((requiredSteps.length - missingSteps.length) / requiredSteps.length) * 100) 
      : 100;

    // Route optional analysis through the backend AI boundary.
    const analysisPrompt = `
      You are an AI Field Foreman auditing a construction job.
      Job Type: ${job.jobType}
      Customer: ${job.customerName}
      Photos Taken: ${photos.length} across categories: ${photos.map(p => p.category).join(', ')}
      Voice Notes Tracked: 
      ${voiceNotes.map(v => `- [${v.category}] ${v.transcribedText}`).join('\n')}

      Analyze the documentation for:
      1. Potential Change Orders (unplanned work, customer requests, hidden obstacles).
      2. Safety Concerns (hazards mentioned).
      3. Technical Deficiencies.
      
      Return a JSON object with:
      {
        "suggestions": ["improvement tip 1", ...],
        "issues": [{ "type": "SAFETY|DEFICIENCY|CHANGE_ORDER", "description": "...", "impact": "LOW|MED|HIGH" }],
        "isChangeOrderCandidate": boolean
      }
    `;

    try {
      const responseText = await AIService.summarizeJob(job, photos, voiceNotes); // Reusing AIService for now
      // In a real implementation, we'd use a more specific JSON prompt
      // For this prototype, let's parse a structured response or use a heuristic if AI fails
      
      return {
        score,
        missingSteps,
        suggestions: ["Ensure all labels are clearly visible in the final photo."],
        issuesIdentified: voiceNotes
          .filter(v => v.transcribedText.toLowerCase().includes('change') || v.transcribedText.toLowerCase().includes('extra'))
          .map(v => ({ type: 'CHANGE_ORDER', description: v.transcribedText, impact: 'HIGH' })),
        isChangeOrderCandidate: voiceNotes.some(v => v.transcribedText.toLowerCase().includes('change') || v.transcribedText.toLowerCase().includes('approval'))
      };
    } catch (e) {
      return {
        score,
        missingSteps,
        suggestions: ["Review voice entries manually for change orders."],
        issuesIdentified: [],
        isChangeOrderCandidate: false
      };
    }
  }
}
