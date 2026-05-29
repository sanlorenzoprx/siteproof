# Phase 9 Phone Capture UX QA Checklist

Use this checklist for the Phase 9 phone capture UX/localization handoff. Run it on a real phone when possible; otherwise use mobile viewport emulation plus one desktop sanity pass.

## Scope

- Camera capture screen only: photo, document, GPS status, voice tag, issue tagging, save/retake, and return-to-job behavior.
- UI language coverage for English and Spanish.
- Capture metadata preservation: job id, requirement id, stage id, category, GPS, issue type, and document type.
- Offline-first behavior: capture should still save locally when the network is unavailable.

## Automated Checks

- Run `npm test`.
- Confirm `src/components/cameraCaptureModel.test.ts` passes once the Phase 9 helper extraction is implemented.
- Confirm helper-owned label keys resolve through `translate('es', key)` and do not display raw translation keys.
- Confirm `CameraCapture.tsx` no longer needs hardcoded strings for GPS status, document image notes, photo context transcripts, or issue type button labels.

## Phone Layout

- Camera opens directly from a job and fills the phone viewport without horizontal scroll.
- Top controls remain tappable with one thumb and do not cover the camera subject.
- Bottom controls do not overlap the proof context card, captured preview, or system browser controls.
- Category chips scroll horizontally and selected state remains visible.
- Save, retake, mic, shutter, and switch-camera buttons are large enough for field use with gloves.
- Long Spanish labels wrap or truncate cleanly without pushing controls off screen.

## Localization

- Set UI language to English and verify all camera controls are English.
- Set UI language to Spanish and verify all camera controls are Spanish.
- GPS locked, locating, capture context, save, retake, switch camera, microphone error, and camera error all localize.
- Issue type labels localize instead of displaying raw enum values like `CHANGE_ORDER`.
- Document capture saved-note copy localizes.
- Voice-tag photo context prefix localizes before saving the note transcript.
- Requirement names and capture hints follow the selected UI language.

## Capture Flow

- Open camera from a required checklist item and verify the proof context shows that item.
- Take a photo, retake it, then take another photo and save.
- Confirm the saved proof returns to the correct job and checklist tab when launched from a checklist step.
- Confirm general photo capture stays in capture flow after save when not launched from a checklist step.
- Confirm burst mode saves without leaving capture and gives visible feedback.
- Confirm front/back camera switch works without losing job context.

## Document Flow

- Launch camera with `document=1` and a document type.
- Capture and save a document image.
- Confirm the document record keeps the document type, requirement id, file metadata, and localized note.
- Confirm returning to the job preserves the expected tab.

## Voice Tag Flow

- Start and stop a voice tag from the camera screen.
- Confirm short/empty audio does not create a note.
- Confirm a valid transcription saves with the localized photo context prefix and selected category.
- Confirm microphone denial shows localized copy and does not break photo capture.

## GPS And Permissions

- Deny camera permission and confirm localized error copy plus safe return to the job.
- Deny location permission and confirm capture still works with a locating/no-GPS state.
- Grant location permission and confirm GPS status includes rounded accuracy when available.
- Confirm saved proof includes latitude and longitude when available.

## Offline And Recovery

- Enable airplane mode after the job is loaded.
- Capture a photo and confirm it saves locally.
- Capture a document image and confirm it saves locally.
- Navigate away and back to the job; confirm captured items remain visible.
- Restore network and confirm no duplicate records are created from the local captures.

## Guardrails

- Do not claim inspection approval, code compliance, customer acceptance, payment approval, or invoice status from capture alone.
- Do not block photo capture on AI transcription, cloud sync, or report generation.
- Do not lose captured media if voice transcription fails.
- Do not require cloud backup or license validation to save local proof.
