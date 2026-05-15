import generatorInstallTemplate from '../templates/generator_install_v1.json';
import { ProofRequirement, WorkflowStageTemplate, WorkflowTemplate, LocalizedTemplateText } from '../templates/workflowTemplate.types';
import { SiteProofLanguage } from '../types/settings';

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
  static localizeText(baseText: string, localizedText: LocalizedTemplateText | undefined, language: SiteProofLanguage): string {
    return localizedText?.[language] ?? localizedText?.en ?? baseText;
  }

  static localizeTemplate(template: WorkflowTemplate, language: SiteProofLanguage): WorkflowTemplate {
    return {
      ...template,
      display_name: this.localizeText(template.display_name, template.display_name_i18n, language),
      description: this.localizeText(template.description, template.description_i18n, language),
      stages: template.stages.map((stage) => ({
        ...stage,
        display_name: this.localizeText(stage.display_name, stage.display_name_i18n, language),
        description: this.localizeText(stage.description, stage.description_i18n, language),
        proof_requirements: stage.proof_requirements.map((requirement) => ({
          ...requirement,
          display_name: this.localizeText(requirement.display_name, requirement.display_name_i18n, language),
          field_instruction: this.localizeText(requirement.field_instruction, requirement.field_instruction_i18n, language),
          capture_hint: requirement.capture_hint
            ? this.localizeText(requirement.capture_hint, requirement.capture_hint_i18n, language)
            : requirement.capture_hint,
        })),
        checklist_items: stage.checklist_items?.map((item) => ({
          ...item,
          display_name: this.localizeText(item.display_name, item.display_name_i18n, language),
          description: this.localizeText(item.description, item.description_i18n, language),
        })),
      })),
    };
  }
  static normalizeTemplateId(templateId?: string | null): string {
    if (!templateId) return 'generator_install_v1';
    return aliases[templateId] ?? templateId;
  }

  static getTemplate(templateId?: string | null, language?: SiteProofLanguage): WorkflowTemplate {
    const normalized = this.normalizeTemplateId(templateId);
    const template = bundledTemplates.find((item) => item.template_id === normalized) ?? (generatorInstallTemplate as WorkflowTemplate);
    return language ? this.localizeTemplate(template, language) : template;
  }

  static getTemplateOptions(language: SiteProofLanguage = 'en'): TemplateOption[] {
    return bundledTemplates.map((template) => ({
      templateId: template.template_id,
      displayName: this.localizeText(template.display_name, template.display_name_i18n, language),
      jobType: this.localizeText(template.display_name, template.display_name_i18n, language),
      trade: template.trade,
      vertical: template.vertical,
      description: this.localizeText(template.description, template.description_i18n, language),
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

  static getRequirementContext(templateId: string | undefined, requirementId: string | undefined, language: SiteProofLanguage = 'en'): RequirementContext | null {
    if (!requirementId) return null;
    const template = this.getTemplate(templateId, language);
    for (const stage of template.stages) {
      const requirement = (stage.proof_requirements ?? []).find((item) => item.requirement_id === requirementId);
      if (requirement) return { template, stage, requirement };
    }
    return null;
  }

  static getCaptureCategories(templateId?: string | null, preferredRequirementId?: string | null, language: SiteProofLanguage = 'en'): string[] {
    const template = this.getTemplate(templateId, language);
    const requirements = template.stages.flatMap((stage) => stage.proof_requirements ?? []);
    const names = requirements.map((requirement) => requirement.display_name);
    const preferred = preferredRequirementId
      ? requirements.find((requirement) => requirement.requirement_id === preferredRequirementId)?.display_name
      : null;
    return Array.from(new Set([preferred, ...names, 'Other'].filter(Boolean) as string[]));
  }
}
