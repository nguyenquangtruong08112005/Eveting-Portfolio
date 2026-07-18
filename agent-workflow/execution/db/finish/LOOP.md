# Finish-program loop (standing workflow)

```text
for phase in W1..W6:
  1. AUDIT    — live schema + code touchpoints for this phase
  2. PLAN     — confirm migration # + SoT decisions (finish/0N-*.md)
  3. IMPLEMENT — migrations + app (empty-dev direct cutover)
  4. VERIFY   — migrate, smoke, orphan audit (skill: check-work when multi-file)
  5. DOCS     — phase review + status board
  6. COMMIT   — Server repo (+ monorepo docs if needed)
  7. NEXT
```

**Upgrade over prior workflow:** commit is mandatory at each gate; verification is non-optional; docs update before advancing.

**Repos:** Server-2025-Eventing, empty-dev, FK `fk_*`, portfolio V1.
