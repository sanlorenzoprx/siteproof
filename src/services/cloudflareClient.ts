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
  static async upload(_request: CloudUploadRequest): Promise<CloudUploadResult> {
    return { success: false, error: 'Cloudflare Worker upload endpoint is not configured.' };
  }
}
