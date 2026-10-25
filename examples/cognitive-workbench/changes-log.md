# Calibration Changes Log

Append-only. Each entry records what was changed, why, and what happened.
The strategist reads this to avoid loops and identify patterns.

## History

### Iteration 0 — Prior session findings (not run as iterations)

- **Combined entity+goal prompt**: FAILED. 85% entity regression (168→25). Cause: prompt too complex, LLM overwhelmed.
- **Split to 4 calls (entity/goal/edge/memory)**: FIXED. 2-passage test: 45 entities, 15 goals. Restored entity yield.
- **Frida-specific examples in goal prompt**: HARMFUL. LLM only extracted the listed examples. Removed.
- **EDTF prefix qualifiers**: BUG. LifecycleDate uses postfix (`1939~`). Fixed in prompt.

### Iteration 1 — baseline-4call (3 passages, old prompts)

Baseline run with 4-call structure. All scaled targets MET. Key metrics:
- 48 entities, 17 goals, 10 formative, 6 lifecycle nodes from 3 passages
- Enrichment data present but coverage gate shows 8.3% — discovered enrichment fields stored inside nested `cognitive` dict but coverage checker looks at top level
- Node PAD 0% — prompt didn't request PAD on entities

**Bugs found and fixed (before iteration 2):**
1. `apply_enrichment()` didn't promote PAD/OCC/SEC/sub-thoughts/etc. to memory top level → coverage checker saw 0%
2. Coverage checker `action_tendencies` handler assumed list format, but LLM returns `{dominant, secondary}` dict
3. `sub_thoughts_structured` hardcoded to `False` — now checks actual structure
4. `confidence_decay_ref` and `node_ref_provenance` marked as extraction-stage but are importer-only
5. Coverage `_field_applies` had no stage filter — all stages checked against extraction output
6. Entity extraction prompt didn't request PAD
7. Entity extraction prompt didn't strongly request lifecycle/valid_from/valid_until
8. Assembler didn't handle both top-level and cognitive-nested enrichment paths

### Iteration 2 — pad+lifecycle+coverage-fix (3 passages, improved prompts + all fixes)

All coverage gates now PASS:
- Node fields: 65.2% (was 17.4%) — PAD on entities, lifecycle REQUIRED, temporal derivation
- Memory fields: 76.5% (was 52.9%) — stage-aware filtering
- Enrichment fields: 79.2% (was 8.3%) — field promotion fix
- Overall: 73.4% (was 23.4%)

Key improvements from iteration 1:
- Lifecycle nodes: 6→32 (+433%) from REQUIRED instruction + derivation
- Lifecycle events: 7→40 (+471%)
- Enriched memories: 35→53 (100%) from promotion fix
- Formative regression fixed: 10→12 (same as baseline)

All scaled targets met. Ready for full run to verify at scale.

### Iteration 3 — full-run-v2b (all 16 passages)

**ALL TARGETS MET. Score +10 (1 minor regression: activities 18→16).**

| Metric | Baseline | Full Run | Delta |
|--------|----------|----------|-------|
| Nodes | 168 | 276 | +108 |
| Goals | 56 | 138 | +82 |
| Formative | 12 | 57 | +45 |
| Lifecycle nodes | 0 | 140 | +140 |
| Lifecycle events | 0 | 204 | +204 |
| Edges | 202 | 209 | +7 |
| Memories | 285 | 347 | +62 |
| Enriched | 197 | 341 | +144 |

Coverage gates: node 56.5% WARN (threshold 60%), memory 76.5% PASS, enrichment 79.2% PASS.
Node WARN caused by assembler not using stage filter — fixed in follow-up commit.

Cognitive model coverage: OCC 86%, distortions 100%, SEC 100%, sub-thoughts 100%, drives 100%.

Bug found during full run: LLM returned edge without `target` field → KeyError crash. Fixed by guarding all 6 edge dedup sites.
