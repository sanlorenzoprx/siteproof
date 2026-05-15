import generatorInstallTemplate from '../templates/generator_install_v1.json';
import { ProofRequirement, WorkflowStageTemplate, WorkflowTemplate } from '../templates/workflowTemplate.types';

export interface TemplateOption {
  templateId: string;
  displayName: string;
  jobType: string;
  trade: string;
  vertical: string;
  description: string;
}

const bundledTemplates = [generatorInstallTemplate as WorkflowTemplate];
const aliases: Record<string, string> = {
  generator_install: 'generator_install_v1',
  generator_install_v1: 'generator_install_v1',
  panel_upgrade: 'generator_install_v1',
  general: 'generator_install_v1',
};

export interface RequirementContext {
  template: WorkflowTemplate;
  stage: WorkflowStageTemplate;
  requirement: ProofRequirement;
}

export class TemplateCatalogService {
  static normalizeTemplateId(templateId?: string | null): string {
    if (!templateId) return 'generator_install_v1';
    return aliases[templateId] ?? templateId;
  }

  static getTemplate(templateId?: string | null): WorkflowTemplate {
    const normalized = this.normalizeTemplateId(templateId);
    return bundledTemplates.find((template) => template.template_id === normalized) ?? (generatorInstallTemplate as WorkflowTemplate);
  }

  static getTemplateOptions(): TemplateOption[] {
    return bundledTemplates.map((template) => ({
      templateId: template.template_id,
      displayName: template.display_name,
      jobType: template.display_name,
      trade: template.trade,
      vertical: template.vertical,
      description: template.description,
    }));
  }

  static inferTemplateFromText(text: string): TemplateOption {
    const normalized = text.toLowerCase();
    const options = this.getTemplateOptions();

    if (normalized.includes('generator') || normalized.includes('standby') || normalized.includes('ats') || normalized.includes('transfer switch')) {
      return options.find((option) => option.templateId === 'generator_install_v1') ?? options[0];
    }

    if (normalized.includes('panel') || normalized.includes('service upgrade')) {
      return options.find((option) => option.templateId === 'generator_install_v1') ?? options[0];
    }

    return options[0];
  }

  static getRequirementContext(templateId: string | undefined, requirementId: string | undefined): RequirementContext | null {
    if (!requirementId) return null;
    const template = this.getTemplate(templateId);
    for (const stage of template.stages) {
      const requirement = (stage.proof_requirements ?? []).find((item) => item.requirement_id === requirementId);
      if (requirement) return { template, stage, requirement };
    }
    return null;
  }

  static getCaptureCategories(templateId?: string | null, preferredRequirementId?: string | null): string[] {
    const template = this.getTemplate(templateId);
    const requirements = template.stages.flatMap((stage) => stage.proof_requirements ?? []);
    const names = requirements.map((requirement) => requirement.display_name);
    const preferred = preferredRequirementId
      ? requirements.find((requirement) => requirement.requirement_id === preferredRequirementId)?.display_name
      : null;
    return Array.from(new Set([preferred, ...names, 'Other'].filter(Boolean) as string[]));
  }
}
