# Codex/Cursor Handoff — SiteProof AI Improvement System Bilingual-First Governance Rule

## Branch

Create a small governance branch from `main`:

```bash
git checkout main
git pull origin main
git checkout -b siteproof-ai-system-bilingual-first-rule
```

## Mission

Update the SiteProof AI Improvement System so every future development branch is bilingual-first by default.

From this point forward, future workstreams such as license, cloud, sync, Stripe, storage, PWA, camera, PDF, templates, settings, onboarding, and field workflow changes must implement English and Spanish support at the same time.

English + Spanish support is not a follow-up cleanup task. It is part of the definition of done.

This is a governance/documentation/process pass, not a product feature pass.

Do not change runtime app behavior unless a small documentation/test script reference requires it.

---

## Why This Pass Exists

SiteProof is now a bilingual offline-first product.

The app supports independent:

- `uiLanguage`
- `captureLanguage`
- `exportLanguage`

The SiteProof AI Improvement System must protect that architecture permanently.

Future Codex/Cursor work must not add English-only features and then rely on later Spanish cleanup passes.

Passing tests is necessary but not sufficient. A feature is not complete unless bilingual behavior is reviewed, implemented, or explicitly documented as blocked/exempt.

---

## Scope

Update the existing AI Improvement System docs, prompts, templates, and checklists so every future branch enforces bilingual-first development.

Review and update relevant files such as:

- `CODEX.md`
- `docs/ai/README.md`
- `docs/ai/task-graph-review-prompt.md`
- `governance/ai-improvement-system.md`
- `scripts/ai-review-feature.mjs`
- `scripts/ai-codex-packet.mjs`
- `scripts/ai-system-check.mjs`
- any existing Codex/Cursor handoff template docs
- any AI review checklist or implementation report template
- package scripts only if necessary for validation or checks

If file names differ, inspect the repo and update the closest equivalent AI Improvement System documentation and scripts.

---

## Required Governance Changes

### 1. Add SiteProof Bilingual-First Development Rule

Add this rule to the AI Improvement System documentation:

```md
## SiteProof Bilingual-First Development Rule

All future SiteProof product work must be implemented bilingual-first.

English and Spanish support are not follow-up tasks. They are part of the definition of done.

Every new or modified user-facing feature must:

1. Use the existing i18n system for app UI copy.
2. Support `uiLanguage` for interface labels, buttons, alerts, empty states, settings, and instructions.
3. Preserve `captureLanguage` for dictation, voice notes, field text analysis, and capture metadata.
4. Preserve `exportLanguage` for reports, PDFs, filenames, export packets, and customer/inspector-facing output.
5. Avoid hardcoded user-facing English strings unless explicitly documented as exempt.
6. Add Spanish copy at the same time English copy is added.
7. Add tests or static guards where practical.
8. Document any remaining English-only text as an intentional exemption, not silent technical debt.

Passing tests is necessary but not sufficient. A feature is not complete unless bilingual behavior is reviewed.
```

### 2. Update Codex/Cursor Handoff Template

Add this required section to the standard handoff template:

```md
## Bilingual Requirement — Required for Completion

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
```

### 3. Update Review Checklist

Add a bilingual acceptance checklist to the AI review process:

```md
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
```

### 4. Add Bilingual Review Category

The AI Improvement System review categories must include:

```text
Bilingual English/Spanish completeness
```

The full review category list should include or preserve:

1. Offline-first safety
2. Proof integrity
3. Field workflow simplicity
4. Export/PDF quality
5. Bilingual English/Spanish completeness
6. Cloud optionality
7. Test coverage
8. Regression risk
9. Implementation report quality

Do not remove existing categories unless they are duplicates.

### 5. Add “Passing Tests Is Not Enough” Rule

Add this language to the AI system docs and handoff templates:

```md
## Completion Standard

Passing tests is necessary but not sufficient.

A task is not complete until:

- acceptance criteria are reviewed,
- bilingual English/Spanish behavior is implemented or explicitly blocked,
- offline-first behavior is preserved,
- relevant tests/checks pass,
- remaining risks and exemptions are documented,
- and the required implementation report is created.
```

### 6. Require Bilingual Confirmation in Every Future Report

Update report templates or report instructions so every future AI implementation report includes:

```md
## Bilingual Confirmation

- UI language behavior reviewed: yes/no
- Capture language behavior reviewed: yes/no/not applicable
- Export language behavior reviewed: yes/no/not applicable
- New user-facing strings added in English and Spanish: yes/no/not applicable
- Hardcoded English exemptions documented: yes/no/not applicable
- Template-authored localization reviewed: yes/no/not applicable
- Tests or static guards added/updated: yes/no/not applicable
```

### 7. Update AI/Codex Packet Generation If Applicable

If `scripts/ai-codex-packet.mjs` or similar generates handoff text, update it so generated packets include the bilingual requirement automatically.

If `scripts/ai-review-feature.mjs` or similar outputs review prompts, update it so the bilingual checklist appears automatically.

If `scripts/ai-system-check.mjs` validates governance docs, update it so it checks for the new bilingual-first rule language.

Keep script changes minimal and safe.

---

## Not In Scope

Do not implement app features in this pass.

Do not modify:

- pricing
- offer strategy
- checkout
- license logic
- Cloudflare sync logic
- storage implementation
- camera behavior
- PWA behavior
- PDF generation behavior
- user-facing app screens unless they are documentation examples

Do not create a broad refactor.

This is a governance/process pass only.

---

## Validation Commands

Run:

```bash
npm install
npm run lint
npm run test
npm run build
npm run ai:check
npm run quality:check
```

If the governance/scripts changes introduce or require a more specific AI system check, run it and document it.

---

## Required Report

Create:

```text
SITEPROOF_AI_SYSTEM_BILINGUAL_FIRST_RULE_REPORT.md
```

The report must include:

1. Summary
2. Files reviewed
3. Files changed
4. Where the bilingual-first rule was added
5. How Codex/Cursor handoff templates were updated
6. How review checklists were updated
7. How “passing tests is necessary but not sufficient” was enforced
8. How future reports now require bilingual confirmation
9. Script changes, if any
10. Validation results
11. Remaining risks, if any
12. Exact blockers, if any
13. Merge recommendation

Use one of:

- `READY TO MERGE`
- `READY TO MERGE WITH NOTED RISKS`
- `NOT READY TO MERGE`

---

## Acceptance Criteria

This pass is complete only when:

- the AI Improvement System documents include the bilingual-first rule,
- future Codex/Cursor handoff guidance includes the bilingual requirement,
- review checklists include bilingual acceptance checks,
- future implementation reports require bilingual confirmation,
- “passing tests is necessary but not sufficient” is explicitly documented,
- relevant AI scripts/templates are updated if they generate handoffs/reviews,
- all validation commands pass,
- and the required report is created.

Do not stop just because tests pass.

Do not expand scope beyond AI Improvement System governance.

Do not merge directly to `main`; open a PR from:

```text
siteproof-ai-system-bilingual-first-rule
```

into:

```text
main
```
