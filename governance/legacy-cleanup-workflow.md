# SiteProof Legacy Cleanup Workflow v1

## Purpose

SiteProof should clean old architecture as it is encountered, not postpone cleanup into a vague future refactor.

This workflow makes legacy cleanup part of every feature pass, Codex packet, and quality check.

## Rule

When a development pass touches legacy architecture, it must either:

1. remove or migrate the legacy path in the same pass, or
2. document why cleanup is unsafe right now and add the smallest follow-up guardrail needed to prevent spread.

Do not create new work on top of legacy abstractions unless the work is explicitly a migration bridge.

## Legacy Architecture Examples

Treat these as cleanup triggers:

- direct component-level `localStorage` persistence
- direct database/table access outside repository or adapter boundaries
- new dependencies on `StorageService` for feature work that should use repositories/runtime services
- duplicate primitives or feature-specific substitutes for canonical entities
- custom sync logic outside `SyncOperation` / sync runtime
- export logic that bypasses `ProofObject` and export manifests
- field UI state that creates hidden save/sync status
- one-off template or workflow structures that should be declarative templates

## Required Cleanup Questions

Every feature implementation should answer:

1. Did this touch a legacy path?
2. Can the legacy path be removed now?
3. If not, what adapter boundary keeps it contained?
4. Did this reduce or increase the allowed legacy surface area?
5. Did this add tests or governance checks so the legacy pattern does not spread?

## Decision Standard

Prefer small continuous cleanup over large delayed rewrites.

Good cleanup:

- shrinks legacy surface area
- preserves behavior
- improves boundaries
- reduces duplicate models
- improves testability
- keeps field workflows stable

Bad cleanup:

- rewrites too much at once
- breaks pilot readiness
- hides migration risk
- changes UX behavior without need
- removes compatibility before data migration is safe

## Relationship To AI Improvement System

Every AI/Codex review packet must include a legacy cleanup lens:

> If the requested change touches old architecture, clean it up as part of the pass unless doing so creates greater risk. Do not expand legacy paths.

This makes cleanup recursive: each future improvement should leave the codebase slightly cleaner than it found it.


## Current cleanup baseline

As of Legacy Cleanup Pass v2, `StorageService` is the only intentionally contained legacy compatibility adapter. `SyncRuntime` and `indexedDb` are low-level runtime storage boundaries, not legacy drift. New feature work should avoid importing `StorageService` directly unless it is explicitly part of a migration bridge.
