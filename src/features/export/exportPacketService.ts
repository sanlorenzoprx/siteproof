import { exportRepository } from '../../db/repositories/exportRepository';
import { timelineRepository } from '../../db/repositories/timelineRepository';
import { ExportPacketType } from '../../db/schema';
import { Job, JobPhoto, VoiceNote } from '../../types';
import { ReportMode } from '../../services/pdfService';
import type { ExportIntegrityManifest } from '../../services/proofIntegrityService';
import { buildExportFileName, packetTitle } from './exportFileNaming';
import type { ExportFileReportKind } from './exportFileNaming';
import type { ExportAssembly } from './exportAssembler';
import type { SiteProofLanguage } from '../../types/settings';
import { SiteProofReportType } from './reportTypes';

export function reportTypeToPacketType(reportType: SiteProofReportType): ExportPacketType {
  switch (reportType) {
    case SiteProofReportType.CUSTOMER_COMPLETION:
      return 'customer_completion_report';
    case SiteProofReportType.DAILY_JOB_PROOF:
      return 'daily_job_proof_report';
    case SiteProofReportType.INSPECTION_READINESS:
      return 'inspection_readiness_report';
    case SiteProofReportType.CHANGE_ORDER_EVIDENCE:
      return 'change_order_evidence_report';
    case SiteProofReportType.PHOTO_PROOF_TIMELINE:
      return 'photo_proof_timeline';
    case SiteProofReportType.PAYMENT_FINAL_HANDOFF:
      return 'payment_final_handoff_report';
    case SiteProofReportType.OFFICE_INTERNAL_RECORD:
      return 'internal_record';
    case SiteProofReportType.INTERNAL_BID_REPORT:
      return 'internal_bid_report';
    case SiteProofReportType.CUSTOMER_BID_REPORT:
      return 'customer_bid_report';
    case SiteProofReportType.ALL_REPORTS:
      return 'all_reports';
    default:
      return 'internal_record';
  }
}

export function modeToPacketType(mode: ReportMode): ExportPacketType {
  switch (mode) {
    case ReportMode.CUSTOMER:
      return 'customer_packet';
    case ReportMode.INSPECTOR:
      return 'inspector_packet';
    case ReportMode.WARRANTY:
      return 'warranty_packet';
    case ReportMode.DISPUTE:
      return 'litigation_packet';
    default:
      return 'internal_record';
  }
}

export class ExportPacketService {
  /**
   * Export v2: record packets from canonical runtime entities.
   * The included_proof_ids field now contains ProofObject IDs, not legacy photo/note IDs.
   */
  static async recordGeneratedPacketFromAssembly(assembly: ExportAssembly, reportKind: ExportFileReportKind, manifest?: ExportIntegrityManifest, exportLanguage: SiteProofLanguage = 'en', localFileUri?: string) {
    const fileName = buildExportFileName(assembly.legacyJob, reportKind, exportLanguage);
    const exportPacket = await exportRepository.createExport({
      job_id: assembly.runtimeJob.job_id,
      packet_type: assembly.packetType,
      title: packetTitle(reportKind, exportLanguage),
      local_file_uri: localFileUri ?? `siteproof://exports/${assembly.runtimeJob.job_id}/${fileName}`,
      cloud_file_uri: null,
      included_proof_ids: assembly.selectedProofIds,
      included_sections: assembly.includedSections,
      manifest_hash: manifest?.manifestHash ?? null,
      signed_manifest_hash: manifest?.signedManifestHash ?? null,
      manifest_id: manifest?.manifestId ?? null,
      template_id: assembly.runtimeJob.template_id,
      template_version: assembly.runtimeJob.template_version,
      share_status: 'not_shared',
      sent_to: [],
      export_language: exportLanguage,
    });

    await timelineRepository.createEvent({
      job_id: assembly.runtimeJob.job_id,
      event_type: 'export_generated',
      event_title: `${packetTitle(reportKind, exportLanguage)} generated`,
      event_description: `${assembly.selectedProofIds.length} proof items included from canonical ProofObjects.`,
      related_proof_ids: assembly.selectedProofIds,
    }).catch((error) => console.warn('Export timeline event failed:', error));

    return exportPacket;
  }

  static async recordGeneratedAllReportsPacket(
    assembly: ExportAssembly,
    includedProofIds: string[],
    includedSections: string[],
    manifest?: ExportIntegrityManifest,
    exportLanguage: SiteProofLanguage = 'en',
    localFileUri?: string,
  ) {
    const fileName = buildExportFileName(assembly.legacyJob, SiteProofReportType.ALL_REPORTS, exportLanguage);
    const uniqueProofIds = [...new Set(includedProofIds)];
    const exportPacket = await exportRepository.createExport({
      job_id: assembly.runtimeJob.job_id,
      packet_type: 'all_reports',
      title: packetTitle(SiteProofReportType.ALL_REPORTS, exportLanguage),
      local_file_uri: localFileUri ?? `siteproof://exports/${assembly.runtimeJob.job_id}/${fileName}`,
      cloud_file_uri: null,
      included_proof_ids: uniqueProofIds,
      included_sections: includedSections,
      manifest_hash: manifest?.manifestHash ?? null,
      signed_manifest_hash: manifest?.signedManifestHash ?? null,
      manifest_id: manifest?.manifestId ?? null,
      template_id: assembly.runtimeJob.template_id,
      template_version: assembly.runtimeJob.template_version,
      share_status: 'not_shared',
      sent_to: [],
      export_language: exportLanguage,
    });

    await timelineRepository.createEvent({
      job_id: assembly.runtimeJob.job_id,
      event_type: 'export_generated',
      event_title: `${packetTitle(SiteProofReportType.ALL_REPORTS, exportLanguage)} generated`,
      event_description: `${uniqueProofIds.length} proof items included across six app reports.`,
      related_proof_ids: uniqueProofIds,
    }).catch((error) => console.warn('All reports timeline event failed:', error));

    return exportPacket;
  }

  /**
   * Compatibility path for older calls. Prefer recordGeneratedPacketFromAssembly.
   */
  static async recordGeneratedPacket(job: Job, mode: ReportMode, photos: JobPhoto[], notes: VoiceNote[], exportLanguage: SiteProofLanguage = 'en') {
    const { ExportAssembler } = await import('./exportAssembler');
    const assembly = await ExportAssembler.assemble(job.id, mode, exportLanguage).catch(() => null);
    if (assembly) return this.recordGeneratedPacketFromAssembly(assembly, mode, undefined, exportLanguage);

    const fileName = buildExportFileName(job, mode, exportLanguage);
    return exportRepository.createExport({
      job_id: job.id,
      packet_type: modeToPacketType(mode),
      title: packetTitle(mode, exportLanguage),
      local_file_uri: `siteproof://exports/${job.id}/${fileName}`,
      cloud_file_uri: null,
      included_proof_ids: [
        ...photos.map((photo) => photo.id),
        ...notes.map((note) => note.id),
      ],
      included_sections: ['job_summary', 'proof_checklist', 'photo_evidence', 'timeline'],
      template_id: job.templateId || 'generator_install_v1',
      template_version: '1.0.0',
      share_status: 'not_shared',
      sent_to: [],
      export_language: exportLanguage,
    });
  }

  static getPacketHistory(jobId: string) {
    return exportRepository.getByJob(jobId);
  }
}
