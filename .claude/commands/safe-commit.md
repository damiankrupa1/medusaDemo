---
description: Safely prepares a Git commit. Checks the branch, changed files and diff, proposes a commit message and always requires explicit user approval before running git commit.
disable-model-invocation: true
---

# Safe Commit

## Goal

Prepare a commit in a controlled way. The user must know the scope of the changes and approve the operation before `git commit` is run.

## Absolute rules

- Never run `git commit` without the user's explicit approval of that specific commit.
- Do not treat earlier approval of an implementation or of running tests as approval of a commit.
- Do not run `git push`, switch branches, create tags or rewrite Git history without separate approval.
- Do not use `git add .`, `git add -A` or `git commit -a`.
- Do not overwrite, delete or reset the user's changes.
- Do not change file contents automatically just to prepare a commit.
- Do not skip Git hooks or safety checks.
- If the scope of the commit cannot be determined unambiguously, stop and ask.

## Stage 1: Inspection

Run only commands that read the repository state:

1. `git status --short --branch`
2. `git branch --show-current`
3. `git diff --stat`
4. `git diff`
5. `git diff --cached --stat`
6. `git diff --cached`
7. `git ls-files --others --exclude-standard`

Adapt the commands if the repository is large or the diff is extensive. Inspect specific files when needed.

Do not print secret values. If you find potential secrets, `.env` files, private keys or credentials, do not reveal their contents and warn the user.

Do not run tests, linters, typechecks or builds just to prepare a commit. Their scope should be agreed separately.

## Stage 2: Analysis

Present to the user:

- the current branch;
- the number and names of changed files;
- the split into staged, unstaged and untracked;
- a summary of the significant changes;
- suspicious, accidental or sensitive files;
- files that cannot be assessed safely;
- a proposed Conventional Commit message;
- the exact list of files intended for the commit.

Do not assume that all changed files belong in one commit. If the changes are unrelated, propose splitting them.

## Stage 3: Request for approval

Stop before any operation that writes to the Git index or creates a commit.

Show the report in this format, writing it and the question below in the user's language:

```text
BRANCH: ...
SCOPE: ...
FILES TO COMMIT: ...
SKIPPED FILES: ...
PROPOSED COMMIT MESSAGE: ...
TESTS / VERIFICATION: ... (only checks actually run)
WARNINGS: ...
```

Ask directly:

"Do you approve exactly this set of files and this commit message?"

Do not commit until the user answers affirmatively.

The answer must clearly refer to the commit presented. Do not treat an ambiguous reply as approval.

## Stage 4: Preparation

After approval:

1. Check `git status --short --branch` again.
2. Verify that the branch and the file contents have not changed since approval.
3. If anything significant has changed, cancel the operation and present an updated report for approval.
4. Add only the approved files to the index, using explicit paths.
5. Check `git diff --cached` and `git diff --cached --stat`.
6. If the actual staged changes differ from what was approved, do not commit. Explain the difference and ask for approval again.

Do not remove or replace other changes already in the index. If the user's changes cannot be separated safely, stop.

## Stage 5: Commit

Run `git commit` only when:
- the user has approved the specific scope and message;
- the branch and the staged diff have been verified again;
- there are no unresolved issues with the scope of the commit.

Use the approved message. Do not change it on your own.

If a Git hook rejects the commit, present the error and ask how to proceed. Do not bypass hooks and do not fix files automatically without approval.

## Stage 6: Summary

When done, report:
- the commit hash;
- the commit message;
- the branch;
- the list of committed files;
- the result of the operation.

Do not run `git push` automatically.
