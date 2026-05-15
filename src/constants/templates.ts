// Compatibility adapter for older imports.
// New runtime code should use TemplateCatalogService + WorkflowTemplate JSON.
import { TemplateCatalogService } from '../services/templateCatalogService';

export interface TemplateStep {
  id: string;
  label: string;
  category: string;
  description: string;
  required: boolean;
}

export interface JobTemplate {
  id: string;
  name: string;
  description: string;
  steps: TemplateStep[];
}

const generatorTemplate = TemplateCatalogService.getTemplate('generator_install_v1');

function toLegacyTemplate(): JobTemplate {
  return {
    id: generatorTemplate.template_id,
    name: generatorTemplate.display_name,
    description: generatorTemplate.description,
    steps: generatorTemplate.stages.flatMap((stage) =>
      (stage.proof_requirements ?? []).map((requirement) => ({
        id: requirement.requirement_id,
        label: requirement.display_name,
        category: requirement.display_name,
        description: requirement.field_instruction,
        required: requirement.priority === 'required' || requirement.priority === 'conditional',
      })),
    ),
  };
}

export const JOB_TEMPLATES: Record<string, JobTemplate> = {
  generator_install_v1: toLegacyTemplate(),
};
