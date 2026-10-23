---
description: Workflow for programming tasks that requires agreeing on the scope of changes and tests with the user before implementation.
---

# Controlled Work

## Overriding rule

The user controls the scope of implementation and verification. Do not run tests, linters, builds or any other verification commands without first agreeing on their scope with the user.

## Stage 1: Analysis

1. Understand the task and analyze the relevant parts of the code.
2. Check the available scripts in package.json, the test configuration and existing conventions.
3. Do not modify any code yet.
4. Do not run tests, linters, builds or verification scripts.

## Stage 2: Plan and agreement

Before implementing, present:

- the proposed changes and the files they affect;
- risks and potential side effects;
- the proposed verification scope, split into:
  - targeted tests;
  - lint and formatting;
  - typecheck;
  - build;
  - integration or e2e tests.

For each command, state why it is needed and whether it is essential.

Propose a minimal set of checks proportionate to the task.

Stop and ask for approval of the plan and the verification scope. Do not implement changes before you get approval.

## Stage 3: Implementation

After approval, make the agreed changes.

Do not extend the verification scope on your own. If additional tests or commands become necessary, explain why and ask the user before running them.

## Stage 4: Verification

Run only the approved commands.

Do not rerun the full test suite after every small fix unless that was agreed.

If a check fails, present the result and propose next steps. Do not hide errors, and do not claim tests passed if they were not run.

## Stage 5: Summary

Report:
- what was changed;
- which approved commands were run;
- their actual results;
- what was not checked;
- any risks remaining after the changes.
