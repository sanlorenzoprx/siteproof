export type ProReportType =
  | "customer_completion"
  | "inspection_readiness"
  | "change_order_evidence"
  | "payment_handoff"
  | "photo_timeline"
  | "office_internal_record"
  | "all_pro_reports";

export type ProofType =
  | "photo"
  | "video"
  | "voice_note"
  | "transcript"
  | "document"
  | "signature"
  | "measurement"
  | "manual_note";

export type BeforeAfterMode = "before" | "during" | "after" | "inspection" | "any";

export interface TradeTemplatePack {
  packId: string;
  version: string;
  trade: string;
  specialty: string;
  displayName: string;
  description?: string;
  jurisdictionDefaults?: string[];
  stages: TradeWorkflowStage[];
  reportMappings: ReportMapping[];
  learningPolicy: WorkflowLearningPolicy;
  createdAt?: string;
  updatedAt?: string;
}

export interface TradeWorkflowStage {
  stageId: string;
  title: string;
  description?: string;
  order: number;
  stageType:
    | "job_setup"
    | "before_proof"
    | "during_proof"
    | "after_proof"
    | "inspection_proof"
    | "customer_signoff"
    | "final_document_check"
    | "export";
  steps: ProofCaptureStep[];
}

export interface ProofCaptureStep {
  stepId: string;
  title: string;
  plainLanguagePrompt: string;
  proofTypes: ProofType[];
  beforeAfterMode: BeforeAfterMode;
  required: boolean;
  recommended?: boolean;
  canIgnore: boolean;
  reportTags: string[];
  inspectionTags: string[];
  changeOrderSignals: string[];
  missingProofWarning: string;
  allowDocumentAttach?: boolean;
  allowVoiceNote?: boolean;
  allowPhoto?: boolean;
  allowManualNote?: boolean;
}

export interface ReportMapping {
  reportType: ProReportType;
  title: string;
  includedReportTags: string[];
  includedInspectionTags: string[];
  includeDocuments: boolean;
  includeStructuredVoiceNotes: boolean;
  includeMissingProofWarnings: boolean;
}

export interface WorkflowLearningPolicy {
  allowSkipOnce: boolean;
  allowHideForSimilarJobs: boolean;
  allowRestoreHiddenStep: boolean;
  allowCustomSteps: boolean;
  allowReorder: boolean;
  syncLearningEvents: boolean;
  requiresHumanReviewForPackUpdates: boolean;
}

export interface TradePackValidationResult {
  valid: boolean;
  errors: string[];
}
