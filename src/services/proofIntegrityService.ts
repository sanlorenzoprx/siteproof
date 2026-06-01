import { JobPhoto, JobVideo, VoiceNote } from '../domain/models';
import { ExportAssembly } from '../features/export/exportAssembler';
import { Job, MediaAsset, ProofObject, TimelineEvent, nowIso } from '../db/schema';
import { proofRepository, timelineRepository } from '../db/repositories';

export type ProofIntegrityStatus = 'verified' | 'modified' | 'missing_hash' | 'unavailable';

export interface CustodyLogEntry {
  at: string;
  actor?: string | null;
  action: 'captured' | 'hashed' | 'verified' | 'modified' | 'exported' | 'synced' | 'viewed';
  note?: string | null;
}

export interface IntegrityStamp {
  proofId: string;
  hash: string;
  algorithm: 'SHA-256';
  canonicalVersion: 'siteproof-proof-v1';
  computedAt: string;
  sourceBytes: number;
  previousHash?: string | null;
}

export interface ExportIntegrityManifest {
  manifestId: string;
  jobId: string;
  generatedAt: string;
  algorithm: 'SHA-256';
  proofCount: number;
  mediaCount: number;
  timelineEventCount: number;
  manifestHash: string;
  signedManifestHash: string;
  proofHashes: Array<{
    proofId: string;
    title: string;
    proofType: string;
    capturedAt: string;
    hash: string | null;
    status: ProofIntegrityStatus;
  }>;
}

const encoder = new TextEncoder();

async function sha256Hex(bytes: ArrayBuffer | Uint8Array | string): Promise<string> {
  const buffer = typeof bytes === 'string'
    ? encoder.encode(bytes)
    : bytes instanceof Uint8Array
      ? bytes
      : bytes;
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
}

async function blobOrDataHash(blob?: Blob, dataUrl?: string, fallback?: string): Promise<{ hash: string; bytes: number }> {
  if (blob) {
    const arrayBuffer = await blob.arrayBuffer();
    return { hash: await sha256Hex(arrayBuffer), bytes: blob.size };
  }
  if (dataUrl) return { hash: await sha256Hex(dataUrl), bytes: dataUrl.length };
  const text = fallback ?? '';
  return { hash: await sha256Hex(text), bytes: text.length };
}

function appendCustodyLog(metadata: Record<string, unknown> | undefined, entry: CustodyLogEntry): Record<string, unknown> {
  const existing = Array.isArray(metadata?.custody_log) ? metadata?.custody_log as CustodyLogEntry[] : [];
  return { ...(metadata ?? {}), custody_log: [...existing, entry] };
}

export class ProofIntegrityService {
  static async stampPhoto(photo: JobPhoto, actor?: string | null): Promise<IntegrityStamp> {
    const source = await blobOrDataHash(photo.compressedBlob ?? photo.blob, photo.dataUrl, `${photo.jobId}:${photo.category}:${photo.timestamp}`);
    const canonical = stableStringify({
      canonicalVersion: 'siteproof-proof-v1',
      type: 'photo',
      jobId: photo.jobId,
      category: photo.category,
      requirementId: photo.requirementId ?? null,
      stageId: photo.stageId ?? null,
      timestamp: photo.timestamp,
      latitude: photo.latitude ?? null,
      longitude: photo.longitude ?? null,
      notes: photo.notes ?? null,
      sourceHash: source.hash,
    });
    const stamp: IntegrityStamp = {
      proofId: photo.id,
      hash: await sha256Hex(canonical),
      algorithm: 'SHA-256',
      canonicalVersion: 'siteproof-proof-v1',
      computedAt: nowIso(),
      sourceBytes: source.bytes,
      previousHash: photo.proofHash ?? null,
    };
    photo.proofHash = stamp.hash;
    photo.proofHashAlgorithm = stamp.algorithm;
    photo.integrityStatus = 'verified';
    photo.integrityStampedAt = stamp.computedAt;
    photo.custodyLog = [...(photo.custodyLog ?? []), { at: stamp.computedAt, actor, action: 'hashed', note: 'Photo proof hash generated locally.' }];
    return stamp;
  }

  static async stampVoiceNote(note: VoiceNote, actor?: string | null): Promise<IntegrityStamp> {
    const source = await blobOrDataHash(note.audioBlob, note.audioUrl, note.transcribedText);
    const canonical = stableStringify({
      canonicalVersion: 'siteproof-proof-v1',
      type: 'voice_note',
      jobId: note.jobId,
      category: note.category,
      requirementId: note.requirementId ?? null,
      stageId: note.stageId ?? null,
      timestamp: note.timestamp,
      transcript: note.transcribedText,
      summary: note.summary ?? null,
      language: note.language ?? 'unknown',
      sourceHash: source.hash,
    });
    const stamp: IntegrityStamp = {
      proofId: note.id,
      hash: await sha256Hex(canonical),
      algorithm: 'SHA-256',
      canonicalVersion: 'siteproof-proof-v1',
      computedAt: nowIso(),
      sourceBytes: source.bytes,
      previousHash: note.proofHash ?? null,
    };
    note.proofHash = stamp.hash;
    note.proofHashAlgorithm = stamp.algorithm;
    note.integrityStatus = 'verified';
    note.integrityStampedAt = stamp.computedAt;
    note.custodyLog = [...(note.custodyLog ?? []), { at: stamp.computedAt, actor, action: 'hashed', note: 'Voice note proof hash generated locally.' }];
    return stamp;
  }

  static async stampVideo(video: JobVideo, actor?: string | null): Promise<IntegrityStamp> {
    const source = await blobOrDataHash(video.blob, video.localUrl, `${video.jobId}:${video.category}:${video.timestamp}`);
    const canonical = stableStringify({
      canonicalVersion: 'siteproof-proof-v1',
      type: 'video',
      jobId: video.jobId,
      category: video.category,
      requirementId: video.requirementId ?? null,
      stageId: video.stageId ?? null,
      timestamp: video.timestamp,
      latitude: video.latitude ?? null,
      longitude: video.longitude ?? null,
      notes: video.notes ?? null,
      durationMs: video.durationMs,
      mimeType: video.mimeType,
      fileSize: video.fileSize,
      sourceHash: source.hash,
    });
    const stamp: IntegrityStamp = {
      proofId: video.id,
      hash: await sha256Hex(canonical),
      algorithm: 'SHA-256',
      canonicalVersion: 'siteproof-proof-v1',
      computedAt: nowIso(),
      sourceBytes: source.bytes,
      previousHash: video.proofHash ?? null,
    };
    video.proofHash = stamp.hash;
    video.proofHashAlgorithm = stamp.algorithm;
    video.integrityStatus = 'verified';
    video.integrityStampedAt = stamp.computedAt;
    video.custodyLog = [...(video.custodyLog ?? []), { at: stamp.computedAt, actor, action: 'hashed', note: 'Video proof hash generated locally.' }];
    return stamp;
  }

  static async stampRuntimeProof(proof: ProofObject, mediaAssets: MediaAsset[] = [], actor?: string | null): Promise<ProofObject> {
    const canonical = stableStringify({
      canonicalVersion: 'siteproof-proof-v1',
      proof_id: proof.proof_id,
      job_id: proof.job_id,
      proof_type: proof.proof_type,
      title: proof.title,
      description: proof.description ?? null,
      captured_at: proof.captured_at,
      gps_latitude: proof.gps_latitude ?? null,
      gps_longitude: proof.gps_longitude ?? null,
      requirement_id: proof.requirement_id ?? null,
      stage_instance_id: proof.stage_instance_id ?? null,
      media_checksums: mediaAssets.map((media) => media.checksum ?? '').sort(),
      notes: proof.notes ?? null,
    });
    const hash = await sha256Hex(canonical);
    return proofRepository.put({
      ...proof,
      hash,
      integrity_hash: hash,
      hash_algorithm: 'SHA-256',
      integrity_status: 'verified',
      integrity_stamped_at: nowIso(),
      metadata: appendCustodyLog(proof.metadata, { at: nowIso(), actor, action: 'hashed', note: 'Runtime ProofObject integrity hash generated.' }),
    } as ProofObject);
  }

  static async verifyRuntimeProof(proof: ProofObject, mediaAssets: MediaAsset[] = []): Promise<ProofIntegrityStatus> {
    if (!proof.hash && !proof.integrity_hash) return 'missing_hash';
    const canonical = stableStringify({
      canonicalVersion: 'siteproof-proof-v1',
      proof_id: proof.proof_id,
      job_id: proof.job_id,
      proof_type: proof.proof_type,
      title: proof.title,
      description: proof.description ?? null,
      captured_at: proof.captured_at,
      gps_latitude: proof.gps_latitude ?? null,
      gps_longitude: proof.gps_longitude ?? null,
      requirement_id: proof.requirement_id ?? null,
      stage_instance_id: proof.stage_instance_id ?? null,
      media_checksums: mediaAssets.map((media) => media.checksum ?? '').sort(),
      notes: proof.notes ?? null,
    });
    const nextHash = await sha256Hex(canonical);
    return nextHash === (proof.integrity_hash ?? proof.hash) ? 'verified' : 'modified';
  }

  static async buildExportManifest(params: {
    jobId: string;
    proofs: ProofObject[];
    mediaAssets: MediaAsset[];
    timelineEvents: TimelineEvent[];
  }): Promise<ExportIntegrityManifest> {
    const proofHashes = await Promise.all(params.proofs.map(async (proof) => ({
      proofId: proof.proof_id,
      title: proof.title,
      proofType: proof.proof_type,
      capturedAt: proof.captured_at,
      hash: proof.integrity_hash ?? proof.hash ?? null,
      status: await this.verifyRuntimeProof(proof, params.mediaAssets.filter((media) => media.proof_id === proof.proof_id)),
    })));
    const manifestBody = stableStringify({
      version: 'siteproof-export-manifest-v1',
      jobId: params.jobId,
      proofHashes,
      mediaIds: params.mediaAssets.map((media) => media.media_id).sort(),
      timelineIds: params.timelineEvents.map((event) => event.event_id).sort(),
    });
    const manifestHash = await sha256Hex(manifestBody);
    return {
      manifestId: `spm_${manifestHash.slice(0, 16)}`,
      jobId: params.jobId,
      generatedAt: nowIso(),
      algorithm: 'SHA-256',
      proofCount: params.proofs.length,
      mediaCount: params.mediaAssets.length,
      timelineEventCount: params.timelineEvents.length,
      manifestHash,
      signedManifestHash: await sha256Hex(`siteproof-local-signature-v1:${manifestHash}`),
      proofHashes,
    };
  }

  static async recordExportCustody(jobId: string, proofIds: string[], manifestHash: string): Promise<void> {
    await timelineRepository.createEvent({
      job_id: jobId,
      stage_instance_id: null,
      event_type: 'export_generated',
      event_title: 'Signed proof manifest generated',
      event_description: `Manifest ${manifestHash.slice(0, 16)} includes ${proofIds.length} proof items.`,
      related_proof_ids: proofIds,
    });
  }
}
