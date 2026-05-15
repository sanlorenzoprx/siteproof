# SiteProof AI Feature Review Checklist v1

Use this checklist before implementation and again before merge.

## Feature Identity

- Feature name:
- Feature tier: Core Workflow / Secondary Workflow / Administrative Workflow
- Primary user:
- Primary jobsite context:
- Required canonical primitives:
- Dependencies already complete:

## Architecture Fit

- Does this reuse canonical primitives?
- Does this avoid feature-specific storage models?
- Does this avoid direct database access outside repository boundaries?
- Does this avoid alternate sync paths?
- Does this preserve immutable proof identifiers?
- Does this add reusable capability instead of one-off logic?

## Workflow Simplicity

- How many taps are added to the golden path?
- Does this introduce new navigation?
- Does this require typing?
- Does this create new decisions?
- Does this introduce modals or confirmations?
- Can defaults, inference, or templates remove UI?
- Can the user complete the flow one-handed?
- Does this preserve capture momentum?

## Field Reality

Review the feature under:

- no signal
- low battery
- sunlight
- gloves
- rain/wet screen
- ladder/work truck usage
- exhausted technician
- app backgrounded mid-task
- device reboot or process death

## Proof Integrity

- Are proof IDs immutable?
- Are hashes generated when needed?
- Is custody/audit history preserved?
- Does export include required manifest data?
- Can the user tell whether proof is safe and synced?

## Offline & Sync

- Does it work offline first?
- Are retries safe?
- Are duplicates prevented?
- Is partial failure recoverable?
- Is local data durable before upload?
- Is sync state visible?

## Export Impact

- Does the feature improve customer/inspector packet value?
- Does it preserve report clarity?
- Does it avoid adding clutter?
- Does it improve proof ordering or narrative?

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

## Test Requirements

Require tests or manual scripts for:

- happy path
- offline path
- interrupted path
- duplicate prevention
- corrupt/missing data
- export output
- sync recovery
- large media set when applicable

## Decision

- Approve
- Revise
- Reject

Required changes before build/merge:

1.
2.
3.

## Bilingual Confirmation

- UI language behavior reviewed: yes/no
- Capture language behavior reviewed: yes/no/not applicable
- Export language behavior reviewed: yes/no/not applicable
- New user-facing strings added in English and Spanish: yes/no/not applicable
- Hardcoded English exemptions documented: yes/no/not applicable
- Template-authored localization reviewed: yes/no/not applicable
- Tests or static guards added/updated: yes/no/not applicable


## Legacy Cleanup

- Did this change touch legacy architecture?
- Did it remove, migrate, or contain the legacy path?
- Did it avoid adding new dependencies on legacy services?
- Did it reduce total legacy surface area?
- Did it add a guardrail or test if the legacy issue could recur?
