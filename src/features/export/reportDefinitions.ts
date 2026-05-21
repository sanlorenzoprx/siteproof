import { APP_REPORT_TYPES, SiteProofReportType } from './reportTypes';

export type ReportAudience = 'customer' | 'office' | 'inspector' | 'payment' | 'dispute_support';

export type ReportSection =
  | 'cover'
  | 'summary'
  | 'daily_work'
  | 'checklist'
  | 'change_order_evidence'
  | 'photo_grid'
  | 'timeline'
  | 'voice_notes'
  | 'open_items'
  | 'payment_readiness'
  | 'inspection_disclaimer'
  | 'payment_note'
  | 'integrity_manifest'
  | 'signature';

export type ReportProofFilter =
  | 'customer_safe'
  | 'today'
  | 'inspection'
  | 'change_order'
  | 'timeline_all'
  | 'payment';

export interface ReportDefinition {
  type: SiteProofReportType;
  titleKey: string;
  fallbackTitle: string;
  audience: ReportAudience;
  purpose: string;
  sections: ReportSection[];
  proofFilter: ReportProofFilter;
  fallbackProofFilter: ReportProofFilter;
  proofFilterTags: string[];
  fallbackProofTags: string[];
  includeIntegrityManifest: boolean;
  includeSignature: boolean;
  includeChecklist: boolean;
  includeTimeline: boolean;
}

export const REPORT_DEFINITIONS: Record<(typeof APP_REPORT_TYPES)[number], ReportDefinition> = {
  [SiteProofReportType.CUSTOMER_COMPLETION]: {
    type: SiteProofReportType.CUSTOMER_COMPLETION,
    titleKey: 'reports.customerCompletionReport',
    fallbackTitle: 'Customer Completion Report',
    audience: 'customer',
    purpose: 'Customer-facing closeout report with completed work, safe notes, and polished proof.',
    sections: ['cover', 'summary', 'photo_grid', 'voice_notes', 'timeline', 'signature'],
    proofFilter: 'customer_safe',
    fallbackProofFilter: 'timeline_all',
    proofFilterTags: ['customer_packet', 'customer_completion_report'],
    fallbackProofTags: ['internal_record'],
    includeIntegrityManifest: false,
    includeSignature: true,
    includeChecklist: false,
    includeTimeline: true,
  },
  [SiteProofReportType.DAILY_JOB_PROOF]: {
    type: SiteProofReportType.DAILY_JOB_PROOF,
    titleKey: 'reports.dailyJobProofReport',
    fallbackTitle: 'Daily Job Proof Report',
    audience: 'office',
    purpose: 'Office record of work captured today, including notes, photos, and job progress.',
    sections: ['cover', 'summary', 'daily_work', 'photo_grid', 'voice_notes', 'timeline', 'integrity_manifest'],
    proofFilter: 'today',
    fallbackProofFilter: 'timeline_all',
    proofFilterTags: ['daily_job_proof_report', 'internal_record'],
    fallbackProofTags: ['internal_record'],
    includeIntegrityManifest: true,
    includeSignature: false,
    includeChecklist: false,
    includeTimeline: true,
  },
  [SiteProofReportType.INSPECTION_READINESS]: {
    type: SiteProofReportType.INSPECTION_READINESS,
    titleKey: 'reports.inspectionReadinessReport',
    fallbackTitle: 'Inspection Readiness Report',
    audience: 'inspector',
    purpose: 'Inspection-ready evidence report focused on required proof, checklist status, GPS, and timestamps.',
    sections: ['cover', 'summary', 'inspection_disclaimer', 'checklist', 'open_items', 'photo_grid', 'timeline', 'integrity_manifest'],
    proofFilter: 'inspection',
    fallbackProofFilter: 'timeline_all',
    proofFilterTags: ['inspector_packet', 'inspection_readiness_report'],
    fallbackProofTags: ['internal_record'],
    includeIntegrityManifest: true,
    includeSignature: false,
    includeChecklist: true,
    includeTimeline: true,
  },
  [SiteProofReportType.CHANGE_ORDER_EVIDENCE]: {
    type: SiteProofReportType.CHANGE_ORDER_EVIDENCE,
    titleKey: 'reports.changeOrderEvidenceReport',
    fallbackTitle: 'Change Order Evidence Report',
    audience: 'dispute_support',
    purpose: 'Focused proof report for documented scope changes, issues, hidden conditions, and customer-requested changes.',
    sections: ['cover', 'summary', 'change_order_evidence', 'photo_grid', 'voice_notes', 'timeline', 'integrity_manifest'],
    proofFilter: 'change_order',
    fallbackProofFilter: 'timeline_all',
    proofFilterTags: ['change_order_evidence_report', 'litigation_packet', 'issue', 'CHANGE_ORDER'],
    fallbackProofTags: ['internal_record'],
    includeIntegrityManifest: true,
    includeSignature: false,
    includeChecklist: false,
    includeTimeline: true,
  },
  [SiteProofReportType.PHOTO_PROOF_TIMELINE]: {
    type: SiteProofReportType.PHOTO_PROOF_TIMELINE,
    titleKey: 'reports.photoProofTimeline',
    fallbackTitle: 'Photo Proof Timeline',
    audience: 'office',
    purpose: 'Chronological proof narrative showing when evidence was captured across the job.',
    sections: ['cover', 'timeline', 'summary', 'photo_grid', 'integrity_manifest'],
    proofFilter: 'timeline_all',
    fallbackProofFilter: 'timeline_all',
    proofFilterTags: ['photo_proof_timeline', 'internal_record'],
    fallbackProofTags: ['internal_record'],
    includeIntegrityManifest: true,
    includeSignature: false,
    includeChecklist: false,
    includeTimeline: true,
  },
  [SiteProofReportType.PAYMENT_FINAL_HANDOFF]: {
    type: SiteProofReportType.PAYMENT_FINAL_HANDOFF,
    titleKey: 'reports.paymentFinalHandoffReport',
    fallbackTitle: 'Payment Final Handoff Report',
    audience: 'payment',
    purpose: 'Payment-focused handoff that summarizes completed work, final proof, open items, signoff, and invoice readiness without legal claims.',
    sections: ['cover', 'summary', 'payment_note', 'payment_readiness', 'open_items', 'photo_grid', 'voice_notes', 'signature'],
    proofFilter: 'payment',
    fallbackProofFilter: 'customer_safe',
    proofFilterTags: ['payment_final_handoff_report', 'customer_packet', 'warranty_packet'],
    fallbackProofTags: ['internal_record'],
    includeIntegrityManifest: false,
    includeSignature: true,
    includeChecklist: false,
    includeTimeline: false,
  },
  [SiteProofReportType.OFFICE_INTERNAL_RECORD]: {
    type: SiteProofReportType.OFFICE_INTERNAL_RECORD,
    titleKey: 'reports.officeInternalRecord',
    fallbackTitle: 'Office / Internal Job Record Pro Report',
    audience: 'office',
    purpose: 'Internal documentation for admin, billing, job records, inspection history, and office review.',
    sections: ['cover', 'summary', 'daily_work', 'checklist', 'photo_grid', 'voice_notes', 'timeline', 'open_items', 'integrity_manifest'],
    proofFilter: 'timeline_all',
    fallbackProofFilter: 'timeline_all',
    proofFilterTags: ['office_ready', 'internal_record', 'inspection_readiness', 'customer_completion', 'change_order_evidence', 'payment_handoff'],
    fallbackProofTags: ['internal_record'],
    includeIntegrityManifest: true,
    includeSignature: false,
    includeChecklist: true,
    includeTimeline: true,
  },
};

export function getReportDefinition(reportType: SiteProofReportType): ReportDefinition {
  if (reportType === SiteProofReportType.ALL_REPORTS) {
    return REPORT_DEFINITIONS[SiteProofReportType.DAILY_JOB_PROOF];
  }
  return REPORT_DEFINITIONS[reportType] ?? REPORT_DEFINITIONS[SiteProofReportType.DAILY_JOB_PROOF];
}
