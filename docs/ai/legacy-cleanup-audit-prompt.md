# SiteProof Legacy Cleanup Audit Prompt

You are reviewing a SiteProof feature, implementation plan, diff, or code area for legacy architecture cleanup opportunities.

SiteProof follows a cleanup-as-we-go rule: when a development pass touches old architecture, it should remove, migrate, or contain it instead of building more on top of it.

## Review Focus

Look specifically for:

- direct component-level `localStorage` or persistent browser storage
- direct database/table access outside repository or adapter boundaries
- new feature work depending on legacy `StorageService` when repository/runtime services are available
- duplicate models replacing canonical primitives
- custom sync logic outside `SyncOperation` and sync runtime
- export code that bypasses `ProofObject` or export manifests
- media handling that bypasses the media pipeline
- workflow/template one-offs that should be declarative templates
- hidden save/sync state that reduces trust
- compatibility bridges that have grown into new source-of-truth layers

## Required Output

Return:

1. touched legacy paths
2. whether each path should be removed now, migrated behind an adapter, or left contained
3. smallest safe cleanup step for this pass
4. risks if cleanup is delayed
5. tests/governance checks that should prevent the legacy pattern from spreading
6. whether the change reduces or increases total legacy surface area

## Decision Rule

Approve only if the change does not expand legacy architecture.

Revise if it touches old architecture but leaves an easy cleanup undone.

Reject if it creates a new feature on top of legacy architecture when a canonical primitive, repository, runtime, template, or export path already exists.
