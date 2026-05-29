# Orchestration Init

Read this file after context compaction before starting or resuming any multi-step task.

## Operating Model

Codex is the manager/verifier. It should not be the default implementer when local agents are available and usable.

Use `staging` as the development base branch. Do not merge to `main`; the user will merge to `main` manually after the system runs correctly.

Use an orchestrator-worker pattern:

1. Manager defines scope, branch/workspace, forbidden changes, verification gates, and report format.
2. Workers operate in isolated branches or clones.
3. Workers return short reports, not long narratives.
4. Manager verifies by reading git diff, changed files, commands, and compatibility risks.
5. Manager records the final status in a run artifact so future compacted sessions can resume without re-auditing.

This is adapted from:

- OpenAI Agents SDK: agents can use tools and handoffs; handoff transfers task control to specialized agents with controlled input.
- OpenAI orchestration guidance: use manager-style routing for complex workflows, and keep agent responsibilities explicit.
- Anthropic Claude Code subagents: use specialized subagents to preserve main-context budget; each subagent works independently and returns results.
- Anthropic multi-agent research architecture: use a lead orchestrator with parallel specialist workers, then synthesize and verify.

## Default Six-Worker Pool

Do not start all six workers automatically. Use only the workers needed for the task. Prefer one or two workers for small changes.

1. `scope-contract-auditor`
   - Read-only.
   - Finds API/event/schema/env/topic/queue contracts and forbidden behavior changes.

2. `architecture-planner`
   - Read-only unless asked otherwise.
   - Proposes module boundaries, provider ports, migration order, and rollback points.

3. `implementation-worker-a`
   - Writes code in a narrow module scope.
   - One branch/clone only.

4. `implementation-worker-b`
   - Writes a separate non-overlapping code slice.
   - Use only when the split avoids file conflicts.

5. `verification-worker`
   - Runs allowed checks and reviews payload/backward compatibility.
   - Should not rewrite implementation unless explicitly scoped.

6. `integration-scribe`
   - Produces merge notes, deployment order, risk list, and next-step artifact.
   - Can be manager-owned if no external agent is needed.

## Handoff Packet

Every worker prompt must include:

```text
Role:
- <worker role>

Workspace:
- <absolute repo or clone path>
- <branch>

Task:
- <one bounded objective>

Allowed files/modules:
- <paths>

Forbidden:
- Do not touch unrelated repos.
- Do not change public API/mobile contracts unless explicitly approved.
- Do not edit package/dependency files unless explicitly approved.
- Do not run build/test commands that create heavy artifacts unless explicitly approved.

Commands:
- Use cmd-compatible commands.
- Prefer git, dir, type, findstr, node --check.
- Do not use grep on Windows.

Required output:
- changed files
- summary
- verification commands/results
- compatibility notes
- risks
- next exact step
```

## Worker Stop Summary

Each worker must return:

```text
STOP SUMMARY

Task:
- <one sentence>

Repo and branch:
- <path>
- <branch>

Files read:
- <files>

Files changed:
- <files or none>

Current status:
- done | partial | blocked

What changed:
- <short bullets>

Verification run:
- <command and result, or not run with reason>

Known risks:
- <risks>

Next exact step:
- <command or file>

Do not repeat work:
- <context to preserve>
```

## Artifact Layout

For each major task, create or update:

```text
Agent Workflows/runs/<task-slug>/MANAGER_STATE.md
Agent Workflows/runs/<task-slug>/worker-<role>-report.md
Agent Workflows/runs/<task-slug>/verification.md
```

`MANAGER_STATE.md` is the compact-resume file. Keep it short:

- objective
- current phase
- repos/branches/clones
- worker status
- verified facts
- next command
- blockers

## Current Project Defaults

Project root:

```text
D:\01_university\year3\semester-5\mobile\final
```

Source trees:

```text
Mobile-2025-Eventing
Mobile-2025-Eventing-Organizer
Server-2025-Eventing
```

Current safe implementation scope:

```text
Server-only first.
Do not change mobile-facing contracts.
Firebase exit should be phased through provider boundaries first.
```

Preferred local worker:

```text
agy interactive with Gemini 3.5 Flash (Medium)
```

Worker selection rule:

```text
Use agents that actually run and produce verifiable git diffs.
If an agent produces no result, cannot access the workspace, hits quota/model errors, or repeatedly fails tool calls, skip it and continue with the remaining usable agents.
Do not spend extra quota trying to rescue a failing agent unless the user asks.
```

Avoid unless re-approved:

```text
Gemini CLI
OpenCode
GitHub Copilot while rate-limited
agy print mode for implementation, because it has produced empty stdout and no git diff in this workspace
```

## Manager Verification Gates

Before accepting any worker output:

1. `git status --short --branch`
2. `git diff --stat`
3. `git diff --check`
4. Inspect full `git diff`
5. `node --check` on changed JavaScript files
6. Confirm public payloads, event names, route contracts, and env keys are unchanged unless approved
7. Confirm no unrelated repo/file changes

## Merge Rule

Merge only after manager verification passes.

Prefer cherry-pick or small branch merge per accepted slice. If two workers touch the same file, stop and resolve manually with a manager review instead of stacking unverified changes.
