import { proofRepository } from '../db/repositories/proofRepository';
import { TradeTemplatePackService } from './tradeTemplatePackService';
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
    const pack = TradeTemplatePackService.getPack(job.tradePackId);
    const proof = await proofRepository.getByJob(job.id).catch(() => []);
    const capturedStepIds = new Set(proof.map((item) => item.requirement_id).filter(Boolean));

    return pack.stages
      .flatMap((stage) => stage.steps)
      .filter((step) => (step.required || step.recommended) && !capturedStepIds.has(step.stepId))
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
