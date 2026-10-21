# CLAUDE.md

Project instructions are shared with every agent in [AGENTS.md](AGENTS.md). The import below
keeps one source of truth: edit `AGENTS.md`, not this file.

@AGENTS.md

## Agent skills

### Issue tracker

Issues live as GitHub issues on this repo. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles mapped 1:1 to label strings (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (root `CONTEXT.md` + `docs/adr/`, created lazily when terms or decisions resolve). See `docs/agents/domain.md`.
