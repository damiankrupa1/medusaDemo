# Claude Code commands

Procedures for Claude Code live as single files in `.claude/commands/<name>.md`. Each file becomes a slash command named after the filename, so the frontmatter does not include a `name` field.

This index is deliberately compact: it explains the purpose of each command and the normalization rules that apply across the repo.

| Command | Use when | Changes files? |
|---|---|---|
| `/controlled-work` | A task needs a plan and explicit verification scope before implementation | Yes, after approval |
| `/medusa-feature` | Implementing a Medusa v2 feature within the repo's architecture | Yes, after approval |
| `/architecture-review` | Making an architectural decision with trade-offs and recommendation | No |
| `/debug-systematically` | Investigating a bug and fixing the root cause with minimal scope | Yes, after approval |
| `/review-changes` | Reviewing uncommitted changes or a branch diff | No |
| `/pre-deploy-review` | Checking deployment readiness without deploying | No |
| `/safe-commit` | Creating a commit only after files and message are approved | Creates a commit |
| `/pixel-perfect` | Implementing a frontend view from a mockup or reference | Yes, after approval |
| `/accessibility-review` | Reviewing frontend accessibility (WCAG-focused) | No |

## When to use a command vs a skill

Use the right primitive for the task type:

- Use a command for procedural or policy-based workflows, such as approval gates, reviews, architecture checks, or multi-step validation flows.
- Use a skill for operational helpers that run concrete actions, such as starting apps, stopping apps, checking environment health, or bootstrapping a local setup.

Examples in this repo:

- `/controlled-work`, `/review-changes`, `/safe-commit` are commands because they define how work should be done and when approval is required.
- `/launch-apps`, `/stop-apps`, and `/check-apps` are skills because they execute concrete developer actions and rely on scripts.

This separation keeps the repo predictable: commands encode process, while skills encode execution.

## Available skills

| Skill | Use when |
|---|---|
| `/launch-apps` | Starting the Medusa backend in this repository |
| `/stop-apps` | Stopping the local Medusa backend process |
| `/check-apps` | Checking the Medusa backend process and HTTP availability |

## Invocation rules

- Run commands explicitly, for example `/review-changes`.
- Most commands include `disable-model-invocation: true`, which reduces accidental firing but does not fully block execution.
- A command takes precedence over the general behavior in `CLAUDE.md` for the duration of that task.
- Repository-specific rules still apply: Medusa architecture, migrations, secrets, and verification scope remain enforced.

## Shared guardrails

- No command runs tests, linters, builds, or migrations without first agreeing on scope with the user.
- Deployment, push, and production operations always require separate approval.
- The commands are authored in English, but responses can still be delivered in the user's language.

## Copilot integration

`.github/copilot-instructions.md` points to this index, so GitHub Copilot follows the same workflow conventions.

## Adding a command

1. Create `.claude/commands/<name>.md` with frontmatter including `description` and usually `disable-model-invocation: true`.
2. Add it to the table above.
3. Ensure the command name, file name, and purpose stay aligned.

## Recommended project behavior

- Keep every task bounded: small, explicit scope, minimal validation, clear reason.
- Prefer project standards over ad-hoc improvisation.
- Use the repo's architecture as the default decision filter.
