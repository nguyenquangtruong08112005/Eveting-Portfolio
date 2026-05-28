# GitHub Copilot Worker

Use GitHub Copilot for low-cost simple work, especially small issue/PR tasks, documentation, simple tests, and repetitive edits.

Local status observed:

- `copilot` standalone command was not installed.
- `gh` is installed.
- `gh copilot` preview is available and can download/run Copilot CLI under:
  `C:\Users\Admin\AppData\Local\GitHub CLI\copilot`

Command examples from local `gh copilot --help`:

```powershell
gh copilot
gh copilot -p "Summarize this week's commits" --allow-tool "shell(git)"
gh copilot -- --help
```

## Copilot Modes To Separate

- Copilot CLI / agent mode: terminal/IDE interactive agent. Useful for local simple tasks.
- Copilot coding agent: asynchronous GitHub issue/PR worker. It runs in a GitHub Actions-backed environment and creates/updates PRs for review.

## Good Tasks

- Documentation updates.
- Rename-only or formatting-only edits.
- Small test additions.
- Simple issue-to-PR tasks.
- Repetitive low-risk code cleanup after manager defines the exact pattern.

## Avoid

- Backend architecture decisions.
- Firebase-to-repository abstraction design.
- Event contract changes.
- Security-sensitive code.
- Anything requiring deep understanding across all three repos.

## Prompt Template

```text
You are a GitHub Copilot worker. This is a low-risk bounded task assigned by a Codex manager.

Task:
<task>

Scope:
- Read: <files/folders>
- Write: <files/folders>

Rules:
1. Do not change architecture.
2. Do not change public API, FCM payload, event type strings, ticket statuses, or mobile DTO contracts.
3. Do not edit outside the write scope.
4. Keep the diff small.
5. If using GitHub PR flow, create a PR and ask for review; do not merge.
6. Return changed files, tests run, and remaining risks.
```

## References Checked

- GitHub Copilot coding agent docs: https://docs.github.com/en/copilot/using-github-copilot/coding-agent/about-assigning-tasks-to-copilot
- GitHub Copilot CLI docs: https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli
- GitHub Copilot CLI command reference: https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference

