# Enterprise Code Audit Agent — System Prompt & Methodology

> **Mục đích:** Thiết kế multi-agent architecture để thực hiện Enterprise Code Audit trên codebase lớn (100k–10M LOC)  
> **Ưu điểm:** Graph-based exploration → giảm token mạnh, tập trung hotspot, tìm được phần lớn bug & vấn đề kiến trúc

---

## 1. KIẾN TRÚC TỔNG THỂ (Multi-Agent)

```
Root Agent (Orchestrator)
├── Architecture Agent
├── Bug Hunter Agent
├── Security Agent
├── Performance Agent
├── Code Smell Agent
├── Enterprise Standards Agent
├── Dependency Agent
└── Report Generator Agent
```

**Concurrency:** 7 specialist agents chạy **parallel** sau Phase 1.  
**Aggregation:** Root Agent thu thập output từ tất cả agents, resolve conflicts, tổng hợp thành báo cáo cuối.

---

## 2. CÔNG CỤ & KỸ THUẬT

| Công cụ | Mục đích |
|---------|----------|
| CodeGraph | Symbol graph, dependency graph, call graph |
| Tree-sitter | AST navigation, parse tree queries |
| AST Index | Structural code search |
| Symbol Index | Tìm symbol nhanh, trace references |
| Ripgrep | Pattern search trên codebase |
| Semgrep | SAST rules, custom pattern matching |
| CodeQL | Query-based vulnerability analysis |
| Dependency Graph | Module coupling, circular dependency |
| Git diff | Incremental audit — chỉ scan files thay đổi |

**Nguyên tắc:** Luôn ưu tiên graph queries thay vì đọc file toàn bộ.

---

## 3. ROOT AGENT FLOW

### PHASE 1 — Repository Discovery

1. Analyze repository tree
2. Detect languages
3. Detect frameworks
4. Detect services / modules
5. Build dependency graph
6. Build symbol graph
7. Build bounded context map (module → domain boundary)
8. Classify data sensitivity (PII, payment, public) trên mỗi endpoint

**Deliverables:**
- Architecture summary
- Bounded context map
- Data sensitivity map
- Risk map (sơ bộ)

### PHASE 2 — Spawn Specialist Agents (Parallel)

7 agents chạy đồng thời, mỗi agent độc lập investigate trên cùng codebase graph.

| Agent | Đầu vào | Đầu ra |
|-------|---------|--------|
| Architecture | dependency graph, context map | coupling report, cycle report |
| Bug Hunter | call graph, control flow | bug list (null, race, leak...) |
| Security | data sensitivity map, API list | vulnerability list |
| Performance | hot path trace, DB schema | N+1 report, bottleneck list |
| Code Smell | symbol index, LOC stats | god class, long method list |
| Enterprise Standards | module structure | SOLID/DDD violation list |
| Dependency | package.json, lock files | outdated/vuln deps list |

### PHASE 3 — Root Agent Review & Consolidate

Root Agent thực hiện **feedback loop**:

1. Thu thập output từ 7 agents
2. Phát hiện conflicts (vd: Bug Hunter báo lỗi ở module X, Architecture Agent báo module X sắp bị deprecated)
3. Resolve conflicts bằng evidence từ graph
4. Deduplicate findings trùng nhau giữa các agents
5. Gửi Report Generator Agent để tổng hợp báo cáo cuối

---

## 4. SPECIALIST AGENTS

### Architecture Agent

**Review:**
- Layering
- Boundaries
- Module coupling
- Circular dependencies
- Package organization
- Bounded context violations (so với context map từ Phase 1)

**Detect:**
- God modules
- Improper dependency directions
- Bounded context violations
- Missing domain boundaries

### Bug Hunter Agent

**Search for:**
- Null dereference
- Race conditions
- Transaction issues
- Missing validations
- Dead code
- Unreachable branches
- Resource leaks
- Missing rollback / compensating transactions

**Use:** call graph, control flow graph, data flow analysis

### Security Agent

**Input:** data sensitivity map từ Phase 1, danh sách API endpoints

**Search for:**
- SQL injection
- XSS, CSRF, SSRF
- Insecure deserialization
- Hardcoded secrets
- Privilege escalation
- Auth bypass
- Missing encryption (PII / payment data)
- Excessive data exposure (leak sensitive fields)

**Prioritize:** internet-facing endpoints + PII/payment endpoints

### Performance Agent

**Search for:**
- N+1 queries
- Unnecessary allocations
- Sync IO
- Excessive locking
- Expensive loops
- Repeated computations
- Cache misses
- Missing batch operations

**Analyze:** hot execution paths, DB query patterns

### Code Smell Agent

**Search for:**
- God classes (> 500 LOC)
- Long methods (> 100 LOC)
- Deep nesting (> 4 levels)
- Duplicate logic
- Primitive obsession
- Feature envy
- Shotgun surgery
- Magic numbers / strings
- Excessive parameters (> 5)

**Rank by impact**

### Enterprise Standards Agent

**Evaluate:**
- SOLID
- Clean Architecture
- DDD
- Hexagonal Architecture
- CQRS
- Event-Driven
- Error handling / Logging / Monitoring
- Testing strategy (unit, integration, e2e coverage)

### Dependency Agent

**Analyze:**
- Outdated libraries (major version lag)
- Vulnerable packages (CVE check)
- Unused dependencies
- Duplicate libraries (multiple versions)
- License risks (GPL, AGPL in commercial product)
- Bundle size impact

---

## 5. CODEGRAPH STRATEGY

**Thay vì** `Read entire src/` → Agent phải làm:

```text
1. Build codegraph

2. Query hot zones:

   - Top referenced symbols
   - Largest modules
   - Highest fan-in nodes
   - Highest fan-out nodes
   - Cyclic dependencies
   - Entry points
   - Database access layer
   - API layer
   - Service layer
   - Domain layer
```

**Ví dụ queries:**
- Top 50 symbols by reference count
- Modules with fan-out > 20
- Modules with fan-in > 50
- Circular dependency groups
- Methods > 150 LOC
- Classes > 1000 LOC

> Những điểm này thường chứa 80% bug.

---

## 6. TOKEN OPTIMIZATION PROMPT

```text
Before opening files: Use repository graph.

For each suspected issue:
1. Locate symbol
2. Trace references
3. Open only relevant files
4. Open only relevant functions

Never read unrelated files.

Prefer: symbol search, dependency graph, call graph over file reads.
```

---

## 7. INVESTIGATION FLOW

Cho mỗi module:

```text
1. Build summary
2. Risk score
3. Find hotspots
4. Investigate hotspots
5. Produce findings
6. Move to next module
```

**Risk score = W1 × complexity + W2 × change frequency + W3 × dependency count + W4 × critical business impact + W5 × dataSensitivity**

| Factor | Weight (W) | Ghi chú |
|--------|-----------|---------|
| Complexity | 0.25 | Cyclomatic complexity score |
| Change frequency | 0.20 | Git commit count / tháng |
| Dependency count | 0.15 | Fan-out count |
| Business impact | 0.25 | Critical path = 10, support = 1 |
| Data sensitivity | 0.15 | PII/payment = 10, internal = 5, public = 1 |

> Score > 35 = High Risk → ưu tiên audit trước

---

## 8. SEVERITY LEVELS

- 🔴 **Critical**
- 🟡 **High**
- 🟢 **Medium**
- 🔵 **Low**

Mỗi finding phải có:
- category
- severity
- impacted modules
- root cause
- evidence (exact code locations)
- recommended fix
- estimated implementation effort
- data sensitivity flag (PII / payment / none)

---

## 9. TERMINATION CRITERIA (Definition of Done)

Audit được coi là hoàn thành khi:

| Tiêu chí | Threshold |
|----------|-----------|
| Modules scanned | ≥ 90% modules có risk score |
| High-risk modules | 100% high-risk modules (score > 35) đã được investigate |
| Critical findings | 0 critical finding chưa có evidence + fix recommendation |
| Hotspots covered | 100% nodes trong top 20 fan-in / fan-out đã được phân tích |
| Dependency scan | 100% dependencies đã check outdated + vulnerability |
| Report generated | Full report theo format section 11 |

---

## 10. INCREMENTAL AUDIT (Re-audit)

Cho lần audit thứ 2+:

```text
1. git diff HEAD~N --name-only  →  files changed
2. Chỉ build graph trên files changed + dependencies của chúng
3. Risk score chỉ tính lại cho modules bị ảnh hưởng
4. Các findings cũ không thay đổi → giữ nguyên, không re-scan
5. Đánh dấu findings đã fix nếu file changed đã xử lý
```

→ Tiết kiệm ~70% token so với full audit.

---

## 11. REPORT FORMAT

```markdown
# Executive Summary

Overall Risk: HIGH

Critical Findings: 3
High Findings: 12
Medium Findings: 21
Low Findings: 35

Audit Coverage: 92% modules scanned
Incremental: No (full audit)

---

# Architecture Findings

## A-001
Severity: High
Issue: Circular dependency between OrderService and PaymentService
Evidence: ...
Data Sensitivity: PII
Recommendation: ...
Effort: 3 days

---

# Security Findings

## S-001
Severity: Critical
Issue: SQL injection vulnerability
Location: ...
Evidence: ...
Data Sensitivity: Payment
Fix: Parameterized query
Effort: 0.5 day

---

# Bug Findings

## B-001
...

# Performance Findings

## P-001
...

# Code Smell Findings

## CS-001
...

# Enterprise Standards Findings

## ES-001
...

# Dependency Findings

## D-001
...
```

---

## 12. REPORT GENERATOR AGENT

**Input:** Raw findings từ 7 agents (có thể có conflicts, duplicates)

**Responsibilities:**
1. Deduplicate findings trùng category + location
2. Resolve conflicts (ưu tiên agent có evidence cụ thể hơn)
3. Sắp xếp findings theo severity (Critical → Low)
4. Ước lượng effort cho mỗi finding (dựa trên complexity pattern)
5. Gom nhóm findings theo module → dễ triển khai fix
6. Tạo **remediation roadmap** — thứ tự ưu tiên:
   - Priority 1: Critical security + data loss bugs
   - Priority 2: Critical performance + availability
   - Priority 3: High severity issues
   - Priority 4: Medium/Low + code smells
7. Xuất file markdown theo format section 11

**Prompt:**

```text
You are the Report Generator Agent.

You have received raw findings from 7 specialist agents.

Your job:
1. Deduplicate - nếu 2 agents cùng báo lỗi ở 1 location, chỉ giữ 1 finding với evidence gộp
2. Resolve conflicts - nếu 2 agents đánh giá trái ngược, ưu tiên agent có:
   - Exact code citation > general description
   - Call graph evidence > speculation
   - Reproducible steps > theory
3. Sort: Critical → High → Medium → Low
4. Estimate effort: dùng historical pattern
   - Add param = 0.5 day
   - Refactor method = 1-2 days
   - Refactor module = 3-5 days
   - Architecture redesign = 5-10 days
5. Group by module
6. Build remediation roadmap
7. Output markdown
```

---

## 13. PROMPT MẪU — Dùng cho Claude Code / Codex

```text
Conduct a full enterprise-grade repository audit.

Use a multi-agent approach.

First build:
- repository graph
- dependency graph
- symbol graph
- architecture map
- bounded context map
- data sensitivity map

DO NOT read the repository file-by-file.

Use graph-based exploration first.

Then spawn these 7 agents IN PARALLEL:
1. Architecture Agent
2. Bug Hunter Agent
3. Security Agent
4. Performance Agent
5. Code Smell Agent
6. Enterprise Standards Agent
7. Dependency Agent

Each agent should:
- investigate independently (parallel)
- provide evidence
- cite exact code locations
- assign severity
- flag data sensitivity (PII / payment / public)

After all agents complete:
- Root Agent reviews and consolidates (dedup, resolve conflicts)
- Report Generator Agent produces final report

Focus investigation on hotspots discovered through graph analysis (fan-in, fan-out, LOC).

Use the risk score formula:
risk = 0.25*complexity + 0.20*changeFreq + 0.15*depCount + 0.25*businessImpact + 0.15*dataSensitivity

Score > 35 = high risk, must investigate.

Termination criteria:
- 90%+ modules scanned
- 100% high-risk modules investigated
- All critical findings have evidence + fix
- All top 20 fan-in/fan-out nodes analyzed

Generate:
1. Executive Summary (with audit coverage %)
2. Architecture Review
3. Security Review
4. Performance Review
5. Code Smell Review
6. Enterprise Standards Review
7. Dependency Review
8. Prioritized Remediation Roadmap (4 priority tiers)

Continue until termination criteria met.
```

---

> **Kết luận:** Đối với monorepo lớn (100k–10M LOC), phương pháp multi-agent + graph-based exploration + parallel execution hiệu quả hơn đọc file tuần tự vì tập trung vào hotspot, giảm token rất mạnh nhưng vẫn tìm được phần lớn bug và vấn đề kiến trúc.
> 
> Với incremental audit (lần 2+), tiết kiệm ~70% token so với full audit nhờ git diff + chỉ scan changed files.
