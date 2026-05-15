export interface CloudUploadRequest {
  localId: string;
  jobId: string;
  objectType: 'photo' | 'report' | 'voice_note' | 'metadata';
  localUri?: string;
  payload?: unknown;
  contentType?: string;
}

export interface CloudUploadResult {
  success: boolean;
  cloudObjectKey?: string;
  error?: string;
}

export class CloudflareClient {
  static objectKey(request: CloudUploadRequest): string {
    return `${request.jobId}/${request.objectType}/${request.localId}`;
  }

  static async upload(request: CloudUploadRequest): Promise<CloudUploadResult> {
    const baseUrl = import.meta.env.VITE_SITEPROOF_API_BASE_URL;
    if (!baseUrl) return { success: false, error: 'Cloudflare Worker upload endpoint is not configured.' };
    try {
      const response = await fetch(`${baseUrl}/cloud/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...request, objectKey: this.objectKey(request) }),
      });
      if (!response.ok) return { success: false, error: 'Cloud upload boundary rejected request.' };
      return { success: true, cloudObjectKey: this.objectKey(request) };
    } catch {
      return { success: false, error: 'Cloud upload unavailable.' };
    }
  }
}
