# Agent Workflows

This folder stores reusable prompts and operating notes for a "Codex manager + external workers + verifier" workflow.

Use this folder when entering a new project, planning a refactor, or delegating work to local/hosted coding agents.

## Recommended Order

0. Read `ORCHESTRATION_INIT.md` after context compaction or before delegating work.
1. Read `../Rememeber when setup.md`.
2. Run a read-only Phase 0 audit.
3. If the task is cross-module or cross-repo, create an event/contract/dependency map before editing.
4. Decide whether to use external workers.
5. Give each worker a bounded task with a clear write scope.
6. Codex remains responsible for diff review, tests, integration, and final explanation.

## Shell Convention

Use `cmd.exe`-compatible commands by default.

- Prefer `cmd /c "..."` for local agent commands and verification commands.
- Avoid PowerShell-only syntax in prompts, docs, and reusable command snippets unless a task specifically requires PowerShell.
- When a command needs `&`, wrap the whole command after `cmd /c` in quotes.
- Do not use PowerShell examples for worker prompts if a `cmd` equivalent is available.

## Files

- `ORCHESTRATION_INIT.md`: compact-resume orchestration protocol for manager + six-worker pool + handoff reports.
- `eventing-refactor-brief.md`: current eventing refactor goals and risks.
- `codex-manager-prompt.md`: first prompt to give Codex before starting the refactor.
- `agent-limit-recovery-protocol.md`: what every worker must return before token/quota exhaustion.
- `agents/opencode-worker.md`: prompt template for OpenCode.
- `agents/gemini-worker.md`: prompt template for Gemini CLI.
- `agents/antigravity-worker.md`: prompt template for Antigravity CLI.
- `agents/github-copilot-worker.md`: prompt template and constraints for GitHub Copilot.
