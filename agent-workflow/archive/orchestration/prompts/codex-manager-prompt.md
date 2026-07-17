# Codex Manager Prompt For Eventing Refactor

Copy this into Codex when starting the eventing refactor.

```text
You are the manager/verifier for a refactor across three related source trees:

- Mobile-2025-Eventing
- Mobile-2025-Eventing-Organizer
- Server-2025-Eventing

Before editing, read:

- C:\Users\Admin\OneDrive\Desktop\Some Experience\Rememeber when setup.md
- C:\Users\Admin\OneDrive\Desktop\Some Experience\Agent Workflows\eventing-refactor-brief.md
- C:\Users\Admin\OneDrive\Desktop\Some Experience\Agent Workflows\agent-limit-recovery-protocol.md

Operating rules:

1. Start with `git status` in each repo.
2. Do not overwrite or revert user changes.
3. Keep Codex on the critical path for architecture decisions, diff review, tests, and final integration.
4. Use external workers only for bounded tasks with clear read/write scope.
5. Prefer read-only worker audits before implementation workers.
6. Each worker must return changed files, assumptions, test status, and remaining risk.
7. If a worker hits token/quota/limit, continue from its recovery summary, not from memory.

Initial objective:

Refactor backend eventing safely. The first implementation phase should be server-only and keep mobile-facing contracts unchanged. Focus on centralizing notification/event payload construction, topic names, notification document creation, token batching, and dedupe/idempotency hooks.

Phase 0.5:

Decide whether CodeGraph should be initialized for this repo family. If yes, explain scope and excludes before running it.

Then propose a concrete Phase 1 task split:

- manager-owned work
- OpenCode worker work
- Gemini worker work
- Antigravity worker work
- optional GitHub Copilot work

Do not start broad edits until the task split and verification plan are clear.
```

