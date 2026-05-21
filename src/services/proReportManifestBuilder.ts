import { exportRepository, proofRepository, voiceNoteRepository } from '../db/repositories';
import { mediaRepository } from '../db/repositories/mediaRepository';
import { ProofObject, VoiceNote } from '../db/schema';
import { ProReportType } from '../templates/tradeTemplatePack.types';
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
  includedStructuredVoiceNotes: VoiceNote[];
  missingProofWarnings: MissingProofWarning[];
  manifestHash: string | null;
}

export class ProReportManifestBuilder {
  static async build(job: { id: string; tradePackId?: string; trade?: string; specialty?: string }, reportType: ProReportType): Promise<ProReportManifest> {
    const pack = TradeTemplatePackService.getPack(job.tradePackId);
    const mapping = pack.reportMappings.find((item) => item.reportType === reportType) ?? pack.reportMappings[0];
    const [proof, media, voiceNotes] = await Promise.all([
      proofRepository.getByJob(job.id).catch(() => []),
      mediaRepository.getByJob(job.id).catch(() => []),
      voiceNoteRepository.getByJob(job.id).catch(() => []),
      exportRepository.getByJob(job.id).catch(() => []),
    ]);

    const includedProof = proof.filter((item) =>
      item.export_tags.some((tag) => mapping.includedReportTags.includes(tag)) ||
      item.inspection_tags.some((tag) => mapping.includedInspectionTags.includes(tag)),
    );
    const includedProofIds = new Set(includedProof.map((item) => item.proof_id));

    return {
      manifestId: `${job.id}:${pack.packId}:${reportType}`,
      jobId: job.id,
      packId: pack.packId,
      reportType,
      title: mapping.title,
      includedProof,
      includedMediaIds: media.filter((item) => includedProofIds.has(item.proof_id)).map((item) => item.media_id),
      includedDocuments: mapping.includeDocuments ? includedProof.filter((item) => item.proof_type === 'document') : [],
      includedStructuredVoiceNotes: mapping.includeStructuredVoiceNotes
        ? voiceNotes.filter((item) => includedProofIds.has(item.proof_id))
        : [],
      missingProofWarnings: mapping.includeMissingProofWarnings ? await MissingProofDetectionService.getWarnings(job) : [],
      manifestHash: null,
    };
  }
}
