# SiteProof AI Improvement System v1 — Codex Operating File

## Status

Foundational moving forward.

This file is the Codex-facing operating contract for SiteProof. Every meaningful coding pass should read this file before planning, editing, or merging code.

SiteProof is not a generic contractor SaaS app. It is an offline-first proof-of-work infrastructure system for field contractors. The product should become more capable without becoming more cognitively heavy.

## Mission

Use AI as a recursive internal improvement layer to keep every SiteProof feature:

- simpler for field crews
- stronger architecturally
- safer offline
- more trustworthy as evidence
- easier to extend through canonical primitives and templates
- more valuable in final exports
- better tested before field use

The AI Improvement System is not a visible chatbot feature. It is the thinking layer that guides build sequence, code review, workflow design, test planning, and product judgment.

## Non-Negotiable Product Identity

SiteProof exists to beat paper, WhatsApp, random photo galleries, spreadsheets, and bloated office-centric contractor software.

The product gravity must remain:

- field-first
- offline-first
- proof-first
- speed-first
- export-first
- trust-first

Avoid drifting toward:

- generic CRM
- bloated project management
- office dashboards
- feature-heavy SaaS clones
- visible AI gimmicks
- admin complexity leaking into field workflows

## Core Recursive Improvement Standard

Good recursion means each feature should improve at least one of these without damaging the others:

1. Stronger primitives
2. Simpler workflows
3. Reusable systems
4. Cleaner extension
5. Increasing trust

Bad recursion means a feature adds local convenience while increasing global complexity.

Reject or redesign features that create:

- duplicate models
- alternate storage paths
- workflow clutter
- hidden sync state
- fragile offline behavior
- proof ambiguity
- untested edge cases
- export degradation
- unnecessary user decisions

## Canonical Primitives

Feature work must extend existing primitives wherever possible.

Canonical entities:

- Job
- Customer
- ProofObject
- MediaAsset
- VoiceNote
- TimelineEvent
- WorkflowStage
- Requirement
- ExportPacket
- SyncOperation
- ChangeOrder
- GPSLog

Do not create feature-specific substitutes unless an ADR explicitly approves it.

Preferred pattern:

Feature -> canonical primitive extension -> repository/runtime/export integration

Avoid:

Feature -> custom data model -> custom storage path -> custom sync logic -> custom export handling

## Required AI Review Lenses

Before implementing or merging a meaningful feature, review it through these lenses.

### 1. Architecture Integrity

Look for:

- duplicated primitives
- direct storage access
- repository bypasses
- sync runtime bypasses
- mutable proof IDs
- weak transaction boundaries
- unsafe async operations
- circular dependencies
- feature-specific hacks

Prompt source:

`docs/ai/architecture-audit-prompt.md`

### 2. Workflow Simplicity

Look for:

- added taps
- required typing
- extra decisions
- modal interruptions
- context switching
- hidden state
- screen clutter
- admin complexity in field flows
- violation of one-handed operation

Prompt source:

`docs/ai/workflow-simplicity-audit-prompt.md`

### 3. Field Reality

Simulate:

- no signal
- low battery
- rain
- gloves
- sunlight
- stress
- fatigue
- ladder/truck movement
- app kill/reopen
- interrupted capture

Prompt source:

`docs/ai/field-reality-simulation-prompt.md`

### 4. Proof Integrity

Ensure:

- immutable proof ID
- hashable evidence payload
- timeline event linkage
- audit/custody trail
- export manifest inclusion
- tamper status visibility
- no silent overwrites

Prompt source:

`docs/ai/feature-review-prompt.md`

### 5. Export Value

Exports are the product surface contractors show customers, inspectors, insurance adjusters, and office teams.

Look for:

- missing proof
- poor ordering
- unclear summary
- weak customer readability
- weak inspector usefulness
- missing manifest/timeline
- bad photo grouping
- unprofessional output

Prompt source:

`docs/ai/export-quality-review-prompt.md`

### 6. Test Generation

Generate tests for:

- offline persistence
- sync interruption
- proof hashing
- media corruption
- duplicate prevention
- export reproducibility
- app lifecycle recovery
- malformed templates
- storage pressure
- timeline reconstruction

Prompt source:

`docs/ai/test-generation-prompt.md`


### 7. Legacy Cleanup As You Go

If a coding pass touches legacy architecture, clean it up in the same pass when safe.

Look for:

- component-level persistent browser storage
- direct DB/table access outside repositories/adapters
- new feature work depending on legacy `StorageService` instead of repositories/runtime services
- duplicate canonical primitives
- custom sync/export/media paths
- hidden save/sync state

Do not expand legacy paths. Either migrate, contain, or document why cleanup is unsafe right now.

Prompt source:

`docs/ai/legacy-cleanup-audit-prompt.md`

### 8. Bilingual English/Spanish Completeness

## SiteProof Bilingual-First Development Rule

All future SiteProof product work must be implemented bilingual-first.

English and Spanish support are not follow-up tasks. They are part of the definition of done.

Every new or modified user-facing feature must:

1. Use the existing i18n system for app UI copy.
2. Support `uiLanguage` for interface labels, buttons, alerts, empty states, settings, and instructions.
3. Preserve `captureLanguage` for dictation, voice notes, field text analysis, and capture metadata.
4. Preserve `exportLanguage` for reports, PDFs, filenames, export packets, and customer/inspector-facing output.
5. Avoid hardcoded user-facing English strings unless explicitly documented as exempt.
6. Add Spanish copy at the same time English copy is added.
7. Add tests or static guards where practical.
8. Document any remaining English-only text as an intentional exemption, not silent technical debt.

Passing tests is necessary but not sufficient. A feature is not complete unless bilingual behavior is reviewed.

## Required Decision Output

Every AI review should produce a structured decision:

- approve
- revise
- reject

Default to revise when a feature is valuable but creates avoidable complexity.

Required output sections:

1. Decision
2. Top risks
3. Required changes
4. Simplification opportunities
5. Missing tests
6. Implementation sequence
7. Affected primitives
8. Workflow complexity score
9. Trust impact score
10. Offline survivability score
11. Export value score
12. Reuse score

Schema source:

`governance/ai-review-schema.json`

## Build Sequence Discipline

Do not implement features out of dependency order.

Preferred sequence:

1. Canonical primitives
2. Repository/storage integration
3. Runtime/sync integration
4. Proof integrity integration
5. Workflow/template integration
6. Export integration
7. UI surface
8. Tests and governance checks
9. Pilot validation

A UI feature that lacks storage, sync, proof, and export integration is not complete.

## Workflow Simplicity Budgets

Core field workflows should be held to aggressive simplicity standards.

Targets:

- Resume active job: <= 1 tap
- Open camera: <= 1 tap
- Capture proof: <= 1 tap
- Save voice note: hold/release only
- Export packet: <= 3 taps
- Reopen last workflow state: <= 1 tap

Weighted complexity model:

- Tap: +1
- Modal/dialog: +2
- Keyboard open: +3
- Required decision: +4
- Context switch: +5
- Workflow branch: +6
- Error interruption: +8
- Forced retry: +10

Classification:

- 0–10: Excellent
- 11–20: Acceptable
- 21–30: Needs review
- 31+: Reject/redesign

Use:

`npm run ai:score-workflow -- <workflow-metrics.json>`

## Required Commands Before Packaging

Run these when dependencies are installed:

```bash
npm run lint
npm run governance:check
npm run ai:check
npm run build
npm run pilot:smoke
npm run quality:check
```

When dependencies are not installed, at minimum run:

```bash
npm run governance:check
npm run ai:check
node scripts/ai-review-feature.mjs
node scripts/ai-generate-test-plan.mjs
```

## Codex Workflow

When Codex or another coding agent works on SiteProof:

1. Read this file.
2. Identify the feature's affected primitives.
3. Generate an AI review packet with `npm run ai:review -- <feature-spec-file>`.
4. Generate a test-plan packet with `npm run ai:test-plan -- <feature-spec-file>`.
5. Implement in the required build sequence.
6. Avoid new abstractions unless an ADR is added.
7. Run governance checks.
8. Summarize the review decision, code changes, tests, and remaining risks.

## Hard Stop Conditions

Stop and redesign if a feature:

- bypasses canonical repositories
- creates a duplicate proof/media/timeline/sync model
- hides sync or save state
- allows proof loss without recovery
- adds field typing without a strong reason
- adds capture-flow modals
- creates export output without proof manifest support
- reduces offline survivability
- adds admin complexity to core field workflows
- fails the workflow complexity threshold without an approved exception

## Definition of Done

A SiteProof feature is not done when it renders.

It is done when it:

- reuses canonical primitives
- works offline
- survives interruption
- preserves proof integrity
- maintains simple field flow
- contributes to export value
- has generated test coverage or test plan
- passes governance checks
- has clear residual risks documented
- has bilingual English/Spanish behavior implemented or explicitly blocked

## Completion Standard

Passing tests is necessary but not sufficient.

A task is not complete until:

- acceptance criteria are reviewed,
- bilingual English/Spanish behavior is implemented or explicitly blocked,
- offline-first behavior is preserved,
- relevant tests/checks pass,
- remaining risks and exemptions are documented,
- and the required implementation report is created.

## North Star

Compound capability without compound cognitive load.

Every build pass should make SiteProof more trusted, simpler to operate, and harder to break in the field.
