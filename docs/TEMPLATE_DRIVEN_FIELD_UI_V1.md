# Template-Driven Field UI v1

This update replaces the previous Job Detail proof tab with a stage-first field workflow.

## What changed

- Job Detail now reads the WorkflowTemplate structure from `generator_install_v1.json`.
- The main screen is now organized by workflow stages.
- Each stage displays required, recommended, conditional, and optional proof requirements.
- Each proof item shows capture instructions, hints, captured count, and status.
- Capture buttons route directly to camera or voice note flows with the requirement label.
- Proof progress is based on runtime ProofObject completion, not only legacy photo categories.
- Missing required proof appears as a clear field-friendly warning.
- Export view now separates Customer Report, Inspector Report, Internal Record, and Dispute Report.
- Inspector Report is blocked until required proof is complete.
- Removed field-user-facing language like protocol, sovereign data, and audit ledger from the primary job screen.

## Runtime flow

```text
WorkflowTemplate JSON
  -> Job Detail Stage UI
  -> Requirement Capture Action
  -> Camera / Voice Capture
  -> Legacy Save
  -> RuntimeOrchestrator
  -> ProofObject + MediaAsset + TimelineEvent
  -> Missing Proof + Progress Recompute
```

## Next recommended UI pass

1. Make CameraCapture display “Capturing for: [Requirement]” more prominently.
2. Make VoiceNoteCapture read the `category` query parameter.
3. Add checklist completion persistence for non-media checklist items.
4. Add export-profile-driven PDF generation instead of legacy ReportMode mapping.
