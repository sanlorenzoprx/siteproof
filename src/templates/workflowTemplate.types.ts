/**
 * SiteProof WorkflowTemplate JSON Spec v1
 * Implementation-ready TypeScript interfaces.
 *
 * Core flow:
 * WorkflowTemplate -> WorkflowStageTemplate -> ProofRequirement -> ProofObject -> ExportProfile
 */

export type TemplateStatus = 'draft' | 'active' | 'deprecated' | 'archived';

export type Trade =
  | 'electrical'
  | 'generator_emergency_power'
  | 'plumbing'
  | 'hvac'
  | 'roofing'
  | 'restoration'
  | 'solar_battery'
  | 'low_voltage_security'
  | 'telecom_fiber'
  | 'fire_life_safety'
  | 'general_construction';

export type PropertyType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'multifamily'
  | 'municipal'
  | 'utility';

export type WorkflowStageKey =
  | 'intake'
  | 'site_arrival'
  | 'existing_conditions'
  | 'active_work'
  | 'inspection_readiness'
  | 'completion'
  | 'export_archive';

export type ProofType =
  | 'photo'
  | 'video'
  | 'voice_note'
  | 'text_note'
  | 'signature'
  | 'measurement'
  | 'document'
  | 'checklist_item'
  | 'gps_event'
  | 'weather_snapshot'
  | 'serial_number'
  | 'test_result';

export type ExportPacketType =
  | 'customer_packet'
  | 'inspector_packet'
  | 'insurance_packet'
  | 'warranty_packet'
  | 'internal_record'
  | 'litigation_packet';

export type RequirementPriority = 'required' | 'recommended' | 'optional' | 'conditional';

export type SyncPolicy =
  | 'local_only_allowed'
  | 'sync_recommended'
  | 'sync_required_before_closeout';

export type ConditionalOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'not_exists';

export type ValidationRuleType =
  | 'missing_proof'
  | 'low_quality_proof'
  | 'missing_gps'
  | 'missing_timestamp'
  | 'missing_signature'
  | 'missing_note'
  | 'incomplete_checklist'
  | 'jurisdiction_warning'
  | 'permit_warning'
  | 'inspection_warning'
  | 'sync_warning'
  | 'export_warning';

export type ValidationSeverity = 'info' | 'warning' | 'blocking';

export type ModifierActionType =
  | 'add_proof_requirement'
  | 'remove_proof_requirement'
  | 'change_requirement_priority'
  | 'add_checklist_item'
  | 'add_export_section'
  | 'add_validation_rule'
  | 'add_compliance_note'
  | 'require_permit_review'
  | 'require_inspection_review';

export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type TemplateLanguage = 'en' | 'es';
export type LocalizedTemplateText = Partial<Record<TemplateLanguage, string>>;

export interface WorkflowTemplate {
  template_id: string;
  template_version: string;
  template_status: TemplateStatus;
  trade: Trade;
  vertical: string;
  job_type: string;
  display_name: string;
  display_name_i18n?: LocalizedTemplateText;
  description: string;
  description_i18n?: LocalizedTemplateText;
  supported_property_types: PropertyType[];
  supported_regions: string[];
  default_language: string;
  supported_languages: string[];
  estimated_duration_minutes?: number;
  risk_level?: 'low' | 'medium' | 'high';
  requires_permit_review: boolean;
  requires_inspection_review: boolean;
  created_at: string;
  updated_at: string;
  schema_version: string;
  stages: WorkflowStageTemplate[];
  export_profiles: ExportProfile[];
  ai_prompt_set?: AiPromptSet;
  jurisdiction_modifiers?: JurisdictionModifier[];
  validation_rules: ValidationRule[];
}

export interface WorkflowStageTemplate {
  stage_id: string;
  stage_key: WorkflowStageKey;
  display_name: string;
  display_name_i18n?: LocalizedTemplateText;
  description: string;
  description_i18n?: LocalizedTemplateText;
  sort_order: number;
  required: boolean;
  can_skip: boolean;
  skip_requires_reason: boolean;
  visible_in_field_mode: boolean;
  proof_requirements: ProofRequirement[];
  checklist_items?: ChecklistItem[];
  stage_validation_rules?: ValidationRule[];
  ai_stage_prompts?: AiStagePrompt[];
  export_section_mappings?: ExportSectionMapping[];
}

export interface ProofRequirement {
  requirement_id: string;
  proof_type: ProofType;
  priority: RequirementPriority;
  display_name: string;
  display_name_i18n?: LocalizedTemplateText;
  field_instruction: string;
  field_instruction_i18n?: LocalizedTemplateText;
  capture_hint?: string;
  capture_hint_i18n?: LocalizedTemplateText;
  minimum_count: number;
  maximum_count?: number;
  allow_multiple: boolean;
  requires_gps: boolean;
  requires_timestamp: boolean;
  requires_user_note: boolean;
  requires_ai_quality_check: boolean;
  quality_rules?: string[];
  ai_label_hints?: string[];
  inspection_tags?: string[];
  permit_tags?: string[];
  export_tags: ExportPacketType[];
  compliance_notes?: string[];
  conditional_logic?: ConditionalLogic | null;
  sync_policy: SyncPolicy;
}

export interface ChecklistItem {
  checklist_id: string;
  display_name: string;
  display_name_i18n?: LocalizedTemplateText;
  description: string;
  description_i18n?: LocalizedTemplateText;
  priority: RequirementPriority;
  requires_note: boolean;
  requires_signature: boolean;
  blocks_stage_completion: boolean;
  export_tags: ExportPacketType[];
}

export interface ConditionalLogic {
  if: ConditionalExpression;
  then: Partial<ProofRequirement> | Record<string, unknown>;
  else?: Partial<ProofRequirement> | Record<string, unknown>;
}

export interface ConditionalExpression {
  field: string;
  operator: ConditionalOperator;
  value?: unknown;
}

export interface ValidationRule {
  rule_id: string;
  rule_type: ValidationRuleType;
  severity: ValidationSeverity;
  display_message: string;
  applies_to: ExportPacketType[] | string[];
  conditions: ConditionalExpression[];
  recommended_action?: string;
}

export interface ExportProfile {
  export_profile_id: string;
  packet_type: ExportPacketType;
  display_name: string;
  description: string;
  default_enabled: boolean;
  sections: ExportSection[];
  requires_validation_pass: boolean;
  include_timeline: boolean;
  include_gps: boolean;
  include_timestamps: boolean;
  include_ai_summary: boolean;
  include_signature: boolean;
}

export interface ExportSection {
  section_id: string;
  display_name: string;
  sort_order: number;
  content_sources: string[];
  filter?: ConditionalExpression;
}

export interface ExportSectionMapping {
  export_profile_id: string;
  section_id: string;
  include_stage_summary?: boolean;
  include_stage_proof?: boolean;
}

export interface AiPromptSet {
  photo_labeling?: AiPhotoLabelingConfig;
  voice_note_structuring?: AiVoiceNoteStructuringConfig;
  report_narrative?: AiReportNarrativeConfig;
  missing_proof_detection?: AiMissingProofDetectionConfig;
}

export interface AiPhotoLabelingConfig {
  enabled: boolean;
  label_hints: string[];
  output_schema: string;
}

export interface AiVoiceNoteStructuringConfig {
  enabled: boolean;
  detect_materials: boolean;
  detect_issues: boolean;
  detect_change_orders: boolean;
  supported_languages: string[];
  output_schema: string;
}

export interface AiReportNarrativeConfig {
  enabled: boolean;
  tone: 'professional_contractor' | 'plain_language' | 'inspector_ready';
  max_words: number;
  output_schema: string;
}

export interface AiMissingProofDetectionConfig {
  enabled: boolean;
  output_schema: string;
}

export interface AiStagePrompt {
  prompt_id: string;
  enabled: boolean;
  trigger: 'on_stage_open' | 'on_stage_complete' | 'on_proof_capture' | 'on_export';
  output_schema: string;
}

export interface JurisdictionModifier {
  modifier_id: string;
  display_name: string;
  applies_when: ConditionalExpression;
  actions: JurisdictionModifierAction[];
  source_requirement: 'job_context' | 'jurisdiction_profile' | 'permit_requirement' | 'inspection_requirement';
  confidence_level: ConfidenceLevel;
}

export interface JurisdictionModifierAction {
  action_type: ModifierActionType;
  stage_id?: string;
  requirement_id?: string;
  proof_requirement?: ProofRequirement;
  checklist_item?: ChecklistItem;
  validation_rule?: ValidationRule;
  export_section?: ExportSection;
  compliance_note?: string;
  priority?: RequirementPriority;
}

export interface CachedWorkflowTemplate {
  template_id: string;
  template_version: string;
  full_template_json: WorkflowTemplate;
  downloaded_at: string;
  last_used_at?: string;
  active_flag: boolean;
  checksum: string;
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: TemplateValidationIssue[];
  warnings: TemplateValidationIssue[];
}

export interface TemplateValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}
