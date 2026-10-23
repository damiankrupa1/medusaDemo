---
description: Diagnoses a bug methodically, looks for the root cause and proposes a minimal fix before changing the code.
disable-model-invocation: true
---

# Debug Systematically

## Goal
Fix the cause of the bug instead of masking the symptoms with random changes.

## Stage 1: Gathering data
- Establish the expected and the actual behavior.
- Collect the exact error message, reproduction steps, context and recent changes, if available.
- Read the relevant files and configuration.
- Do not run tests, builds, linters, migrations or commands that may change data without agreement.

## Stage 2: Hypotheses
- List the most likely causes, ordered by the strength of the evidence.
- Separate observations from hypotheses.
- Propose the smallest experiment that distinguishes between the hypotheses.
- Ask for approval of diagnostic commands if they have not been approved before.

## Stage 3: Fix plan
Before making changes, describe:
- the root cause, or your current level of confidence;
- the files that need to change;
- the minimal scope of the fix;
- the regression risk;
- the proposed verification.

Stop after the plan and wait for approval of the implementation.

## Stage 4: Fix
After approval:
- change only the code needed for the fix;
- do not add dependencies without justification and approval;
- do not silence exceptions or weaken validation just to hide the bug;
- do not change production data or perform destructive operations.

## Stage 5: Result
Run only the agreed checks. Report the cause, the change, the results and the limitations. If the cause was not confirmed, say so plainly.
