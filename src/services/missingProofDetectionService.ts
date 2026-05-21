import { proofRepository } from '../db/repositories/proofRepository';
import { workflowLearningEventRepository } from '../db/repositories/workflowLearningEventRepository';
import { TradeTemplatePackService } from './tradeTemplatePackService';
import { TemplateCatalogService } from './templateCatalogService';
import { WorkflowPersonalizationRuntime } from './workflowPersonalizationRuntime';

export interface MissingProofWarning {
  stepId: string;
  title: string;
  required: boolean;
  warning: string;
  action: 'capture_missing_proof' | 'mark_not_needed' | 'generate_anyway';
}

export class MissingProofDetectionService {
  static async getWarnings(job: { id: string; tradePackId?: string; trade?: string; specialty?: string }): Promise<MissingProofWarning[]> {
    const template = TemplateCatalogService.getTemplate(job.tradePackId);
    const pack = TradeTemplatePackService.getPack(job.tradePackId);
    const [proof, learningEvents] = await Promise.all([
      proofRepository.getByJob(job.id).catch(() => []),
      workflowLearningEventRepository.getByJobId(job.id).catch(() => []),
    ]);
    const capturedStepIds = new Set(proof.map((item) => item.requirement_id).filter(Boolean));
    const notNeededStepIds = new Set(
      learningEvents
        .filter((event) => event.action === 'mark_not_needed' && !event.deleted_at)
        .map((event) => event.step_id),
    );

    if (template) {
      return template.stages
        .flatMap((stage) => stage.proof_requirements ?? [])
        .filter((requirement) =>
          (requirement.priority === 'required' || requirement.priority === 'recommended') &&
          !capturedStepIds.has(requirement.requirement_id) &&
          !notNeededStepIds.has(requirement.requirement_id),
        )
        .map((requirement) => ({
          stepId: requirement.requirement_id,
          title: requirement.display_name,
          required: requirement.priority === 'required',
          warning: requirement.capture_hint ?? requirement.field_instruction,
          action: requirement.priority === 'required' ? 'capture_missing_proof' : 'mark_not_needed',
        }));
    }

    return pack.stages
      .flatMap((stage) => stage.steps)
      .filter((step) => (step.required || step.recommended) && !capturedStepIds.has(step.stepId) && !notNeededStepIds.has(step.stepId))
      .map((step) => ({
        stepId: step.stepId,
        title: step.title,
        required: step.required,
        warning: step.missingProofWarning,
        action: step.required ? 'capture_missing_proof' : 'mark_not_needed',
      }));
  }

  static markNotNeeded(job: { id: string; tradePackId?: string; trade?: string; specialty?: string }, stepId: string, reason?: string) {
    const pack = TradeTemplatePackService.getPack(job.tradePackId);
    return WorkflowPersonalizationRuntime.recordEvent({
      job_id: job.id,
      pack_id: pack.packId,
      trade: job.trade ?? pack.trade,
      specialty: job.specialty ?? pack.specialty,
      step_id: stepId,
      action: 'mark_not_needed',
      reason: reason ?? null,
      applies_to_future_jobs: false,
      metadata: { source: 'missing_proof_detection', warning_action: 'step_marked_not_needed' },
    });
  }

  static generateAnyway(job: { id: string; tradePackId?: string; trade?: string; specialty?: string }, stepId = 'pro_report_generation', reason?: string) {
    const pack = TradeTemplatePackService.getPack(job.tradePackId);
    return WorkflowPersonalizationRuntime.recordEvent({
      job_id: job.id,
      pack_id: pack.packId,
      trade: job.trade ?? pack.trade,
      specialty: job.specialty ?? pack.specialty,
      step_id: stepId,
      action: 'generate_anyway',
      reason: reason ?? null,
      applies_to_future_jobs: false,
      metadata: { source: 'missing_proof_detection', warning_action: 'missing_proof_warning_ignored' },
    });
  }
}
