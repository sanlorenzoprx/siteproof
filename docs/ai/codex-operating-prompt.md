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
- bilingual English/Spanish completeness

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
9. Bilingual Confirmation:
   - UI language behavior reviewed: yes/no
   - Capture language behavior reviewed: yes/no/not applicable
   - Export language behavior reviewed: yes/no/not applicable
   - New user-facing strings added in English and Spanish: yes/no/not applicable
   - Hardcoded English exemptions documented: yes/no/not applicable
   - Template-authored localization reviewed: yes/no/not applicable
   - Tests or static guards added/updated: yes/no/not applicable
```


Also include a legacy cleanup assessment: identify touched old architecture, the cleanup performed now, any cleanup deferred, and the guardrail that prevents the old pattern from spreading.

## Bilingual Requirement â€” Required for Completion

This feature must be implemented in English and Spanish at the same time.

Do not add English-only user-facing copy.

All new user-facing strings must use the existing i18n system.

Preserve the independent language model:

- `uiLanguage` controls app interface copy.
- `captureLanguage` controls dictation, voice capture, note analysis, and capture metadata.
- `exportLanguage` controls reports, PDFs, filenames, export packet titles, and customer/inspector-facing output.

If this feature touches workflow-template-authored content, add localized template fields instead of hardcoding translations inside components.

If this feature touches reports/PDFs, export text must follow `exportLanguage`, not `uiLanguage`.

If bilingual support cannot be completed safely, document the exact blocker in the implementation report.

The feature is not complete until bilingual behavior is implemented or explicitly blocked.

## Completion Standard

Passing tests is necessary but not sufficient.

A task is not complete until:

- acceptance criteria are reviewed,
- bilingual English/Spanish behavior is implemented or explicitly blocked,
- offline-first behavior is preserved,
- relevant tests/checks pass,
- remaining risks and exemptions are documented,
- and the required implementation report is created.
