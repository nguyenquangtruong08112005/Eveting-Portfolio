# Enterprise Knowledge Base (Single Source of Truth)

Welcome to the **agent-workflow** Enterprise Knowledge Base. This directory serves as the centralized repository for long-lived, authoritative documentation and execution records for the Eventing Platform.

## 1. Directory Layout

The workspace is organized into three major functional areas:

*   **`knowledge/`**: The **Single Source of Truth** for the project. It only contains approved, stable, and long-lived documents.
*   **`execution/`**: The historical record of project execution, including phase roadmaps, audits, migrations, and run logs.
*   **`archive/`**: Obsolete material (including multi-agent orchestration, frozen 2026-07-11).

> **Note:** Multi-agent `orchestration/` was moved to `archive/orchestration/`. Active development uses a **single agent**. Do not run multi-worker protocols.

Below is the detailed directory tree:

```text
agent-workflow/
├── knowledge/              # Approved long-lived knowledge base
│   ├── README.md           # This file (Human entry point)
│   ├── INDEX.md            # AI Agent Entry Point (Onboarding index)
│   ├── project/            # Product scope, charter, glossary, rules
│   ├── decisions/          # Architectural decisions & trackers
│   │   ├── adr/            # Approved ADRs (ADR-xxx format)
│   │   └── open-questions/ # Open questions & briefs
│   ├── diagrams/           # Visual system maps & flowcharts
│   └── reviews/            # Permanent high-level reviews & audits
│
├── execution/              # Execution records & historical context
│   ├── business-redesign/  # Business scope & phase runs
│   ├── db-audit/           # Database audit details
│   ├── code-review/        # Q2 2025 code reviews
│   ├── firebase-exit/      # Firebase exit migration history
│   └── db-refactor/        # DB refactoring briefs
│
├── templates/              # Blank templates for new records
└── archive/
    └── orchestration/      # Archived multi-agent prompts (inactive)
```

## 2. Documentation Conventions

To maintain a clean and searchable knowledge base, please adhere to these conventions:

*   **Approved vs. Execution**: Do not place temporary planning documents, phase documents, execution logs, or migration plans in the `knowledge/` directory. Place them under `execution/<phase-name>/`.
*   **ADR Standard**: Only files that represent finalized, approved architectural decisions should be placed in `knowledge/decisions/adr/`. They must be formatted using the standard Lightweight Architecture Decision Record template (`ADR-xxx.md`).
*   **Open Questions**: Track unresolved design questions in a dedicated markdown file under `knowledge/decisions/open-questions/` before they are finalized and converted into ADRs.
*   **Agnostic Shell Snippets**: Ensure all documentation and scripts default to `cmd.exe`-compatible syntax. Wrap commands containing special characters like `&` in double quotes.

## 3. Contribution Guidelines

1.  **Read the Index**: Before modifying or creating any file, consult [INDEX.md](file:///d:/01_university/year3/semester-5/mobile/final/agent-workflow/knowledge/INDEX.md) to understand current project priorities.
2.  **Updating Knowledge**: When a business process or rule changes, update the corresponding document under `knowledge/project/` or create a new ADR. Do not edit historical logs under `execution/` to reflect new rules; keep execution files as historical records of what occurred in that phase.
3.  **Cross-linking**: Use relative links for files inside the workspace to keep navigation seamless for both human readers and AI agents.
