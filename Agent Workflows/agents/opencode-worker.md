# OpenCode Worker

Use OpenCode for cheap bounded implementation or read-only exploration.

Local command shape:

```powershell
cmd /c opencode run "PROMPT"
```

OpenCode default model was set to:

```text
opencode/deepseek-v4-flash-free
```

Useful explicit model commands:

```powershell
cmd /c opencode run -m opencode/deepseek-v4-flash-free "PROMPT"
cmd /c opencode run -m opencode/nemotron-3-super-free "PROMPT"
```

## Good Tasks

- Extract a small pure helper.
- Add or update focused tests.
- Audit one file or module.
- Compare duplicated logic across a few files.
- Generate a small markdown contract table.

## Avoid

- Architecture decisions.
- Cross-repo edits.
- Broad refactors.
- Security-sensitive changes without manager review.

## Prompt Template

```text
You are an OpenCode worker. You are not alone in the codebase.

Task:
<task>

Scope:
- Read: <files/folders>
- Write: <files/folders or "none">

Rules:
1. Do not revert or overwrite existing user changes.
2. Do not edit outside the write scope.
3. Keep public API/mobile-facing contracts unchanged unless explicitly asked.
4. Prefer small, reviewable changes.
5. Before stopping, return the STOP SUMMARY from:
   C:\Users\Admin\OneDrive\Desktop\Some Experience\Agent Workflows\agent-limit-recovery-protocol.md

Verification:
- Run: <command or "do not run">
```

