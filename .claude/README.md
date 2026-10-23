# Claude Code commands

Procedures for Claude Code live as single files in
`.claude/commands/<name>.md`; each one creates the command `/<name>`. The
name comes from the file name, so the frontmatter has no `name` field. This
README sits outside `commands/` because every `.md` file there becomes a
command.

| Command | When to use it | Changes files? |
|---|---|---|
| `/controlled-work` | A programming task with the plan and verification scope agreed before implementation | yes, after approval |
| `/medusa-feature` | Designing and implementing a Medusa v2 feature in line with the project architecture | yes, after approval |
| `/architecture-review` | An architectural decision: options, trade-offs, recommendation | no |
| `/debug-systematically` | Diagnosing a bug and a minimal fix of its root cause | yes, after approval |
| `/review-changes` | Code review of changes, uncommitted ones by default | no |
| `/pre-deploy-review` | Deployment readiness review, without deploying | no |
| `/safe-commit` | A commit after the list of files and the message are approved | creates a commit |
| `/pixel-perfect` | A frontend view based on a Figma mockup | yes, after approval |
| `/accessibility-review` | Frontend accessibility review (WCAG) | no |

## Invocation

- Run the commands explicitly, e.g. `/review-changes`. All except
  `controlled-work` have `disable-model-invocation: true`, so Claude will
  not invoke them on its own. The documentation does not say clearly
  whether Claude can invoke a file from `commands/` by itself the way it
  invokes a skill folder; do not count on it for `controlled-work`.
- An invoked command takes precedence over the General Behavior section of
  `CLAUDE.md` for the duration of that task. The other `CLAUDE.md` rules
  (Medusa architecture, migrations, secrets) still apply.

`disable-model-invocation` limits automatic invocation, but it does not
technically block any command. Risky operations should still be guarded by
permissions or hooks.

## Shared rules

- No command runs tests, linters, builds or migrations without agreeing on
  the scope with the user.
- Push, deploy and production operations always need separate approval
  (`CLAUDE.md`, `safe-commit`, `pre-deploy-review`).
- The commands are written in English; Claude still answers in the user's
  language.

## Copilot

`.github/copilot-instructions.md` links to this index, so GitHub Copilot
follows the same procedures.

## Adding a command

1. Create `.claude/commands/<name>.md` with frontmatter: `description` and
   usually `disable-model-invocation: true`.
2. Add the command to the table above.
