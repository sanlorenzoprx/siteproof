# SiteProof AI Improvement System v1

## Purpose

SiteProof AI Improvement System v1 is the internal recursive improvement layer that keeps the product from drifting into feature sprawl, architecture entropy, and field workflow overwhelm.

It turns AI into a repeatable product-improvement engine rather than a visible app feature.

## Foundational Principle

Every new feature must answer:

> Does this make SiteProof more trusted, simpler, more reusable, more field-resilient, and easier to extend — or does it create complexity debt?

## Scope

This system governs:

- proposed features
- architecture changes
- templates
- exports
- workflows
- proof objects
- sync/runtime behavior
- test plans
- research findings
- implementation sequencing
- dependency-aware task graph review

## Required AI Review Dimensions

Each major feature must be reviewed across these dimensions:

1. **Architecture Fit** — Does it reuse canonical primitives and repository boundaries?
2. **Workflow Simplicity** — Does it reduce or increase cognitive load?
3. **Proof Integrity** — Does it preserve trusted evidence?
4. **Offline Survivability** — Does it work under field interruption and no signal?
5. **Sync Safety** — Does it avoid duplicate, ambiguous, or lost state?
6. **Media Pipeline Impact** — Does it affect capture, compression, thumbnails, storage, or export originals?
7. **Export Value** — Does it improve or degrade the final packet?
8. **Field Reality** — Does it survive gloves, sunlight, rain, stress, low battery, and motion?
9. **Reuse Quality** — Does it extend shared systems or create one-off logic?
10. **Implementation Sequence** — Are prerequisites complete before build begins?
11. **Legacy Cleanup** — If old architecture is touched, is it removed, migrated, or contained without spreading?
12. **Task Graph Review** - Are prerequisites, blocked tasks, parallel-safe branches, integration points, and required tests explicit before implementation starts?

## Required Output Format

AI review output must include:

- decision: approve, revise, or reject
- top risks
- required changes
- simplification opportunities
- missing tests
- affected primitives
- implementation sequence
- task graph review result
- workflow complexity score
- trust impact score
- offline survivability score
- export value score when applicable

## Approval Rules

A feature should be revised or rejected if it:

- bypasses canonical primitives
- creates feature-specific storage
- adds hidden sync state
- increases capture friction
- requires unnecessary typing
- introduces office/admin complexity into field workflows
- weakens proof integrity
- lacks interruption recovery
- cannot be tested offline
- degrades export clarity

## Recursion Rule

Every AI review should ask:

> Is there a new guardrail, test, prompt, schema, or doc that should be added so this class of issue is caught automatically next time?

This is what makes the system recursive.

## Relationship To Other Governance Layers

This system does not replace existing governance. It coordinates them.

- Architecture Governance protects structure.
- Workflow Simplicity Governance protects field usability.
- Proof Integrity protects trust.
- Sync Runtime protects survivability.
- Export Governance protects the deliverable.
- AI Improvement System reviews and strengthens all of them.
- Task Graph Review protects sequencing before implementation planning begins.

## Required Pre-Implementation Workflow

```text
User Request
  ->
Intent Classification
  ->
Architecture Context Review
  ->
Task Graph Review
  ->
Implementation Sequence
  ->
Code Changes
  ->
Integration Review
  ->
Quality / Build / Test Verification
```

Task Graph Review is required before new features, refactors, schema changes, export changes, sync changes, AI feature changes, offline storage changes, template changes, and proof-engine changes.

## Non-Goals

Do not use this system to justify:

- visible chatbot bloat
- over-automation of field decisions
- hallucinated compliance claims
- speculative features without field value
- bureaucracy that slows pilot learning

The AI Improvement System is a guardrail, not a gatekeeping bureaucracy.


## Cleanup-As-We-Go Automation

The AI Improvement System must actively look for legacy architecture during every meaningful feature review.

When legacy architecture is encountered:

1. identify the touched legacy path
2. decide whether it can be cleaned immediately
3. prefer small safe migrations over delayed rewrites
4. prevent new work from expanding the legacy surface area
5. update guardrails if the issue could recur

Supporting files:

- `governance/legacy-cleanup-workflow.md`
- `docs/architecture/LEGACY_CLEANUP_AUTOMATION_V1.md`
- `docs/ai/legacy-cleanup-audit-prompt.md`
- `scripts/legacy-architecture-check.mjs`

Run:

```bash
npm run legacy:check
```
