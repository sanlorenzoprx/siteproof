import assert from 'node:assert/strict';
import test from 'node:test';
import { translate } from '../config/i18n';
import * as cameraCaptureModel from './cameraCaptureModel';

const model = cameraCaptureModel as Record<string, unknown>;
const t = (key: string) => translate('es', key);

test('camera capture model returns translation keys that resolve in Spanish', () => {
  const modes = ['photo', 'video', 'document'] as const;

  for (const mode of modes) {
    const primaryKey = cameraCaptureModel.getPrimaryCaptureLabelKey(mode, false);
    const useKey = cameraCaptureModel.getUseCaptureLabelKey(mode);
    const readyKey = cameraCaptureModel.getReadyStatusKey(mode);

    assert.notEqual(translate('es', primaryKey), primaryKey, `Missing Spanish translation for ${primaryKey}`);
    assert.notEqual(translate('es', useKey), useKey, `Missing Spanish translation for ${useKey}`);
    assert.notEqual(translate('es', readyKey), readyKey, `Missing Spanish translation for ${readyKey}`);
  }

  const stopRecordingKey = cameraCaptureModel.getPrimaryCaptureLabelKey('video', true);
  assert.notEqual(translate('es', stopRecordingKey), stopRecordingKey, `Missing Spanish translation for ${stopRecordingKey}`);
});

test('camera capture model owns localized phone capture status and saved-note copy', () => {
  const formatCaptureGpsStatus = model.formatCaptureGpsStatus;
  const getDocumentImageNote = model.getDocumentImageNote;
  const buildPhotoContextTranscript = model.buildPhotoContextTranscript;
  const buildPhotoDescriptionTranscript = model.buildPhotoDescriptionTranscript;

  assert.equal(typeof formatCaptureGpsStatus, 'function', 'Expected formatCaptureGpsStatus(location, t) export');
  assert.equal(typeof getDocumentImageNote, 'function', 'Expected getDocumentImageNote(t) export');
  assert.equal(typeof buildPhotoContextTranscript, 'function', 'Expected buildPhotoContextTranscript(category, text, t) export');
  assert.equal(typeof buildPhotoDescriptionTranscript, 'function', 'Expected buildPhotoDescriptionTranscript(category, text, t) export');

  assert.equal((formatCaptureGpsStatus as Function)(null, t), 'Localizando...');
  assert.equal((formatCaptureGpsStatus as Function)({ lat: 18.4, lng: -66.1 }, t), 'GPS fijado');
  assert.equal((formatCaptureGpsStatus as Function)({ lat: 18.4, lng: -66.1, accuracy: 12.4 }, t), 'GPS fijado +/-12m');

  const documentNote = (getDocumentImageNote as Function)(t);
  assert.notEqual(documentNote, 'Document saved as image. You can add a note later.');
  assert.equal(documentNote, translate('es', 'jobDetail.documentCapture.savedImageFileNote'));

  const transcript = (buildPhotoContextTranscript as Function)('Panel principal', 'Cable instalado.', t);
  assert.equal(transcript, '[Contexto de foto: Panel principal] Cable instalado.');

  const descriptionTranscript = (buildPhotoDescriptionTranscript as Function)('Panel principal', 'El cable esta instalado.', t);
  assert.equal(descriptionTranscript, '[Descripción de foto: Panel principal] El cable esta instalado.');
});

test('camera capture model exposes localized issue type options for phone buttons', () => {
  const getIssueTypeOptions = model.getIssueTypeOptions;
  assert.equal(typeof getIssueTypeOptions, 'function', 'Expected getIssueTypeOptions(t) export');

  const options = (getIssueTypeOptions as Function)(t);
  assert.deepEqual(options, [
    { value: 'SAFETY', label: 'Seguridad' },
    { value: 'DEFICIENCY', label: 'Deficiencia' },
    { value: 'CHANGE_ORDER', label: 'Orden de cambio' },
    { value: 'BLOCKED', label: 'Bloqueado' },
  ]);
});
