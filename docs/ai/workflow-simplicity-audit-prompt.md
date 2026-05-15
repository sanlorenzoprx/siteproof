# SiteProof Workflow Simplicity Audit Prompt v1

Review this SiteProof workflow for cognitive load and field friction.

SiteProof must preserve continuous documentation momentum under real-world jobsite conditions.

Evaluate:

- tap count
- decision count
- required typing
- modal/dialog interruptions
- navigation depth
- context switching
- hidden states
- sync confidence visibility
- one-handed operation
- recovery after interruption
- whether admin complexity leaks into field workflows

Score each interaction:

- Tap: +1
- Modal/dialog: +2
- Keyboard open: +3
- Required decision: +4
- Context switch: +5
- Workflow branch: +6
- Error interruption: +8
- Forced retry: +10

Classify:

- 0–10: Excellent
- 11–20: Acceptable
- 21–30: Needs review
- 31+: Reject / redesign

Return:

1. workflow complexity score
2. likely cognitive load hotspots
3. unnecessary decisions
4. typing that can be eliminated
5. context switches that can be merged
6. default/inference opportunities
7. field failure scenarios
8. simplified alternative workflow
9. required tests or field validation scripts

Final rule:

Prefer capture → speak → continue over navigate → configure → manage software.
