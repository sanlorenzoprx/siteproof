# Task Graph Review Layer

Run this internal review before implementation planning.

Convert the request into a dependency-aware plan that answers:

1. What is the real goal?
2. Which SiteProof modules are affected?
3. Which architecture or schema decisions must happen first?
4. Which tasks must be sequential?
5. Which tasks can safely run in parallel?
6. Which tasks are blocked?
7. Which risks could cause rework?
8. Which tests are required after each branch and after integration?

## Required Rules

- Domain/data schema work runs before UI or export work.
- Export work depends on stable proof, media, workflow, and timeline data.
- Sync work depends on durable offline storage and conflict-safe IDs.
- Trade-specific behavior should become workflow template data before custom code.
- Bilingual requirements must be planned with the feature, not deferred to a later cleanup branch.
- User-facing UI work must account for `uiLanguage`; capture work must preserve `captureLanguage`; export work must preserve `exportLanguage`.
- AI should remain invisible to field users unless explicitly justified.
- Parallel branches touching shared models require an integration review.
- Every parallel branch requires branch-level tests plus final integration verification.
- Office-heavy scope should be deferred unless it directly supports the proof-of-work MVP.

## Required Output

Produce:

- request summary
- real goal
- affected modules
- architecture dependencies
- task nodes
- task dependencies
- parallel groups
- blocked tasks
- risk flags
- recommended sequence
- required tests
- implementation notes
