# ADR-003 — Build Sequence Governance

## Status

Accepted

## Context

SiteProof has many attractive feature directions: proof integrity, guided workflows, export packets, sync hardening, operational AI, compliance templates, crew operations, and marketplaces. Building these out of order risks accidental architecture and duplicate primitives.

## Decision

SiteProof development follows a gated build sequence:

1. Core integrity
2. Storage stability
3. Workflow intelligence
4. Export system
5. Operational AI
6. Multi-user/crew operations

Each feature must identify its phase and canonical primitive dependencies before implementation.

## Consequences

Positive:
- less rework
- fewer duplicate models
- cleaner agentic coding handoffs
- better device-validation discipline

Tradeoffs:
- some useful features are intentionally delayed until their dependencies are stable
