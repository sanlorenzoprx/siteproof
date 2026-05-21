import { proofRepository, voiceNoteRepository } from '../db/repositories';
import { mediaRepository } from '../db/repositories/mediaRepository';
import { JobDocument, ProofObject, VoiceNote } from '../db/schema';
import { ProReportType } from '../templates/tradeTemplatePack.types';
import { JobDocumentAdapter } from './jobDocumentAdapter';
import { MissingProofDetectionService, MissingProofWarning } from './missingProofDetectionService';
import { TradeTemplatePackService } from './tradeTemplatePackService';

export interface ProReportManifest {
  manifestId: string;
  jobId: string;
  packId: string;
  reportType: ProReportType;
  title: string;
  includedProof: ProofObject[];
  includedMediaIds: string[];
  includedDocuments: ProofObject[];
  includedJobDocuments: JobDocument[];
  includedStructuredVoiceNotes: VoiceNote[];
  missingProofWarnings: MissingProofWarning[];
  manifestHash: string | null;
}

export class ProReportManifestBuilder {
  static async build(job: { id: string; tradePackId?: string; trade?: string; specialty?: string }, reportType: ProReportType): Promise<ProReportManifest> {
    const pack = TradeTemplatePackService.getPack(job.tradePackId);
    const mapping = pack.reportMappings.find((item) => item.reportType === reportType) ?? pack.reportMappings[0];
    const [proof, media, voiceNotes, jobDocuments] = await Promise.all([
      proofRepository.getByJob(job.id).catch(() => []),
      mediaRepository.getByJob(job.id).catch(() => []),
      voiceNoteRepository.getByJob(job.id).catch(() => []),
      JobDocumentAdapter.listForJobIncludingLegacy(job.id).catch(() => []),
    ]);

    const isInternalRecord = reportType === 'office_internal_record';
    const includedProof = proof.filter((item) =>
      isInternalRecord ||
      item.export_tags.some((tag) => mapping.includedReportTags.includes(tag)) ||
      item.inspection_tags.some((tag) => mapping.includedInspectionTags.includes(tag)),
    );
    const includedProofIds = new Set(includedProof.map((item) => item.proof_id));
    const includedJobDocuments = mapping.includeDocuments
      ? jobDocuments.filter((document) =>
          isInternalRecord ||
          document.report_tags.some((tag) => mapping.includedReportTags.includes(tag)) ||
          document.inspection_tags.some((tag) => mapping.includedInspectionTags.includes(tag)),
        )
      : [];
    const documentProofIds = new Set(includedJobDocuments.map((document) => document.proof_object_id).filter(Boolean));
    const documentMediaIds = new Set(includedJobDocuments.map((document) => document.media_asset_id).filter(Boolean));

    return {
      manifestId: `${job.id}:${pack.packId}:${reportType}`,
      jobId: job.id,
      packId: pack.packId,
      reportType,
      title: mapping.title,
      includedProof,
      includedMediaIds: Array.from(new Set([
        ...media.filter((item) => includedProofIds.has(item.proof_id)).map((item) => item.media_id),
        ...documentMediaIds,
      ])),
      includedDocuments: mapping.includeDocuments
        ? includedProof.filter((item) => item.proof_type === 'document' && !documentProofIds.has(item.proof_id))
        : [],
      includedJobDocuments,
      includedStructuredVoiceNotes: mapping.includeStructuredVoiceNotes
        ? voiceNotes.filter((item) => includedProofIds.has(item.proof_id))
        : [],
      missingProofWarnings: mapping.includeMissingProofWarnings ? await MissingProofDetectionService.getWarnings(job) : [],
      manifestHash: null,
    };
  }
}
