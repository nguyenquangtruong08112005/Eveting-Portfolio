# Project Knowledge Index — AuraEvents

> **Last Updated:** 2026-07-17  
> **Purpose:** Single entry for humans and AI agents.

---

## Current priority (read this first)

### Portfolio V1 — shipping now

| Doc | Role |
|---|---|
| **[project/PORTFOLIO_V1_SCOPE.md](project/PORTFOLIO_V1_SCOPE.md)** | **What we implement now** (in/out, DoD) |
| [../execution/active/agent-debt-remediation.md](../execution/active/agent-debt-remediation.md) | Active engineering backlog |
| [reviews/project-docs-enterprise-audit-2026Q2.md](reviews/project-docs-enterprise-audit-2026Q2.md) | Enterprise docs audit (reference) |
| `../../web-2025-eventing/DESIGN.md` | Web design system v2 |
| `../../START_HERE.md` | Monorepo orientation |

**Rule:** For code and sprints, **PORTFOLIO_V1_SCOPE beats** the full enterprise design corpus below.

---

## Enterprise design corpus (FROZEN — future product)

Full marketplace design (settlement, multi-role RBAC, waitlist, etc.) is **frozen**. Do not expand implementation to match every rule until Portfolio V1 is shipped.

| # | Deliverable | Status | File |
|---|---|---|---|
| 0 | Project Charter | Frozen | [00-project-charter.md](project/00-project-charter.md) |
| 1 | Business Glossary | Frozen | [01-business-glossary.md](project/01-business-glossary.md) |
| 2 | Business Rules Specification | Frozen | [02-business-rules-specification.md](project/02-business-rules-specification.md) |
| 3 | Traceability Matrix | Frozen | [03-business-rule-traceability-matrix.md](project/03-business-rule-traceability-matrix.md) |
| 4 | Business Capabilities | Frozen | [04-business-capabilities.md](project/04-business-capabilities.md) |
| 5 | Business Processes | Frozen | [05-business-processes.md](project/05-business-processes.md) |
| 6 | State Machines | Frozen | [06-state-machines.md](project/06-state-machines.md) |
| 7 | Domain Discovery | Frozen | [07-domain-discovery.md](project/07-domain-discovery.md) |
| 8 | Domain Complexity Matrix | Frozen | [08-domain-complexity-matrix.md](project/08-domain-complexity-matrix.md) |
| 9 | Bounded Context Map | Draft frozen | [09-bounded-context-map.md](project/09-bounded-context-map.md) |
| 10 | Context Boundary Review | Draft frozen | [10-context-boundary-review.md](project/10-context-boundary-review.md) |
| 11 | Aggregate Catalog | Draft frozen | [11-aggregate-catalog.md](project/11-aggregate-catalog.md) |
| — | **Portfolio V1 Scope** | **Active** | [PORTFOLIO_V1_SCOPE.md](project/PORTFOLIO_V1_SCOPE.md) |

---

## Execution

| Path | Use |
|---|---|
| `execution/active/` | Current remediation backlog |
| `execution/db-audit/` | DB P0 guide (FKs, migrate safety) — **active reference** |
| `execution/code-review/` | Historical code audit snapshot |
| `execution/business-redesign/` | Remaining scope notes only |
| `archive/execution-history/` | firebase-exit + phase-p1 diaries |
| `archive/orchestration/` | Multi-agent prompts (**inactive** — single agent only) |

---

## Working rules

1. **Single agent.** No multi-worker orchestration.  
2. **Portfolio V1 first.** Enterprise docs are design archive.  
3. **Postgres + FKs.** No dual repository for the same aggregate.  
4. **One module per change.** No drive-by feature piles.  
5. **Ubiquitous language** from glossary when implementing domain terms.

---

## Onboarding (agent)

1. Read this INDEX.  
2. Read [PORTFOLIO_V1_SCOPE.md](project/PORTFOLIO_V1_SCOPE.md).  
3. Read [agent-debt-remediation.md](../execution/active/agent-debt-remediation.md).  
4. For domain depth later: glossary → rules → processes → state machines.  
5. For DB work: `execution/db-audit/01-executive-summary.md` + `10-fix-plan.md` (P0 only).

---

> End of Index
