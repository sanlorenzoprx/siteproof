import { format } from 'date-fns';
import { Job } from '../../types';
import { ReportMode } from '../../services/pdfService';
import type { SiteProofLanguage } from '../../types/settings';
import { translate } from '../../config/i18n';
import { SiteProofReportType } from './reportTypes';
import { getReportDefinition } from './reportDefinitions';

function safePart(value?: string | null): string {
  return (value || 'Job')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48) || 'Job';
}

export type ExportFileReportKind = ReportMode | SiteProofReportType;

function appReportLabel(reportKind: SiteProofReportType, language: SiteProofLanguage): string {
  if (language === 'es') {
    switch (reportKind) {
      case SiteProofReportType.CUSTOMER_COMPLETION:
        return 'InformeFinalizacionCliente';
      case SiteProofReportType.DAILY_JOB_PROOF:
        return 'InformeDiarioEvidenciaTrabajo';
      case SiteProofReportType.INSPECTION_READINESS:
        return 'InformePreparacionInspeccion';
      case SiteProofReportType.CHANGE_ORDER_EVIDENCE:
        return 'InformeEvidenciaOrdenCambio';
      case SiteProofReportType.PHOTO_PROOF_TIMELINE:
        return 'CronologiaEvidenciaFotografica';
      case SiteProofReportType.PAYMENT_FINAL_HANDOFF:
        return 'InformePagoEntregaFinal';
      case SiteProofReportType.ALL_REPORTS:
        return 'TodosLosInformes';
      default:
        return 'Informe';
    }
  }

  switch (reportKind) {
    case SiteProofReportType.CUSTOMER_COMPLETION:
      return 'CustomerCompletionReport';
    case SiteProofReportType.DAILY_JOB_PROOF:
      return 'DailyJobProofReport';
    case SiteProofReportType.INSPECTION_READINESS:
      return 'InspectionReadinessReport';
    case SiteProofReportType.CHANGE_ORDER_EVIDENCE:
      return 'ChangeOrderEvidenceReport';
    case SiteProofReportType.PHOTO_PROOF_TIMELINE:
      return 'PhotoProofTimeline';
    case SiteProofReportType.PAYMENT_FINAL_HANDOFF:
      return 'PaymentFinalHandoffReport';
    case SiteProofReportType.ALL_REPORTS:
      return 'AllReports';
    default:
      return 'Report';
  }
}

function reportNameParts(reportKind: ExportFileReportKind, language: SiteProofLanguage = 'en'): { label: string; title: string } {
  switch (reportKind) {
    case SiteProofReportType.CUSTOMER_COMPLETION:
    case SiteProofReportType.DAILY_JOB_PROOF:
    case SiteProofReportType.INSPECTION_READINESS:
    case SiteProofReportType.CHANGE_ORDER_EVIDENCE:
    case SiteProofReportType.PHOTO_PROOF_TIMELINE:
    case SiteProofReportType.PAYMENT_FINAL_HANDOFF:
      return {
        label: appReportLabel(reportKind, language),
        title: translate(language, getReportDefinition(reportKind).titleKey),
      };
    case SiteProofReportType.ALL_REPORTS:
      return { label: appReportLabel(reportKind, language), title: translate(language, 'reports.allReports') };
    case ReportMode.CUSTOMER:
      return { label: 'CustomerPacket', title: 'Customer Packet' };
    case ReportMode.INSPECTOR:
      return { label: 'InspectorPacket', title: 'Inspector Packet' };
    case ReportMode.WARRANTY:
      return { label: 'WarrantyPacket', title: 'Warranty Documentation Packet' };
    case ReportMode.DISPUTE:
      return { label: 'DisputePacket', title: 'Dispute Packet' };
    case ReportMode.HANDOFF:
      return { label: 'HandoffPacket', title: 'Crew Handoff Packet' };
    default:
      return { label: 'InternalRecord', title: 'Internal Record' };
  }
}

export function packetLabel(reportKind: ExportFileReportKind): string {
  return reportNameParts(reportKind).label;
}

export function packetTitle(reportKind: ExportFileReportKind, language: SiteProofLanguage = 'en'): string {
  if (Object.values(SiteProofReportType).includes(reportKind as SiteProofReportType)) {
    return reportNameParts(reportKind, language).title;
  }

  const mode = reportKind as ReportMode;
  switch (mode) {
    case ReportMode.CUSTOMER:
      return translate(language, 'jobDetail.customerPacket');
    case ReportMode.INSPECTOR:
      return translate(language, 'jobDetail.inspectorPacket');
    case ReportMode.WARRANTY:
      return 'Warranty Documentation Packet';
    case ReportMode.DISPUTE:
      return translate(language, 'jobDetail.disputePack');
    case ReportMode.HANDOFF:
      return 'Crew Handoff Packet';
    default:
      return translate(language, 'jobDetail.internalRecord');
  }
}

export function buildExportFileName(job: Job, reportKind: ExportFileReportKind, exportLanguage: SiteProofLanguage = 'en'): string {
  const timestamp = format(Date.now(), 'yyyyMMdd-HHmmss');
  return `siteproof-${safePart(reportNameParts(reportKind, exportLanguage).label).toLowerCase()}-${safePart(job.customerName || job.id).toLowerCase()}-${exportLanguage}-${timestamp}.pdf`;
}
