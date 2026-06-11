import assert from 'node:assert/strict';
import test from 'node:test';
import { ProofCaptureService } from './proofCaptureService';
import { SettingsService, createDefaultSettings } from './settingsService';
import { SiteProofDataService } from './siteProofDataService';
import { CloudSyncService, CloudSyncAttempt } from './cloudSyncService';
import { MediaPipelineService } from './mediaPipelineService';
import { JobPhoto, JobVideo, VoiceNote } from '../domain/models';

async function withVideoCaptureStubs(run: (calls: { uploads: Array<{ objectType: string; visibility?: string; contentType?: string; payload?: unknown }>; saved?: JobVideo }) => Promise<void>) {
  const originalGetSettings = SettingsService.getSettings;
  const originalGetJobById = SiteProofDataService.getJobById;
  const originalSaveVideo = SiteProofDataService.saveVideo;
  const originalUpload = CloudSyncService.upload;
  const originalThumbnail = MediaPipelineService.generateVideoThumbnail;
  const calls: { uploads: Array<{ objectType: string; visibility?: string; contentType?: string; payload?: unknown }>; saved?: JobVideo } = { uploads: [] };

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
    calls.uploads.push({ objectType: request.objectType, visibility: request.visibility, contentType: request.contentType, payload: request.payload });
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
  assert.deepEqual(calls.uploads.map((call) => call.objectType), ['video', 'thumbnail', 'metadata']);
  assert.equal(calls.uploads[0].visibility, 'private');
  assert.equal(calls.uploads[1].visibility, 'customer_visible');
  assert.equal(calls.uploads[2].visibility, 'private');
  assert.equal(calls.uploads[2].contentType, 'application/json');
  assert.equal(video.cloudObjectKey, `cloud/video/${video.id}`);
  assert.equal(video.thumbnailCloudObjectKey, `cloud/thumbnail/${video.id}_thumbnail`);
}));

async function withCaptureCloudStubs(run: (calls: {
  uploads: Array<{ objectType: string; visibility?: string; contentType?: string; payload?: unknown }>;
  photo?: JobPhoto;
  voiceNote?: VoiceNote;
}) => Promise<void>) {
  const originalGetSettings = SettingsService.getSettings;
  const originalGetJobById = SiteProofDataService.getJobById;
  const originalSavePhoto = SiteProofDataService.savePhoto;
  const originalSaveVoiceNote = SiteProofDataService.saveVoiceNote;
  const originalUpload = CloudSyncService.upload;
  const originalProcessPhotoBlob = MediaPipelineService.processPhotoBlob;
  const calls: {
    uploads: Array<{ objectType: string; visibility?: string; contentType?: string; payload?: unknown }>;
    photo?: JobPhoto;
    voiceNote?: VoiceNote;
  } = { uploads: [] };

  SettingsService.getSettings = async () => ({
    ...createDefaultSettings('en'),
    cloudEnabled: true,
  });
  SiteProofDataService.getJobById = async () => null;
  SiteProofDataService.savePhoto = async (photo) => { calls.photo = photo; };
  SiteProofDataService.saveVoiceNote = async (note) => { calls.voiceNote = note; };
  MediaPipelineService.processPhotoBlob = async (blob, dataUrl) => ({
    originalBlob: blob,
    previewDataUrl: dataUrl,
    thumbnailDataUrl: dataUrl,
    originalSize: blob.size,
    compressionState: 'not_needed',
    thumbnailState: dataUrl ? 'generated' : 'pending',
  });
  CloudSyncService.upload = async (request): Promise<CloudSyncAttempt> => {
    calls.uploads.push({ objectType: request.objectType, visibility: request.visibility, contentType: request.contentType, payload: request.payload });
    return { state: 'synced', result: { success: true, cloudObjectKey: `cloud/${request.objectType}/${request.localId}` } };
  };

  try {
    await run(calls);
  } finally {
    SettingsService.getSettings = originalGetSettings;
    SiteProofDataService.getJobById = originalGetJobById;
    SiteProofDataService.savePhoto = originalSavePhoto;
    SiteProofDataService.saveVoiceNote = originalSaveVoiceNote;
    CloudSyncService.upload = originalUpload;
    MediaPipelineService.processPhotoBlob = originalProcessPhotoBlob;
  }
}

test('savePhoto uploads proof image and private report metadata', () => withCaptureCloudStubs(async (calls) => {
  const blob = new Blob(['photo bytes'], { type: 'image/jpeg' });
  const photo = await ProofCaptureService.savePhoto({
    jobId: 'job-1',
    blob,
    category: 'Panel label',
    notes: 'Label visible.',
    isIssue: true,
    issueType: 'DEFICIENCY',
  });

  assert.equal(calls.photo?.id, photo.id);
  assert.deepEqual(calls.uploads.map((call) => call.objectType), ['photo', 'metadata']);
  assert.equal(calls.uploads[0].visibility, 'private');
  assert.equal(calls.uploads[1].contentType, 'application/json');
  assert.equal(photo.cloudObjectKey, `cloud/photo/${photo.id}`);
  assert.match(JSON.stringify(calls.uploads[1].payload), /Panel label/);
}));

test('saveVoiceNote uploads audio, transcript, tags, and metadata privately', () => withCaptureCloudStubs(async (calls) => {
  const audioBlob = new Blob(['audio bytes'], { type: 'audio/webm' });
  const note = await ProofCaptureService.saveVoiceNote({
    jobId: 'job-1',
    transcribedText: 'Customer asked for extra conduit and there is a missing cover issue.',
    audioBlob,
    category: 'Voice walkthrough',
  });

  assert.equal(calls.voiceNote?.id, note.id);
  assert.deepEqual(calls.uploads.map((call) => call.objectType), ['voice_note', 'transcript', 'metadata']);
  assert.equal(calls.uploads.every((call) => call.visibility === 'private'), true);
  assert.equal(note.cloudObjectKey, `cloud/voice_note/${note.id}`);
  assert.equal(note.transcriptCloudObjectKey, `cloud/transcript/${note.id}_transcript`);
  assert.equal(note.metadataCloudObjectKey, `cloud/metadata/${note.id}_metadata`);
  assert.match(JSON.stringify(calls.uploads[1].payload), /extra conduit/);
  assert.match(JSON.stringify(calls.uploads[2].payload), /changeOrderCandidates/);
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
