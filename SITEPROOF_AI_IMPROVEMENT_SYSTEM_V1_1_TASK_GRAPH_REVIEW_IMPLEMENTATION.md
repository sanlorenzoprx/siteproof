# SiteProof AI Improvement System v1.1 — Task Graph Review Implementation

## What Was Added

SiteProof now has an internal deterministic Task Graph Review Layer that runs before implementation planning.

It converts broad requests into:

- affected modules
- architecture dependencies
- task nodes
- dependency edges
- parallel-safe groups
- blocked tasks
- risk flags
- recommended execution sequence
- required tests
- implementation notes

## Added Files

- `src/ai-improvement/taskGraphReview.ts`
- `src/ai-improvement/reviewPipeline.ts`
- `src/ai-improvement/taskGraphReview.test.ts`
- `docs/ai/task-graph-review-prompt.md`

## Workflow Integration

The AI Improvement workflow now expects:

1. intent classification
2. architecture context review
3. task graph review
4. implementation planning

`runSiteProofAiImprovementReview()` wires that order together for executable internal use.

## Verification

Run:

```bash
npm run ai:task-graph:test
npm run ai:check
```

## Version

`siteproof-ai-improvement-system-v1.1-task-graph-review`
