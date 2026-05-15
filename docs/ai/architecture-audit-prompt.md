# SiteProof Architecture Audit Prompt v1

Review the SiteProof codebase, feature spec, or diff for architecture risks.

Focus only on changes that improve or protect:

- offline reliability
- sync correctness
- proof integrity
- data durability
- media persistence
- export reproducibility
- schema consistency
- repository boundaries
- testability
- recovery after interruption
- reusable primitives

Look for:

- duplicated storage paths
- mutable identifiers
- missing hashes
- missing audit events
- weak transaction boundaries
- unbounded queues
- missing retry policy
- unsafe async operations
- poor error classification
- direct DB writes outside repository/adapter boundary
- feature-specific models that should be canonical primitives
- alternate timeline, export, proof, or sync systems
- circular dependencies
- legacy storage usage outside allowed adapters

Return:

1. critical issues
2. high-leverage fixes
3. low-effort 10x improvements
4. unsafe assumptions
5. suggested implementation order
6. tests required before merge
7. governance rule updates recommended
8. whether this change strengthens or weakens canonical architecture
