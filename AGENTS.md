# Agent instructions

## Language

All communication with the user must be in **Russian** (questions, summaries, progress updates, and final answers). Keep code, identifiers, file paths, CLI commands, and the contents of `docs/agents/*.md` skill-config files in English unless the user asks otherwise.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default triage vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.
