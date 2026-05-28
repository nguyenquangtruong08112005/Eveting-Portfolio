# Eventing Refactor Start Here

This folder contains three related source trees:

- `Mobile-2025-Eventing`
- `Mobile-2025-Eventing-Organizer`
- `Server-2025-Eventing`

Before refactoring, read:

1. `Agent Workflows/README.md`
2. `Agent Workflows/eventing-refactor-brief.md`
3. `Agent Workflows/codex-manager-prompt.md`
4. `Agent Workflows/agent-limit-recovery-protocol.md`

## First Prompt To Use

Copy the content from:

```text
Agent Workflows/codex-manager-prompt.md
```

That prompt tells Codex to:

- inspect all three repos first;
- preserve existing dirty working-tree changes;
- keep Codex as manager/verifier;
- use OpenCode, Gemini, Antigravity, and optional GitHub Copilot only for bounded tasks;
- decide whether CodeGraph is needed before broad refactor;
- start with a server-only Phase 1 that keeps mobile contracts unchanged.

## Local Worker Commands

OpenCode:

```powershell
cmd /c opencode run -m opencode/deepseek-v4-flash-free "PROMPT"
```

Gemini CLI:

```powershell
cmd /c gemini -p "PROMPT" --output-format text
```

Antigravity:

```powershell
& "$env:LOCALAPPDATA\agy\bin\agy.exe" --add-dir "D:\01_university\year3\semester-5\mobile\final" --print "PROMPT" --print-timeout 5m
```

GitHub Copilot CLI preview:

```powershell
gh copilot -p "PROMPT"
```

## Refactor Rule

Do not start by changing Android DTOs or mobile-facing contracts. Stabilize backend event/notification helpers first, then verify the payloads still match current mobile expectations.

