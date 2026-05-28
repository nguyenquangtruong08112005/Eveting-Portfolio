# Agent Workflows

This folder stores reusable prompts and operating notes for a "Codex manager + external workers + verifier" workflow.

Use this folder when entering a new project, planning a refactor, or delegating work to local/hosted coding agents.

## Recommended Order

1. Read `../Rememeber when setup.md`.
2. Run a read-only Phase 0 audit.
3. If the task is cross-module or cross-repo, create an event/contract/dependency map before editing.
4. Decide whether to use external workers.
5. Give each worker a bounded task with a clear write scope.
6. Codex remains responsible for diff review, tests, integration, and final explanation.

## Files

- `eventing-refactor-brief.md`: current eventing refactor goals and risks.
- `codex-manager-prompt.md`: first prompt to give Codex before starting the refactor.
- `agent-limit-recovery-protocol.md`: what every worker must return before token/quota exhaustion.
- `agents/opencode-worker.md`: prompt template for OpenCode.
- `agents/gemini-worker.md`: prompt template for Gemini CLI.
- `agents/antigravity-worker.md`: prompt template for Antigravity CLI.
- `agents/github-copilot-worker.md`: prompt template and constraints for GitHub Copilot.

