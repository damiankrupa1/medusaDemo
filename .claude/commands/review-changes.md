---
description: Performs a read-only code review of Git changes for bugs, regressions, security and quality. Does not fix the code.
disable-model-invocation: true
---

# Review Changes

## Rules
- This is a read-only review. Do not edit files, stage changes or create commits.
- Do not run tests, linters or builds without separate approval.
- The default scope is uncommitted changes: `git diff`, `git diff --cached` and the new files from `git ls-files --others --exclude-standard`, which appear in no diff. If the user names a different scope (e.g. a branch against `main`: `git diff main...HEAD`), review that scope.
- Also read the code context needed to assess the changes.
- Do not assume that missing tests mean a bug; assess the risk of the specific change.

## Check
1. Logic errors and edge cases.
2. Regressions and incompatibility with existing API contracts.
3. Security, authorization, input validation and accidental secrets.
4. Error handling, loading states and empty results.
5. Typing, null/undefined, asynchrony and race conditions.
6. Performance, accessibility and responsiveness, if applicable.
7. Unnecessary complexity, duplication and unjustified dependencies.
8. Gaps in tests proportionate to the risk.

## Report
Return concrete findings with the file and the location of the snippet:
- [P1] critical issue;
- [P2] significant issue;
- [P3] minor issue;
- [P4] suggestion, if it is genuinely helpful.

For each finding, give the scenario, the impact and the reason. Do not report hypothetical issues without justification. If no issues were found, say the review found nothing significant, but do not guarantee the absence of bugs.

At the end, list the areas that could not be verified. Do not fix the issues found unless the user asks you to.
