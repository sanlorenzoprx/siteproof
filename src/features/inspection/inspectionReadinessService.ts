import generatorTemplateJson from '../../templates/generator_install_v1.json';
import { proofRepository, templateRepository, workflowStageRepository } from '../../db/repositories';
import { ProofObject, WorkflowStageInstance, nowIso } from '../../db/schema';
import { ExportPacketType, ProofRequirement, WorkflowStageTemplate, WorkflowTemplate } from '../../templates/workflowTemplate.types';

export type InspectionIssueType =
  | 'missing_proof'
  | 'low_quality'
  | 'missing_gps'
  | 'missing_timestamp'
  | 'missing_checklist'
  | 'missing_stage'
  | 'jurisdiction_warning'
  | 'validation_failure';

export interface InspectionIssue {
  issue_id: string;
  issue_type: InspectionIssueType;
  severity: 'warning' | 'blocking';
  stage_id?: string | null;
  stage_name?: string | null;
  requirement_id?: string | null;
  proof_id?: string | null;
  title: string;
  description: string;
  recommended_action?: string | null;
  created_at: string;
}

export interface InspectionReadinessResult {
  job_id: string;
  packet_type: Extract<ExportPacketType, 'inspector_packet'>;
  readiness_score: number;
  status: 'not_ready' | 'warning' | 'ready';
  blocking_items: InspectionIssue[];
  warning_items: InspectionIssue[];
  completed_requirements: number;
  total_requirements: number;
  completed_stages: number;
  total_stages: number;
  generated_at: string;
  grouped_blocking_items: Record<string, InspectionIssue[]>;
  grouped_warning_items: Record<string, InspectionIssue[]>;
  first_missing_requirement?: {
    stage: WorkflowStageTemplate;
    requirement: ProofRequirement;
  } | null;
}

const bundledGeneratorTemplate = generatorTemplateJson as WorkflowTemplate;

function getRequirementMinimum(requirement: ProofRequirement): number {
  return typeof requirement.minimum_count === 'number' ? requirement.minimum_count : 1;
}

function requirementAppliesToInspector(requirement: ProofRequirement): boolean {
  return requirement.export_tags?.includes('inspector_packet') || requirement.inspection_tags?.length > 0;
}

function isBlockingRequirement(requirement: ProofRequirement): boolean {
  return requirement.priority === 'required' || requirement.priority === 'conditional';
}

function groupByStage(issues: InspectionIssue[]): Record<string, InspectionIssue[]> {
  return issues.reduce<Record<string, InspectionIssue[]>>((acc, issue) => {
    const key = issue.stage_name || issue.stage_id || 'General';
    acc[key] = acc[key] || [];
    acc[key].push(issue);
    return acc;
  }, {});
}

function issueId(...parts: Array<string | number | null | undefined>): string {
  return parts.filter(Boolean).join('__');
}

async function loadTemplate(templateId = 'generator_install_v1'): Promise<WorkflowTemplate> {
  const cached = await templateRepository.getByTemplateId(templateId).catch(() => undefined);
  if (cached?.full_template_json) return cached.full_template_json as WorkflowTemplate;
  return bundledGeneratorTemplate;
}

export class InspectionReadinessService {
  static async getInspectionReadiness(jobId: string, packetType: Extract<ExportPacketType, 'inspector_packet'> = 'inspector_packet'): Promise<InspectionReadinessResult> {
    const [stages, proofs] = await Promise.all([
      workflowStageRepository.getByJob(jobId),
      proofRepository.getByJob(jobId),
    ]);

    const template = await loadTemplate(stages[0]?.template_id ?? 'generator_install_v1');
    const visibleTemplateStages = template.stages.filter((stage) => stage.visible_in_field_mode);
    const stageInstanceByTemplateId = new Map<string, WorkflowStageInstance>();
    stages.forEach((stage) => stageInstanceByTemplateId.set(stage.template_stage_id, stage));

    const blockingItems: InspectionIssue[] = [];
    const warningItems: InspectionIssue[] = [];
    let totalRequirements = 0;
    let completedRequirements = 0;
    let totalProofQualityChecks = 0;
    let passedProofQualityChecks = 0;
    let totalGpsTimestampChecks = 0;
    let passedGpsTimestampChecks = 0;
    let firstMissingRequirement: InspectionReadinessResult['first_missing_requirement'] = null;

    for (const stage of visibleTemplateStages) {
      const stageInstance = stageInstanceByTemplateId.get(stage.stage_id);
      if (!stageInstance && stage.required) {
        blockingItems.push({
          issue_id: issueId('missing_stage', stage.stage_id),
          issue_type: 'missing_stage',
          severity: 'blocking',
          stage_id: stage.stage_id,
          stage_name: stage.display_name,
          title: `${stage.display_name} not initialized`,
          description: 'This workflow stage has not been created for the job yet.',
          recommended_action: 'Refresh the job or re-open the workflow to initialize this stage.',
          created_at: nowIso(),
        });
      }

      for (const requirement of stage.proof_requirements ?? []) {
        if (!requirementAppliesToInspector(requirement)) continue;
        if (requirement.priority === 'optional') continue;

        const minimumCount = getRequirementMinimum(requirement);
        const matchingProof = proofs.filter((proof) => proof.requirement_id === requirement.requirement_id && !proof.deleted_at);
        const capturedEnough = matchingProof.length >= minimumCount;

        if (isBlockingRequirement(requirement)) totalRequirements += 1;
        if (isBlockingRequirement(requirement) && capturedEnough) completedRequirements += 1;

        if (!capturedEnough && isBlockingRequirement(requirement)) {
          const issue: InspectionIssue = {
            issue_id: issueId('missing_proof', stage.stage_id, requirement.requirement_id),
            issue_type: 'missing_proof',
            severity: 'blocking',
            stage_id: stage.stage_id,
            stage_name: stage.display_name,
            requirement_id: requirement.requirement_id,
            title: requirement.display_name,
            description: requirement.field_instruction,
            recommended_action: requirement.capture_hint || 'Capture this required proof before generating the inspector report.',
            created_at: nowIso(),
          };
          blockingItems.push(issue);
          firstMissingRequirement = firstMissingRequirement ?? { stage, requirement };
        }

        if (!capturedEnough && requirement.priority === 'recommended') {
          warningItems.push({
            issue_id: issueId('recommended_missing', stage.stage_id, requirement.requirement_id),
            issue_type: 'missing_proof',
            severity: 'warning',
            stage_id: stage.stage_id,
            stage_name: stage.display_name,
            requirement_id: requirement.requirement_id,
            title: `${requirement.display_name} recommended`,
            description: requirement.field_instruction,
            recommended_action: requirement.capture_hint || 'Capture if time allows before leaving the site.',
            created_at: nowIso(),
          });
        }

        for (const proof of matchingProof) {
          if (requirement.requires_ai_quality_check) {
            totalProofQualityChecks += 1;
            const score = proof.quality_score ?? 1;
            if (score >= 0.65) {
              passedProofQualityChecks += 1;
            } else {
              warningItems.push({
                issue_id: issueId('low_quality', proof.proof_id),
                issue_type: 'low_quality',
                severity: 'warning',
                stage_id: stage.stage_id,
                stage_name: stage.display_name,
                requirement_id: requirement.requirement_id,
                proof_id: proof.proof_id,
                title: `${requirement.display_name} may be hard to verify`,
                description: 'This proof has a low quality score and may be blurry, dark, or incomplete.',
                recommended_action: 'Retake the photo before leaving the jobsite if possible.',
                created_at: nowIso(),
              });
            }
          }

          if (requirement.requires_gps) {
            totalGpsTimestampChecks += 1;
            if (typeof proof.gps_latitude === 'number' && typeof proof.gps_longitude === 'number') {
              passedGpsTimestampChecks += 1;
            } else {
              warningItems.push({
                issue_id: issueId('missing_gps', proof.proof_id),
                issue_type: 'missing_gps',
                severity: 'warning',
                stage_id: stage.stage_id,
                stage_name: stage.display_name,
                requirement_id: requirement.requirement_id,
                proof_id: proof.proof_id,
                title: `${requirement.display_name} missing GPS`,
                description: 'This proof was captured without GPS coordinates.',
                recommended_action: 'Retake with location enabled if inspector/insurance proof requires location.',
                created_at: nowIso(),
              });
            }
          }

          if (requirement.requires_timestamp) {
            totalGpsTimestampChecks += 1;
            if (proof.captured_at) {
              passedGpsTimestampChecks += 1;
            } else {
              warningItems.push({
                issue_id: issueId('missing_timestamp', proof.proof_id),
                issue_type: 'missing_timestamp',
                severity: 'warning',
                stage_id: stage.stage_id,
                stage_name: stage.display_name,
                requirement_id: requirement.requirement_id,
                proof_id: proof.proof_id,
                title: `${requirement.display_name} missing timestamp`,
                description: 'This proof does not have a captured timestamp.',
                recommended_action: 'Retake or add a note explaining when it was captured.',
                created_at: nowIso(),
              });
            }
          }
        }
      }
    }

    const requiredProofScore = totalRequirements > 0 ? completedRequirements / totalRequirements : 1;
    const totalStages = visibleTemplateStages.filter((stage) => stage.required).length;
    const completedStages = visibleTemplateStages.filter((stage) => {
      const instance = stageInstanceByTemplateId.get(stage.stage_id);
      return instance?.status === 'complete';
    }).length;
    const stageScore = totalStages > 0 ? completedStages / totalStages : 1;
    const qualityScore = totalProofQualityChecks > 0 ? passedProofQualityChecks / totalProofQualityChecks : 1;
    const gpsTimestampScore = totalGpsTimestampChecks > 0 ? passedGpsTimestampChecks / totalGpsTimestampChecks : 1;

    const readinessScore = Math.max(0, Math.min(100, Math.round(
      requiredProofScore * 45 +
      stageScore * 20 +
      qualityScore * 15 +
      gpsTimestampScore * 10 +
      (blockingItems.length === 0 ? 10 : 0),
    )));

    const status: InspectionReadinessResult['status'] = blockingItems.length > 0
      ? 'not_ready'
      : warningItems.length > 0
        ? 'warning'
        : 'ready';

    return {
      job_id: jobId,
      packet_type: packetType,
      readiness_score: readinessScore,
      status,
      blocking_items: blockingItems,
      warning_items: warningItems,
      completed_requirements: completedRequirements,
      total_requirements: totalRequirements,
      completed_stages: completedStages,
      total_stages: totalStages,
      generated_at: nowIso(),
      grouped_blocking_items: groupByStage(blockingItems),
      grouped_warning_items: groupByStage(warningItems),
      first_missing_requirement: firstMissingRequirement,
    };
  }

  static canGenerateInspectorPacket(result: InspectionReadinessResult | null): boolean {
    return !!result && result.blocking_items.length === 0;
  }
}
