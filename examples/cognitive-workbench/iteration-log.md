# Pipeline Calibration — Iteration Log

## Targets

| Metric | Baseline | Target |
|--------|----------|--------|
| Nodes | 168 | ≥150 |
| Goals | 56 | ≥50 |
| Formative | 12 | ≥40 |
| Lifecycle nodes | 0 | ≥15 |
| Memories | 285 | ≥250 |
| Enriched | 197 | ≥180 |

## Iterations

### baseline-4call (2026-10-10 15:37, limit=3)
```
(Scaled targets for 3/16 passages)
=== Corpus Comparison ===
Metric                 Baseline  Candidate    Delta   Target Status
---------------------------------------------------------------------------
nodes                       168         48     -120       28 REGRESSED MET
goals                        56         17      -39        9 REGRESSED MET
formative                    12         10       -2        7 REGRESSED MET
lifecycle_nodes               0          6       +6        2 IMPROVED MET
lifecycle_events              0          7       +7          IMPROVED
persons                      26         13      -13          REGRESSED
places                       14          5       -9          REGRESSED
projects                     18          1      -17          REGRESSED
concepts                     21          7      -14          REGRESSED
organisations                15          3      -12          REGRESSED
activities                   18          2      -16          REGRESSED
edges                       202         38     -164          REGRESSED
memories                    285         58     -227       46 REGRESSED MET
enriched                    197         35     -162       33 REGRESSED MET

Domains (old): {'experience': 78, 'relationship': 23, 'reflection': 106, 'mood': 76, 'action': 2}
Domains (new): {'experience': 12, 'relationship': 4, 'reflection': 26, 'mood': 16}

Score: -22 (gains - 2×regressions)
Regressions: nodes, goals, formative, persons, places, projects, concepts, organisations, activities, edges, memories, enriched
All targets met: YES
```

### pad+lifecycle+coverage-fix (2026-10-10 15:58, limit=3)
```
(Scaled targets for 3/16 passages)
=== Corpus Comparison ===
Metric                 Baseline  Candidate    Delta   Target Status
---------------------------------------------------------------------------
nodes                       168         52     -116       28 REGRESSED MET
goals                        56         21      -35        9 REGRESSED MET
formative                    12         12       +0        7 same MET
lifecycle_nodes               0         32      +32        2 IMPROVED MET
lifecycle_events              0         40      +40          IMPROVED
persons                      26         13      -13          REGRESSED
places                       14          5       -9          REGRESSED
projects                     18          1      -17          REGRESSED
concepts                     21          7      -14          REGRESSED
organisations                15          3      -12          REGRESSED
activities                   18          2      -16          REGRESSED
edges                       202         36     -166          REGRESSED
memories                    285         53     -232       46 REGRESSED MET
enriched                    197         53     -144       33 REGRESSED MET

Domains (old): {'experience': 78, 'relationship': 23, 'reflection': 106, 'mood': 76, 'action': 2}
Domains (new): {'experience': 10, 'relationship': 4, 'reflection': 24, 'mood': 15}

Score: -20 (gains - 2×regressions)
Regressions: nodes, goals, persons, places, projects, concepts, organisations, activities, edges, memories, enriched
All targets met: YES
```

### full-run-v2b (2026-10-10 18:11, limit=0)
```
=== Corpus Comparison ===
Metric                 Baseline  Candidate    Delta   Target Status
---------------------------------------------------------------------------
nodes                       168        276     +108      150 IMPROVED MET
goals                        56        138      +82       50 IMPROVED MET
formative                    12         57      +45       40 IMPROVED MET
lifecycle_nodes               0        140     +140       15 IMPROVED MET
lifecycle_events              0        204     +204          IMPROVED
persons                      26         33       +7          IMPROVED
places                       14         18       +4          IMPROVED
projects                     18         25       +7          IMPROVED
concepts                     21         31      +10          IMPROVED
organisations                15         15       +0          same
activities                   18         16       -2          REGRESSED
edges                       202        209       +7          IMPROVED
memories                    285        347      +62      250 IMPROVED MET
enriched                    197        341     +144      180 IMPROVED MET

Domains (old): {'experience': 78, 'relationship': 23, 'reflection': 106, 'mood': 76, 'action': 2}
Domains (new): {'experience': 81, 'relationship': 22, 'reflection': 145, 'mood': 98, 'formative-experience': 1}

Score: 10 (gains - 2×regressions)
Regressions: activities
All targets met: YES
```
