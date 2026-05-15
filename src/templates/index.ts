import generatorInstallTemplate from './generator_install_v1.json';

export * from './workflowTemplate.types';

export const SITEPROOF_TEMPLATES = [generatorInstallTemplate] as const;
export const GENERATOR_INSTALL_TEMPLATE = generatorInstallTemplate;
