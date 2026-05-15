# SiteProof First-Run Voice Onboarding Implementation

## Purpose

This pass makes speech recognition one of the first interactions with SiteProof and reframes onboarding around the emotional hook:

> I can talk, take photos, and this thing organizes the job.

## Implemented Sequence

1. Welcome / value promise
2. Voice tuning
3. Trade/job type selection
4. Create first job by voice
5. Open capture screen immediately

## Product Language Added

- Built for the field. Tuned for your work.
- Talk. Capture. Get paid.
- SiteProof helps you talk, take photos, organize the job, protect the proof, finish the packet, and get paid with less back-and-forth.
- Less typing. Better proof. Faster payment.

## Technical Notes

- `Onboarding` now accepts `onComplete` so app routing can immediately unlock the authenticated/onboarded routes after first-run setup.
- Voice tuning is persisted through `AppSettingsService`, not browser `localStorage`.
- Primary trade/job template is persisted through `AppSettingsService`.
- First job creation uses `JobWorkflowService.createJob` so the job is born with the selected workflow template.
- After creating the first job, onboarding routes the user directly to `/job/:id/camera`.

## Workflow Simplicity Impact

This reduces first-run cognitive load by avoiding a long business profile form before the user experiences core value. Full profile details can still be completed later in settings.
