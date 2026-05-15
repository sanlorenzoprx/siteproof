# SiteProof AI Improvement System v1

SiteProof AI Improvement System v1 is the internal recursive improvement layer for SiteProof.

It is **not** a field-facing chatbot. It is a development operating system that uses AI to review and improve every meaningful feature across:

- architecture quality
- workflow simplicity
- proof integrity
- offline reliability
- export quality
- field usability
- template quality
- test coverage
- implementation sequencing
- bilingual English/Spanish completeness

## Operating Rule

Every meaningful SiteProof feature must pass through AI-assisted review for simplicity, trust, offline survivability, architecture fit, export value, and field reality before implementation.

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

## Core Loop

1. **Discover** — research field pain, edge cases, competitor weakness, regulatory requirements, and implementation constraints.
2. **Critique** — attack proposed features for cognitive load, architecture drift, sync risk, proof weakness, and field failure.
3. **Generate** — produce better specs, test plans, templates, prompts, and implementation sequences.
4. **Enforce** — convert useful findings into CI checks, governance rules, schemas, docs, and review gates.
5. **Learn** — feed pilot observations, telemetry, export failures, and field user feedback back into the system.

## What AI Should Optimize For

SiteProof should become more capable without becoming more cognitively expensive.

The improvement system should bias every feature toward:

- stronger primitives
- simpler workflows
- reusable systems
- cleaner extension
- increasing trust

## Required Review Artifacts

For each major feature, generate or update:

- task graph review
- feature review output
- workflow simplicity score
- architecture risk review
- field reality simulation
- export impact review when applicable
- test plan
- implementation sequence
- governance rule updates when needed

## Required Pre-Implementation Order

Before implementation planning, run:

1. intent classification
2. architecture context review
3. **Task Graph Review Layer**
4. implementation sequence planning

The Task Graph Review Layer is deterministic first. It exists to surface schema prerequisites, parallel-safe branches, blocked work, integration points, and required verification before coding starts.

## Human Review Requirement

AI can draft, critique, and generate tests. AI does not approve final product decisions alone.

Human review is required for:

- compliance templates
- legal/inspection language
- safety-critical field assumptions
- customer-facing export content
- release decisions


## Legacy Cleanup Prompt

`legacy-cleanup-audit-prompt.md` is required whenever feature work touches old architecture. It enforces the cleanup-as-we-go rule: migrate or contain legacy paths instead of building on top of them.
