import assert from 'node:assert/strict';
import test from 'node:test';
import { ProofCaptureService } from './proofCaptureService';
import { SettingsService, createDefaultSettings } from './settingsService';
import { SiteProofDataService } from './siteProofDataService';
import { CloudSyncService, CloudSyncAttempt } from './cloudSyncService';
import { MediaPipelineService } from './mediaPipelineService';
import { JobVideo } from '../domain/models';

async function withVideoCaptureStubs(run: (calls: { uploads: Array<{ objectType: string; visibility?: string }>; saved?: JobVideo }) => Promise<void>) {
  const originalGetSettings = SettingsService.getSettings;
  const originalGetJobById = SiteProofDataService.getJobById;
  const originalSaveVideo = SiteProofDataService.saveVideo;
  const originalUpload = CloudSyncService.upload;
  const originalThumbnail = MediaPipelineService.generateVideoThumbnail;
  const calls: { uploads: Array<{ objectType: string; visibility?: string }>; saved?: JobVideo } = { uploads: [] };

  SettingsService.getSettings = async () => ({
    ...createDefaultSettings('en'),
    cloudEnabled: true,
    videoDefaults: {
      ...createDefaultSettings('en').videoDefaults,
      uploadVideoOverWifiOnly: false,
    },
  });
  SiteProofDataService.getJobById = async () => null;
  SiteProofDataService.saveVideo = async (video) => { calls.saved = video; };
  CloudSyncService.upload = async (request): Promise<CloudSyncAttempt> => {
    calls.uploads.push({ objectType: request.objectType, visibility: request.visibility });
    return { state: 'synced', result: { success: true, cloudObjectKey: `cloud/${request.objectType}/${request.localId}` } };
  };
  MediaPipelineService.generateVideoThumbnail = async () => 'data:image/jpeg;base64,ZmFrZS10aHVtYg==';

  try {
    await run(calls);
  } finally {
    SettingsService.getSettings = originalGetSettings;
    SiteProofDataService.getJobById = originalGetJobById;
    SiteProofDataService.saveVideo = originalSaveVideo;
    CloudSyncService.upload = originalUpload;
    MediaPipelineService.generateVideoThumbnail = originalThumbnail;
  }
}

test('saveVideo stamps integrity, stores locally, and uploads video plus thumbnail', () => withVideoCaptureStubs(async (calls) => {
  const blob = new Blob(['real video bytes'], { type: 'video/webm' });
  const video = await ProofCaptureService.saveVideo({
    jobId: 'job-1',
    blob,
    durationMs: 12_000,
    mimeType: 'video/webm',
    category: 'Walkthrough',
    notes: 'Panel startup sequence.',
  });

  assert.equal(calls.saved?.id, video.id);
  assert.equal(video.integrityStatus, 'verified');
  assert.equal(video.proofHashAlgorithm, 'SHA-256');
  assert.equal(video.fileSize, blob.size);
  assert.equal(video.thumbnailDataUrl?.startsWith('data:image/jpeg'), true);
  assert.deepEqual(calls.uploads.map((call) => call.objectType), ['video', 'thumbnail']);
  assert.equal(calls.uploads[0].visibility, 'private');
  assert.equal(calls.uploads[1].visibility, 'customer_visible');
  assert.equal(video.cloudObjectKey, `cloud/video/${video.id}`);
  assert.equal(video.thumbnailCloudObjectKey, `cloud/thumbnail/${video.id}_thumbnail`);
}));

test('saveVideo respects disabled video setting', async () => {
  const originalGetSettings = SettingsService.getSettings;
  SettingsService.getSettings = async () => ({
    ...createDefaultSettings('en'),
    videoDefaults: {
      ...createDefaultSettings('en').videoDefaults,
      videoEnabled: false,
    },
  });
  try {
    await assert.rejects(
      () => ProofCaptureService.saveVideo({
        jobId: 'job-1',
        blob: new Blob(['video'], { type: 'video/webm' }),
        durationMs: 1000,
        mimeType: 'video/webm',
      }),
      /disabled/,
    );
  } finally {
    SettingsService.getSettings = originalGetSettings;
  }
});
