# Antigravity Worker

Use Antigravity only with an explicit workspace directory.

CodeGraph is installed globally, but the installer does not register agy automatically. Tell agy to run these from the target repo before broad source search:

```powershell
cmd /c codegraph status .
cmd /c codegraph query "<symbol-or-feature>" --limit 10
cmd /c codegraph callers "<symbol>"
cmd /c codegraph callees "<symbol>"
cmd /c codegraph impact "<path-or-symbol>"
```

After code edits in that repo:

```powershell
cmd /c codegraph sync .
```

Local command shape:

```powershell
& "$env:LOCALAPPDATA\agy\bin\agy.exe" --add-dir "C:\path\to\repo" --print "PROMPT" --print-timeout 5m
```

Important:

- `agy.exe` may not be on PATH visible to Codex.
- Without `--add-dir`, it can write to `C:\Users\Admin\.gemini\antigravity-cli\scratch`.
- It can return empty stdout even after doing work. Verify files and logs.

## Good Tasks

- Small file edits.
- Simple mechanical extraction.
- Read-only notes about a narrow module.

## Avoid

- Any task where empty stdout would make verification hard.
- Broad refactors across the three eventing repos.
- Tasks requiring subtle architecture tradeoffs.

## Prompt Template

```text
You are an Antigravity worker. Work only inside this workspace:
<absolute repo path>

Task:
<task>

Scope:
- Read: <files/folders>
- Write: <files/folders or "none">

Rules:
1. Do not write to scratch unless explicitly asked.
2. Do not edit outside the workspace or write scope.
3. Preserve existing user changes.
4. Keep external contracts unchanged unless explicitly approved.
5. Use CodeGraph first for symbol/context lookup before broad grep.
6. Run `codegraph sync .` after code edits.
7. End with a STOP SUMMARY.
```
