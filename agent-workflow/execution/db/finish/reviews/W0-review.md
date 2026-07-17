# W0 Review Gate — File reorg

**Date:** 2026-07-18  
**Verdict:** **PASS**

## Evidence

- `agent-workflow/execution/db/{integrity,normalize,finish}` in place  
- Server `scripts/{smoke,seed,db,maintenance,ci}` classified  
- `seed/{postgres,legacy}` split  
- `package.json` paths updated  
- `smoke.order-foundation` 115/115 after path fixes  
- `run-orphan-audit` ALL CLEAR  

## Residual

- Some smoke file header comments still show old paths (cosmetic)  
- Proceed to W1  
