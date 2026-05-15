# SiteProof Test Generation Prompt v1

Generate a test plan for this SiteProof feature or code change.

Prioritize high-risk field software failures:

- offline persistence
- interrupted sync
- app killed mid-capture
- duplicate proof objects
- corrupted media
- failed export
- missing hash
- invalid timeline event
- storage pressure
- malformed workflow template
- low battery behavior
- GPS unavailable
- timezone/clock drift
- background service interruption
- partial upload retry

Return tests grouped by:

1. unit tests
2. integration tests
3. offline/sync tests
4. media pipeline tests
5. export tests
6. proof integrity tests
7. workflow simplicity tests
8. manual field validation scripts

For each test include:

- purpose
- setup
- steps
- expected result
- failure signal
- affected primitives
