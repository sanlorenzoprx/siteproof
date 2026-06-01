export enum SiteProofReportType {
  CUSTOMER_COMPLETION = 'customer_completion',
  DAILY_JOB_PROOF = 'daily_job_proof',
  INSPECTION_READINESS = 'inspection_readiness',
  CHANGE_ORDER_EVIDENCE = 'change_order_evidence',
  PHOTO_PROOF_TIMELINE = 'photo_proof_timeline',
  PAYMENT_FINAL_HANDOFF = 'payment_final_handoff',
  OFFICE_INTERNAL_RECORD = 'office_internal_record',
  INTERNAL_BID_REPORT = 'internal_bid_report',
  CUSTOMER_BID_REPORT = 'customer_bid_report',
  ALL_REPORTS = 'all_reports',
}

// Fixed package order for the All Reports action.
export const APP_REPORT_TYPES = [
  SiteProofReportType.CUSTOMER_COMPLETION,
  SiteProofReportType.DAILY_JOB_PROOF,
  SiteProofReportType.INSPECTION_READINESS,
  SiteProofReportType.CHANGE_ORDER_EVIDENCE,
  SiteProofReportType.PHOTO_PROOF_TIMELINE,
  SiteProofReportType.PAYMENT_FINAL_HANDOFF,
  SiteProofReportType.OFFICE_INTERNAL_RECORD,
] as const;

export const APP_REPORT_DROPDOWN_OPTIONS = [
  ...APP_REPORT_TYPES,
  SiteProofReportType.ALL_REPORTS,
] as const;

export const BID_REPORT_TYPES = [
  SiteProofReportType.INTERNAL_BID_REPORT,
  SiteProofReportType.CUSTOMER_BID_REPORT,
] as const;

export type AppReportType = (typeof APP_REPORT_TYPES)[number];
export type AppReportDropdownOption = (typeof APP_REPORT_DROPDOWN_OPTIONS)[number];
export type BidReportType = (typeof BID_REPORT_TYPES)[number];

export type AppConcreteReportType = AppReportType;
