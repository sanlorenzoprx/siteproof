export type CloudObjectType =
  | 'photo'
  | 'document'
  | 'video'
  | 'metadata'
  | 'voice_note'
  | 'signature'
  | 'transcript'
  | 'report'
  | 'bid_report'
  | 'thumbnail'
  | 'share_package';

export type CloudReportType =
  | 'customer_completion'
  | 'daily_job_proof'
  | 'inspection_readiness'
  | 'change_order_evidence'
  | 'photo_proof_timeline'
  | 'payment_final_handoff'
  | 'office_internal_job_record'
  | 'all_reports'
  | 'internal_bid_report'
  | 'customer_bid_report';

export type CloudObjectVisibility =
  | 'private'
  | 'internal_only'
  | 'customer_visible'
  | 'hidden_do_not_export';

export interface CloudStorageObject {
  id: string;
  ownerId: string;
  jobId: string;
  objectType: CloudObjectType;
  reportType?: CloudReportType;
  visibility: CloudObjectVisibility;
  storageKey: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'pending' | 'synced' | 'failed';
  shareLinkId?: string;
}

export interface CloudUploadRequest {
  localId: string;
  proofObjectId?: string;
  mediaAssetId?: string;
  jobId: string;
  objectType: CloudObjectType;
  ownerId?: string;
  companyId?: string;
  licenseId?: string;
  reportType?: CloudReportType;
  visibility?: CloudObjectVisibility;
  localUri?: string;
  payload?: unknown;
  blob?: Blob;
  contentType?: string;
  mimeType?: string;
  filename?: string;
  fileSize?: number;
  sha256?: string;
  checksum?: string;
}

export interface CloudUploadResult {
  success: boolean;
  cloudObjectKey?: string;
  cloudObjectId?: string;
  object?: CloudStorageObject;
  error?: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  method: 'PUT';
  storageKey: string;
  cloudObjectId: string;
  requiredHeaders?: Record<string, string>;
}

async function sha256Hex(value: Blob | string): Promise<string> {
  const data = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(await value.arrayBuffer());
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function blobFromRequest(request: CloudUploadRequest): Promise<Blob | null> {
  if (request.blob) return request.blob;
  if (request.localUri) return fetch(request.localUri).then((response) => response.blob()).catch(() => null);
  if (request.payload !== undefined) return new Blob([JSON.stringify(request.payload)], { type: request.contentType ?? 'application/json' });
  return null;
}

export class CloudflareClient {
  static objectKey(request: Pick<CloudUploadRequest, 'localId' | 'jobId' | 'objectType' | 'ownerId' | 'reportType'>): string {
    const ownerId = request.ownerId || 'local-owner';
    if (request.objectType === 'report' && request.reportType) {
      return `owners/${ownerId}/jobs/${request.jobId}/reports/${request.reportType}/${request.localId}.pdf`;
    }
    if (request.objectType === 'bid_report' && request.reportType) {
      return `owners/${ownerId}/jobs/${request.jobId}/reports/${request.reportType}/${request.localId}.pdf`;
    }
    if (request.objectType === 'video') return `owners/${ownerId}/jobs/${request.jobId}/videos/${request.localId}.webm`;
    if (request.objectType === 'voice_note') return `owners/${ownerId}/jobs/${request.jobId}/voice_notes/${request.localId}.webm`;
    if (request.objectType === 'metadata') return `owners/${ownerId}/jobs/${request.jobId}/metadata/${request.localId}.json`;
    if (request.objectType === 'thumbnail') return `owners/${ownerId}/jobs/${request.jobId}/thumbnails/${request.localId}.jpg`;
    return `owners/${ownerId}/jobs/${request.jobId}/${request.objectType}/${request.localId}`;
  }

  static defaultVisibility(request: CloudUploadRequest): CloudObjectVisibility {
    if (request.visibility) return request.visibility;
    if (request.objectType === 'bid_report' && request.reportType === 'internal_bid_report') return 'internal_only';
    if (request.objectType === 'bid_report' && request.reportType === 'customer_bid_report') return 'customer_visible';
    if (request.objectType === 'report' && request.reportType === 'customer_completion') return 'customer_visible';
    return 'private';
  }

  static async upload(request: CloudUploadRequest): Promise<CloudUploadResult> {
    const baseUrl = (import.meta.env.VITE_SITEPROOF_API_BASE_URL || '').trim().replace(/\/+$/, '');
    if (!baseUrl) return { success: false, error: 'Cloudflare Worker upload endpoint is not configured.' };
    try {
      const blob = await blobFromRequest(request);
      const contentType = request.mimeType ?? request.contentType ?? blob?.type ?? 'application/octet-stream';
      const fileSize = request.fileSize ?? blob?.size ?? 0;
      const sha256 = request.sha256 ?? request.checksum ?? await sha256Hex(blob ?? JSON.stringify(request.payload ?? request.localId));
      const visibility = this.defaultVisibility(request);
      const objectId = request.proofObjectId ?? request.mediaAssetId ?? request.localId;

      const uploadResponse = await fetch(`${baseUrl}/api/cloud/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: request.jobId,
          objectId,
          proofObjectId: request.proofObjectId,
          mediaAssetId: request.mediaAssetId,
          objectType: request.objectType,
          reportType: request.reportType,
          visibility,
          contentType,
          mimeType: contentType,
          filename: request.filename,
          fileSize,
          sha256,
          checksum: sha256,
          licenseId: request.licenseId,
          companyId: request.companyId ?? request.ownerId,
          ownerId: request.ownerId,
        }),
      });
      if (!uploadResponse.ok) return { success: false, error: 'Cloud upload boundary rejected request.' };
      const upload = await uploadResponse.json() as UploadUrlResponse;

      if (blob && upload.uploadUrl) {
        const putResponse = await fetch(upload.uploadUrl, {
          method: upload.method,
          headers: upload.requiredHeaders,
          body: blob,
        });
        if (!putResponse.ok) return { success: false, error: 'Cloud object upload failed.' };
      }

      const commitResponse = await fetch(`${baseUrl}/api/cloud/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cloudObjectId: upload.cloudObjectId,
          storageKey: upload.storageKey,
          objectKey: upload.storageKey,
          sha256,
          checksum: sha256,
          fileSize,
          licenseId: request.licenseId,
          companyId: request.companyId ?? request.ownerId,
        }),
      });
      if (!commitResponse.ok) return { success: false, cloudObjectId: upload.cloudObjectId, cloudObjectKey: upload.storageKey, error: 'Cloud upload commit failed.' };
      const committed = await commitResponse.json() as { object?: CloudStorageObject };
      return { success: true, cloudObjectId: upload.cloudObjectId, cloudObjectKey: upload.storageKey, object: committed.object };
    } catch {
      return { success: false, error: 'Cloud upload unavailable.' };
    }
  }
}
