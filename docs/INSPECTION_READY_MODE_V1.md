# Inspection Ready Mode v1

Implemented in this build.

## What was added

- `src/features/inspection/inspectionReadinessService.ts`
- `src/hooks/useInspectionReadiness.ts`
- `src/components/inspection/InspectionReadyCard.tsx`
- `src/components/inspection/MissingProofList.tsx`
- `src/components/inspection/QualityWarningsPanel.tsx`
- `src/components/inspection/ReadyForInspectionBanner.tsx`

## Runtime behavior

Inspection readiness is calculated from:

- Workflow template proof requirements
- Runtime workflow stage instances
- Captured ProofObjects
- Inspector report export tags
- Required/recommended priority
- GPS/timestamp requirements
- Proof quality score

## UI behavior

Job Detail now shows:

- Inspection Ready score
- Blocking missing proof grouped by stage
- Warnings grouped by stage
- Inspector Report export blocking
- Guided capture links from missing proof items

## Guided capture

Missing proof actions now pass:

- `category`
- `requirementId`
- `stageId`

into camera/voice capture screens so captured media can bind back to the correct ProofRequirement.

## Validation

This build passed:

- `npm run lint`
- `npm run build`
