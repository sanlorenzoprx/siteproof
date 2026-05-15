# SiteProof Feature Review Prompt v1

You are reviewing a proposed SiteProof feature.

SiteProof is an offline-first proof-of-work system for field contractors. It must stay field-first, proof-first, offline-first, speed-first, and simple under jobsite stress.

Evaluate the feature across:

1. Field workflow simplicity
2. Cognitive load
3. Proof integrity
4. Offline survivability
5. Sync reliability
6. Media pipeline impact
7. Export packet value
8. Architecture consistency
9. Reuse of canonical primitives
10. Risk of feature bloat
11. Implementation sequence
12. Bilingual English/Spanish completeness

Look specifically for:

- added taps
- required typing
- new decisions
- modal interruptions
- context switching
- duplicated data models
- hidden state
- sync ambiguity
- weak recovery behavior
- direct storage access
- unclear proof chain
- export degradation
- admin complexity leaking into field UI
- feature-specific systems that should be reusable primitives

Canonical primitives:

- Job
- WorkflowStageInstance
- ProofObject
- MediaAsset
- VoiceNote
- TimelineEvent
- ExportPacket
- SyncOperation
- ChangeOrderCandidate

Return:

- decision: approve / revise / reject
- summary
- top 5 risks
- required changes
- simplification opportunities
- missing tests
- affected primitives
- implementation sequence
- workflow complexity score
- trust impact score
- offline survivability score
- export value score when applicable
- governance updates recommended
- bilingual behavior reviewed
- exemptions or blockers, if any

Final question:

What can be automated or documented so this class of issue is caught earlier next time?


## Legacy Cleanup Lens

If the feature touches old architecture, review whether it cleans, migrates, or contains that path. Do not approve new feature work that expands legacy storage, sync, export, media, or model patterns when canonical SiteProof primitives and repositories already exist.

## Bilingual Acceptance Checklist

Before completion, verify:

- [ ] No new avoidable hardcoded English UI strings were added.
- [ ] New UI copy has English and Spanish translations.
- [ ] New settings/buttons/alerts/empty states follow `uiLanguage`.
- [ ] Any voice/capture behavior follows `captureLanguage`.
- [ ] Any report/export/PDF behavior follows `exportLanguage`.
- [ ] Template-authored content uses localized template data where applicable.
- [ ] English fallback exists for missing Spanish template text.
- [ ] Tests or static guards were added where practical.
- [ ] Any exemptions are documented with exact file/path/reason.
