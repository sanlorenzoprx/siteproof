# SiteProof Voice AI v1

## What changed

Voice notes are now treated as structured field intelligence, not just transcript text.

## Added

- Voice notes remain attached to job, stage, and requirement context.
- Audio is saved locally first and queued for sync through existing storage/runtime flow.
- Transcription runs when AI is available.
- Offline/local analysis runs on every transcript.
- English/Spanish language detection.
- Short voice-note summary.
- Material extraction.
- Issue extraction.
- Customer request extraction.
- Change-order candidate extraction.
- Extracted tasks.
- Voice notes now show AI summary and chips in Job Detail.
- PDF export includes voice summaries and extracted insights.
- Runtime orchestration stores structured voice note data in the repository layer.
- Change-order candidates are created from voice notes when detected.

## Important note

Voice AI v1 is offline-first. The extraction layer uses deterministic local rules so the app still provides value without internet or cloud AI. Cloud transcription is attempted when available, but the structured analysis does not depend on cloud access.

## Primary files touched

- `src/services/voiceAIService.ts`
- `src/services/proofCaptureService.ts`
- `src/services/runtimeOrchestrator.ts`
- `src/components/VoiceNoteCapture.tsx`
- `src/components/JobDetail.tsx`
- `src/services/pdfService.ts`
- `src/types.ts`
- `src/db/repositories/changeOrderRepository.ts`

## Field value

Contractor can speak naturally:

> Customer requested generator relocation. Need extra conduit and trenching around west wall.

SiteProof now extracts:

- materials: conduit, trenching
- customer request: customer requested generator relocation
- change-order candidate: extra conduit / relocation
- issue/task context for closeout

## Next recommended pass

Timeline Playback v1.
