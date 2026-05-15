import { useCallback } from 'react';
import { ProofCaptureService, SavePhotoInput, SaveVoiceNoteInput } from '../services/proofCaptureService';

export function useProofCapture() {
  const savePhoto = useCallback((input: SavePhotoInput) => ProofCaptureService.savePhoto(input), []);
  const saveVoiceNote = useCallback((input: SaveVoiceNoteInput) => ProofCaptureService.saveVoiceNote(input), []);
  return { savePhoto, saveVoiceNote };
}
