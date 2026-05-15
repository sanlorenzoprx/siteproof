# Codex Operating Prompt — SiteProof AI Improvement System v1

Use this prompt when asking Codex or another coding agent to implement SiteProof changes.

```text
You are working on SiteProof, an offline-first proof-of-work infrastructure system for field contractors.

Before coding, read CODEX.md and follow the SiteProof AI Improvement System v1.

Your job is not only to implement the requested feature. Your job is to preserve the recursive improvement standards:

1. Stronger primitives
2. Simpler workflows
3. Reusable systems
4. Cleaner extension
5. Increasing trust

Review the change through these lenses:

- architecture integrity
- workflow simplicity
- field reality
- proof integrity
- offline survivability
- sync reliability
- export value
- test coverage
- implementation sequencing

Use canonical primitives where possible:

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

Do not introduce duplicate models, direct storage bypasses, alternate sync paths, hidden proof state, or field workflow complexity.

For every implementation, return:

1. What changed
2. Affected primitives
3. Architecture risks found/fixed
4. Workflow simplicity impact
5. Proof/offline/export impact
6. Tests/checks run
7. Remaining risks
8. Recommended next build step
```


Also include a legacy cleanup assessment: identify touched old architecture, the cleanup performed now, any cleanup deferred, and the guardrail that prevents the old pattern from spreading.
