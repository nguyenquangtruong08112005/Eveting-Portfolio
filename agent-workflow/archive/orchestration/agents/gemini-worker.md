# Gemini CLI Worker

Use Gemini CLI for stronger read-only analysis, contract mapping, and moderate implementation.

Local command shape:

```powershell
cmd /c gemini -p "PROMPT" --output-format text
```

Gemini CLI observed locally:

```text
0.38.0
```

## Good Tasks

- Map event flow across multiple files.
- Compare backend and Android DTO contracts.
- Identify risky deployment order.
- Draft migration/refactor plans.
- Implement a small module after manager approves scope.

## Avoid

- Letting Gemini change many unrelated files.
- Unbounded "clean this project" tasks.
- Blindly trusting generated architecture without repo verification.

## Prompt Template

```text
You are a Gemini CLI worker. You are doing a bounded task for a Codex manager.

Task:
<task>

Scope:
- Read: <files/folders>
- Write: <files/folders or "none">

Rules:
1. Do not edit files unless Write scope is non-empty.
2. Do not change mobile-facing contracts unless explicitly approved.
3. Preserve existing user changes.
4. If you cannot finish, stop and return a STOP SUMMARY.
5. Always list exact files read and changed.

Verification:
- <commands to run or not run>
```

