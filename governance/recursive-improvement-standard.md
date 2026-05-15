# SiteProof Recursive Improvement Standard v1

## Purpose

This governance standard turns the SiteProof AI Improvement System into a repeatable backend/product improvement loop.

Every feature must be judged by whether it compounds clarity or compounds chaos.

## Good Recursion

A feature creates good recursion when it strengthens one or more of these system qualities without weakening the others:

1. Stronger primitives
2. Simpler workflows
3. Reusable systems
4. Cleaner extension
5. Increasing trust

## Bad Recursion

A feature creates bad recursion when it adds local functionality while increasing global complexity.

Warning signs:

- duplicated data model
- custom storage path
- custom sync behavior
- field workflow clutter
- extra typing
- hidden save/sync state
- unverified export output
- non-recoverable errors
- missing audit trail
- workflow branching without strong value

## Required Feature Questions

Before implementation:

1. Which canonical primitives does this extend?
2. Does this reduce or increase field cognitive load?
3. Does this preserve offline operation?
4. Does this preserve proof integrity?
5. Does this improve export value?
6. Can this be expressed as a reusable system or template?
7. What tests prove it survives jobsite conditions?
8. What must be rejected to keep the product simple?

## Decision Rule

When in doubt, choose the implementation that produces:

- fewer concepts
- fewer taps
- fewer models
- fewer storage paths
- more reuse
- more recovery
- more visible trust

## Strategic Rule

Do not let SiteProof become more powerful by becoming more exhausting.

The product should compound capability without compounding cognitive load.


## Cleanup As We Go Rule

When a feature touches old architecture, the implementation should leave that area cleaner than it found it.

Required behavior:

- remove legacy usage when safe
- migrate persistence behind adapters/repositories/runtime services
- prevent legacy patterns from spreading
- document any cleanup intentionally deferred
- add or strengthen a guardrail when a legacy issue is discovered

Legacy cleanup is part of normal feature work, not a separate someday refactor.
