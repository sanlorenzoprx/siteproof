export type CaptureMode = 'photo' | 'video' | 'document';

export type CaptureErrorCode =
  | 'camera_permission_denied'
  | 'camera_unavailable'
  | 'video_unsupported'
  | 'save_failed'
  | 'description_save_failed';

export type CaptureIssueType = 'SAFETY' | 'DEFICIENCY' | 'CHANGE_ORDER' | 'BLOCKED';

type Translator = (key: string) => string;

export function getInitialCaptureMode(documentMode: boolean): CaptureMode {
  return documentMode ? 'document' : 'photo';
}

export function getPrimaryCaptureLabelKey(mode: CaptureMode, isRecordingVideo: boolean): string {
  if (mode === 'document') return 'capture.captureDocument';
  if (mode === 'video') return isRecordingVideo ? 'capture.stopRecording' : 'capture.startRecording';
  return 'capture.takePhoto';
}

export function getUseCaptureLabelKey(mode: CaptureMode): string {
  if (mode === 'document') return 'capture.useDocument';
  if (mode === 'video') return 'capture.useVideo';
  return 'capture.usePhoto';
}

export function getReadyStatusKey(mode: CaptureMode): string {
  if (mode === 'document') return 'capture.documentReady';
  if (mode === 'video') return 'capture.videoReady';
  return 'capture.photoReady';
}

export function classifyCameraError(error: unknown): CaptureErrorCode {
  const name = error instanceof DOMException ? error.name : '';
  return name === 'NotAllowedError' || name === 'PermissionDeniedError'
    ? 'camera_permission_denied'
    : 'camera_unavailable';
}

export function formatCaptureGpsStatus(
  location: { lat: number; lng: number; accuracy?: number } | null,
  t: Translator,
): string {
  if (!location) return t('capture.locating');
  const accuracy = location.accuracy ? ` +/-${Math.round(location.accuracy)}m` : '';
  return `${t('capture.gpsLocked')}${accuracy}`;
}

export function getDocumentImageNote(t: Translator): string {
  return t('jobDetail.documentCapture.savedImageFileNote');
}

export function buildPhotoContextTranscript(category: string, text: string, t: Translator): string {
  return `${t('capture.photoContextPrefix')} ${category}] ${text}`;
}

export function buildPhotoDescriptionTranscript(category: string, text: string, t: Translator): string {
  return `${t('capture.photoDescriptionPrefix')} ${category}] ${text}`;
}

export function getIssueTypeOptions(t: Translator): Array<{ value: CaptureIssueType; label: string }> {
  return [
    { value: 'SAFETY', label: t('capture.issueSafety') },
    { value: 'DEFICIENCY', label: t('capture.issueDeficiency') },
    { value: 'CHANGE_ORDER', label: t('capture.issueChangeOrder') },
    { value: 'BLOCKED', label: t('capture.issueBlocked') },
  ];
}
