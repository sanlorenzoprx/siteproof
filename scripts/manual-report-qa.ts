import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { jsPDF } from 'jspdf';
import { buildLocalReportNarrative } from '../src/features/export/reportNarratives';
import { getReportDefinition } from '../src/features/export/reportDefinitions';
import { filterProofBundlesForReport } from '../src/features/export/reportFilters';
import { APP_REPORT_TYPES, SiteProofReportType } from '../src/features/export/reportTypes';
import { buildExportFileName, packetTitle } from '../src/features/export/exportFileNaming';
import { reportTypeToPacketType } from '../src/features/export/exportPacketService';
import { addAppReportFooters, renderAppReportIntoDocument, renderAppReportPdf } from '../src/features/export/pdfRenderers/reportPdfRenderers';
import { filterAssemblyRelatedDataForReport } from '../src/features/export/exportAssembler';
import type { ExportAssembly, ExportProofBundle } from '../src/features/export/exportAssembler';
import type { JobPhoto, VoiceNote } from '../src/types';
import type { MediaAsset, ProofObject, TimelineEvent, VoiceNote as RuntimeVoiceNote, WorkflowStageInstance } from '../src/db/schema';

const outDir = path.resolve('tmp/report-qa');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function placeholderPngDataUrl(width: number, height: number, rgb: [number, number, number]): string {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = rowStart + 1 + x * 4;
      const stripe = Math.floor((x / width) * 80);
      raw[offset] = Math.min(255, rgb[0] + stripe);
      raw[offset + 1] = Math.min(255, rgb[1] + Math.floor(y / height * 60));
      raw[offset + 2] = rgb[2];
      raw[offset + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

const baseTime = Date.parse('2026-05-19T09:00:00.000Z');

function makeProof(id: string, title: string, capturedOffsetMinutes: number, overrides: Partial<ProofObject> = {}): ProofObject {
  return {
    proof_id: id,
    job_id: 'qa-generator-job',
    stage_instance_id: 'stage-active-work',
    proof_type: 'photo',
    title,
    captured_at: new Date(baseTime + capturedOffsetMinutes * 60_000).toISOString(),
    gps_latitude: 40.7128,
    gps_longitude: -74.006,
    required_flag: false,
    ai_labels: [],
    user_labels: [],
    inspection_tags: [],
    permit_tags: [],
    export_tags: ['internal_record'],
    sync_state: 'local_only',
    local_version: 1,
    created_at: new Date(baseTime).toISOString(),
    updated_at: new Date(baseTime).toISOString(),
    deleted_at: null,
    ...overrides,
  };
}

function makePhoto(proof: ProofObject, category: string, dataUrl: string, width: number, height: number, issue = false): JobPhoto {
  return {
    id: proof.proof_id,
    jobId: proof.job_id,
    category,
    timestamp: Date.parse(proof.captured_at),
    latitude: proof.gps_latitude ?? undefined,
    longitude: proof.gps_longitude ?? undefined,
    dataUrl,
    width,
    height,
    isIssue: issue,
    issueType: issue ? 'DEFICIENCY' : undefined,
    syncStatus: 'PENDING',
  };
}

const proofSpecs = [
  {
    id: 'before-meter-panel',
    title: 'Before - meter and main panel',
    category: 'Before work overview',
    minutes: 0,
    size: [900, 600] as const,
    color: [40, 92, 180] as [number, number, number],
    overrides: { export_tags: ['customer_packet', 'daily_job_proof_report', 'internal_record'] },
  },
  {
    id: 'during-transfer-switch',
    title: 'During - transfer switch installation',
    category: 'During installation',
    minutes: 85,
    size: [600, 900] as const,
    color: [20, 120, 110] as [number, number, number],
    overrides: { export_tags: ['inspector_packet', 'daily_job_proof_report', 'internal_record'], required_flag: true },
  },
  {
    id: 'final-generator-installed',
    title: 'Final completion photo',
    category: 'Final completion',
    minutes: 260,
    size: [1000, 650] as const,
    color: [34, 139, 70] as [number, number, number],
    overrides: { export_tags: ['customer_packet', 'payment_final_handoff_report', 'internal_record'] },
  },
  {
    id: 'inspection-permit-card',
    title: 'Inspection - permit card posted',
    category: 'Inspection proof',
    minutes: 290,
    size: [720, 720] as const,
    color: [80, 70, 160] as [number, number, number],
    overrides: { export_tags: ['inspector_packet', 'internal_record'], required_flag: true, inspection_tags: ['inspection', 'permit'] },
  },
  {
    id: 'issue-clearance-concern',
    title: 'Issue - clearance concern',
    category: 'Issue documentation',
    minutes: 130,
    size: [950, 540] as const,
    color: [170, 60, 45] as [number, number, number],
    issue: true,
    overrides: { export_tags: ['litigation_packet', 'change_order_evidence_report', 'internal_record'], user_labels: ['issue'], metadata: { is_issue: true } },
  },
  {
    id: 'payment-ready-walkthrough',
    title: 'Payment ready - final walkthrough',
    category: 'Payment readiness',
    minutes: 330,
    size: [900, 700] as const,
    color: [120, 105, 35] as [number, number, number],
    overrides: { export_tags: ['payment_final_handoff_report', 'customer_packet', 'internal_record'] },
  },
];

const proofs = proofSpecs.map((spec) => makeProof(spec.id, spec.title, spec.minutes, spec.overrides));
const photos = proofSpecs.map((spec, index) => makePhoto(
  proofs[index],
  spec.category,
  placeholderPngDataUrl(spec.size[0], spec.size[1], spec.color),
  spec.size[0],
  spec.size[1],
  spec.issue ?? false,
));

const voiceProof = makeProof('voice-change-order-note', 'Customer requested load test and extra conduit', 150, {
  proof_type: 'voice_note',
  export_tags: ['change_order_evidence_report', 'payment_final_handoff_report', 'customer_packet', 'internal_record'],
  user_labels: ['change_order'],
  metadata: { customer_requests: ['Customer requested load test'], change_order_candidates: ['Additional conduit routing'] },
});

const legacyVoiceNote: VoiceNote = {
  id: voiceProof.proof_id,
  jobId: voiceProof.job_id,
  transcribedText: 'Used copper wire and conduit. Clearance concern near shrubs. Customer requested a load test and additional conduit routing.',
  summary: 'Material mention, clearance issue, customer request, and change-order candidate documented.',
  language: 'en',
  materialMentions: ['copper wire', 'conduit'],
  issueMentions: ['clearance concern'],
  customerRequests: ['load test'],
  changeOrderCandidates: ['additional conduit routing'],
  timestamp: Date.parse(voiceProof.captured_at),
  category: 'Change order voice note',
  isIssue: true,
  isChangeOrder: true,
  syncStatus: 'PENDING',
};

const runtimeVoiceNote: RuntimeVoiceNote = {
  voice_note_id: 'voice-runtime-1',
  proof_id: voiceProof.proof_id,
  job_id: voiceProof.job_id,
  transcript: legacyVoiceNote.transcribedText,
  language: 'en',
  summary: legacyVoiceNote.summary,
  extracted_tasks: ['Review load test request'],
  change_order_candidates: legacyVoiceNote.changeOrderCandidates ?? [],
  material_mentions: legacyVoiceNote.materialMentions ?? [],
  issue_mentions: legacyVoiceNote.issueMentions ?? [],
  customer_requests: legacyVoiceNote.customerRequests ?? [],
  sync_state: 'local_only',
  local_version: 1,
  created_at: voiceProof.created_at,
  updated_at: voiceProof.updated_at,
};

const stages: WorkflowStageInstance[] = [
  {
    stage_instance_id: 'stage-active-work',
    job_id: 'qa-generator-job',
    template_id: 'generator_install_v1',
    template_version: '1.0.0',
    template_stage_id: 'active_work',
    stage_key: 'active_work',
    stage_name: 'Active Work',
    sort_order: 30,
    status: 'complete',
    required_count: 2,
    completed_required_count: 2,
    recommended_count: 1,
    completed_recommended_count: 1,
    missing_items: [],
    sync_state: 'local_only',
    local_version: 1,
    created_at: new Date(baseTime).toISOString(),
    updated_at: new Date(baseTime).toISOString(),
  },
  {
    stage_instance_id: 'stage-inspection',
    job_id: 'qa-generator-job',
    template_id: 'generator_install_v1',
    template_version: '1.0.0',
    template_stage_id: 'inspection_readiness',
    stage_key: 'inspection_readiness',
    stage_name: 'Inspection Readiness',
    sort_order: 40,
    status: 'in_progress',
    required_count: 2,
    completed_required_count: 1,
    recommended_count: 0,
    completed_recommended_count: 0,
    missing_items: ['Final inspection signoff not documented'],
    sync_state: 'local_only',
    local_version: 1,
    created_at: new Date(baseTime).toISOString(),
    updated_at: new Date(baseTime).toISOString(),
  },
];

const timelineEvents: TimelineEvent[] = [...proofs, voiceProof].map((proof) => ({
  event_id: `event-${proof.proof_id}`,
  job_id: proof.job_id,
  event_type: 'proof_captured',
  event_title: proof.title,
  related_proof_ids: [proof.proof_id],
  occurred_at: proof.captured_at,
  gps_latitude: proof.gps_latitude,
  gps_longitude: proof.gps_longitude,
  sync_state: 'local_only',
  local_version: 1,
  created_at: proof.created_at,
  updated_at: proof.updated_at,
}));

const mediaAssets: MediaAsset[] = proofs.map((proof) => ({
  media_id: `media-${proof.proof_id}`,
  proof_id: proof.proof_id,
  job_id: proof.job_id,
  local_uri: `qa://${proof.proof_id}.png`,
  mime_type: 'image/png',
  file_size: 2048,
  compression_state: 'not_needed',
  upload_state: 'local_only',
  sync_state: 'local_only',
  local_version: 1,
  created_at: proof.created_at,
  updated_at: proof.updated_at,
}));

function bundleForProof(proof: ProofObject): ExportProofBundle {
  const photo = photos.find((item) => item.id === proof.proof_id);
  return {
    proof,
    media: mediaAssets.filter((item) => item.proof_id === proof.proof_id),
    legacyPhoto: photo,
    voiceNote: proof.proof_id === voiceProof.proof_id ? runtimeVoiceNote : undefined,
    legacyVoiceNote: proof.proof_id === voiceProof.proof_id ? legacyVoiceNote : undefined,
    stage: stages.find((stage) => stage.stage_instance_id === proof.stage_instance_id),
    requirementLabel: photo?.category ?? legacyVoiceNote.category,
    stageLabel: proof.stage_instance_id === 'stage-inspection' ? 'Inspection Readiness' : 'Active Work',
  };
}

const fullAssembly: ExportAssembly = {
  runtimeJob: {
    job_id: 'qa-generator-job',
    company_id: 'qa-company',
    job_title: 'Generator install QA sample',
    job_type: 'Generator Install',
    trade: 'electrical',
    status: 'active',
    template_id: 'generator_install_v1',
    template_version: '1.0.0',
    sync_state: 'local_only',
    local_version: 1,
    created_at: new Date(baseTime).toISOString(),
    updated_at: new Date(baseTime + 360 * 60_000).toISOString(),
  },
  legacyJob: {
    id: 'qa-generator-job',
    customerName: 'QA Sample Customer',
    address: '123 Generator Way, Test City, TX',
    jobType: 'Generator Install',
    templateId: 'generator_install_v1',
    createdAt: baseTime,
    updatedAt: baseTime + 360 * 60_000,
    status: 'ACTIVE',
    syncStatus: 'PENDING',
    notes: 'Manual report QA fixture',
  },
  template: null,
  stages,
  proofs: [...proofs, voiceProof],
  mediaAssets,
  voiceNotes: [runtimeVoiceNote],
  timelineEvents,
  proofBundles: [...proofs, voiceProof].map(bundleForProof),
  photos,
  notes: [legacyVoiceNote],
  selectedProofIds: [...proofs, voiceProof].map((proof) => proof.proof_id),
  includedSections: [],
  packetType: 'internal_record',
  openRequiredItems: ['Final inspection signoff not documented'],
};

const business = {
  companyName: 'SiteProof QA Electric',
  tagline: 'Offline proof report QA',
  phone: '555-0100',
  email: 'qa@example.com',
  website: 'siteproof.test',
};

const manifestRows: Array<Record<string, unknown>> = [];

function renderReport(reportType: SiteProofReportType, folder: string) {
  const definition = getReportDefinition(reportType);
  const filtered = filterProofBundlesForReport(fullAssembly, definition, { reportDate: new Date(baseTime) });
  const selected = new Set(filtered.selectedProofIds);
  const relatedData = filterAssemblyRelatedDataForReport(fullAssembly, filtered.selectedProofIds, reportType);
  const assembly: ExportAssembly = {
    ...fullAssembly,
    proofs: fullAssembly.proofs.filter((proof) => selected.has(proof.proof_id)),
    mediaAssets: relatedData.mediaAssets,
    timelineEvents: relatedData.timelineEvents,
    proofBundles: filtered.proofBundles,
    photos: filtered.photos,
    notes: filtered.notes,
    selectedProofIds: filtered.selectedProofIds,
    includedSections: filtered.includedSections,
    packetType: reportTypeToPacketType(reportType),
    reportType,
    reportDefinition: definition,
    openRequiredItems: filtered.openRequiredItems,
  };
  const doc = renderAppReportPdf({
    assembly,
    definition,
    language: 'en',
    business,
    user: { fullName: 'QA Technician' },
    integrityManifest: definition.includeIntegrityManifest
      ? {
        jobId: assembly.runtimeJob.job_id,
        manifestId: `qa-${reportType}`,
        generatedAt: new Date().toISOString(),
        algorithm: 'SHA-256',
        manifestHash: `hash-${reportType}`,
        signedManifestHash: `signed-${reportType}`,
        proofCount: assembly.proofs.length,
        mediaCount: assembly.mediaAssets.length,
        timelineEventCount: assembly.timelineEvents.length,
        proofHashes: assembly.proofs.map((proof) => ({
          proofId: proof.proof_id,
          title: proof.title,
          proofType: proof.proof_type,
          capturedAt: proof.captured_at,
          hash: `hash-${proof.proof_id}`,
          status: 'verified' as const,
        })),
      }
      : null,
    signatureDataUrl: undefined,
    narrative: buildLocalReportNarrative(assembly, definition, 'en'),
  });

  const fileName = buildExportFileName(assembly.legacyJob, reportType, 'en');
  const reportDir = path.join(outDir, folder);
  fs.mkdirSync(reportDir, { recursive: true });
  const outputPath = path.join(reportDir, fileName);
  fs.writeFileSync(outputPath, Buffer.from(doc.output('arraybuffer')));
  manifestRows.push({
    folder,
    reportType,
    title: packetTitle(reportType, 'en'),
    packetType: assembly.packetType,
    fileName,
    selectedProofIds: assembly.selectedProofIds,
    includedSections: assembly.includedSections,
  });
}

for (const reportType of APP_REPORT_TYPES) {
  renderReport(reportType, 'individual');
}

const allReportsDoc = new jsPDF({ compress: true });
const allProofIds = new Set<string>();
let firstAllReportsContext: Parameters<typeof addAppReportFooters>[1] | null = null;

APP_REPORT_TYPES.forEach((reportType, index) => {
  const definition = getReportDefinition(reportType);
  const filtered = filterProofBundlesForReport(fullAssembly, definition, { reportDate: new Date(baseTime) });
  const selected = new Set(filtered.selectedProofIds);
  const relatedData = filterAssemblyRelatedDataForReport(fullAssembly, filtered.selectedProofIds, reportType);
  const assembly: ExportAssembly = {
    ...fullAssembly,
    proofs: fullAssembly.proofs.filter((proof) => selected.has(proof.proof_id)),
    mediaAssets: relatedData.mediaAssets,
    timelineEvents: relatedData.timelineEvents,
    proofBundles: filtered.proofBundles,
    photos: filtered.photos,
    notes: filtered.notes,
    selectedProofIds: filtered.selectedProofIds,
    includedSections: filtered.includedSections,
    packetType: reportTypeToPacketType(reportType),
    reportType,
    reportDefinition: definition,
    openRequiredItems: filtered.openRequiredItems,
  };
  assembly.selectedProofIds.forEach((proofId) => allProofIds.add(proofId));
  const context = {
    assembly,
    definition,
    language: 'en' as const,
    business,
    user: { fullName: 'QA Technician' },
    integrityManifest: null,
    signatureDataUrl: undefined,
    narrative: buildLocalReportNarrative(assembly, definition, 'en'),
  };
  if (!firstAllReportsContext) firstAllReportsContext = context;
  renderAppReportIntoDocument(allReportsDoc, context, index > 0);
});

if (firstAllReportsContext) addAppReportFooters(allReportsDoc, firstAllReportsContext);
const allReportsFileName = buildExportFileName(fullAssembly.legacyJob, SiteProofReportType.ALL_REPORTS, 'en');
fs.writeFileSync(path.join(outDir, allReportsFileName), Buffer.from(allReportsDoc.output('arraybuffer')));
manifestRows.push({
  folder: 'all-reports',
  reportType: SiteProofReportType.ALL_REPORTS,
  title: packetTitle(SiteProofReportType.ALL_REPORTS, 'en'),
  packetType: reportTypeToPacketType(SiteProofReportType.ALL_REPORTS),
  fileName: allReportsFileName,
  selectedProofIds: [...allProofIds],
  includedSections: ['all_reports', ...APP_REPORT_TYPES.map((reportType) => `report:${reportType}`)],
});

fs.writeFileSync(path.join(outDir, 'qa-export-history.json'), `${JSON.stringify(manifestRows, null, 2)}\n`);
console.log(`Generated 6 individual QA PDFs plus one combined All Reports PDF in ${outDir}`);
console.log('Use docs/qa/app-report-pdf-qa-checklist.md for desktop, phone, and Spanish visual QA.');
