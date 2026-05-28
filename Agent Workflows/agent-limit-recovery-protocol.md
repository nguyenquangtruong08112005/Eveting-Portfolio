# Agent Limit Recovery Protocol

Every external worker must be instructed to return this summary before stopping, and especially when it is near token/quota/context limits.

## Required Stop Summary

```text
STOP SUMMARY

Task:
- <one sentence>

Repo and branch:
- <repo path>
- <branch>

Files read:
- <file>

Files changed:
- <file or none>

Current status:
- done | partial | blocked

What changed:
- <short bullets>

Verification run:
- <command and result, or "not run" with reason>

Known risks:
- <risk>

Next exact step:
- <the next command or file to inspect/edit>

Do not repeat work:
- <important context the next agent must preserve>
```

## Manager Rule

Codex must not trust a worker's final text alone. It should verify by checking:

- `git diff`
- changed file paths
- relevant test/build commands
- runtime contract compatibility
- whether user changes were preserved

## When A Worker Hits Limit

1. Save its stop summary in the manager notes or task thread.
2. Start a fresh worker with only the needed files/scope plus the stop summary.
3. Do not ask the new worker to re-audit the whole repo unless the previous summary is unusable.
4. Keep each continuation smaller than the previous task.

