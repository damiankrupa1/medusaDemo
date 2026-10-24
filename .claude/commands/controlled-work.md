---
description: Workflow requiring user approval for the planned changes and verification scope before implementation.
---

# Controlled Work

## Override rule

The user controls the scope of implementation and verification. Do not run tests, linters, builds, or verification commands before agreeing on the scope with the user.

## Stage 1: Analysis

1. Understand the task and inspect the relevant code paths.
2. Check the available scripts, tests, and project conventions.
3. Do not modify code yet.
4. Do not run validation commands yet.

## Stage 2: Plan and agreement

Before implementation, present a concise plan with:

- the proposed change and the files likely to be touched;
- the reason for the change and the intended effect;
- key risks or side effects;
- the exact verification scope, split into:
  - targeted tests;
  - lint/formatting (if relevant);
  - TypeScript or build validation;
  - integration or end-to-end checks (only when necessary);
- for each command, why it is needed and whether it is essential or optional.

The plan should be minimal and proportionate to the task. If a check is not necessary, say so explicitly.

Stop and ask for approval before implementing.

## Stage 3: Implementation

After approval:

- make the agreed changes;
- keep scope tight and avoid unrelated refactors;
- do not broaden verification without explaining why and getting approval.

## Stage 4: Verification

Run only the approved commands.

Do not rerun the full suite after every small fix unless that was explicitly agreed.

If a check fails, report the result honestly and propose the next step. Do not hide failures or claim tests passed when they were not run.

## Stage 5: Summary

Report:

- what changed;
- which approved checks were run;
- actual results;
- what was not validated;
- remaining risks or follow-up work.
