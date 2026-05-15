# SiteProof Timeline Playback v1

## What changed

Timeline Playback v1 adds a field-ready chronological job story view to SiteProof.

The new timeline pulls together:

- job creation/start events
- workflow stage events from runtime orchestration
- photos and proof captures
- voice notes and Voice AI summaries
- issues and change-order candidates
- generated export packets
- timestamps, stage labels, requirement labels, and GPS indicators

## New files

```text
src/features/timeline/timelinePlaybackService.ts
src/components/timeline/TimelinePlayback.tsx
```

## Updated files

```text
src/components/JobDetail.tsx
```

## User experience

A new **Timeline** tab appears in Job Detail.

It includes:

- timeline summary card
- event count
- photo count
- note count
- issue/change-order count
- job duration
- filters for All / Proof / Notes / Issues / Exports
- date-grouped chronological timeline
- photo preview modal
- GPS badge where available
- stage and requirement context

## Strategic value

This converts SiteProof from a capture tool into a jobsite playback system:

> Replay the job from arrival to export.

That matters for:

- inspection readiness
- insurance proof
- customer confidence
- dispute protection
- internal review
- foreman handoff

## Validation

- `npm run lint` passed
- `npm run build` passed
