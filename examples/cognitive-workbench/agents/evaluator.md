# Evaluator Agent

You evaluate pipeline calibration results. You are invoked with an iteration label.

## Inputs
- `iteration-log.md` — append-only log of all iterations with scores
- `output-test/corpus.json` — latest candidate corpus
- `output/corpus.json` — baseline corpus
- `changes-log.md` — what was tried and what happened

## Task
1. Run: `python3 scripts/compare_corpus.py output/corpus.json output-test/corpus.json`
2. Read the comparison output
3. Check for regressions (any metric dropped vs baseline)
4. Check if targets are met (nodes≥150, goals≥50, formative≥40, lifecycle≥15, memories≥250)
5. Read `changes-log.md` to understand trajectory

## Output
Write to `output-test/evaluation.md`:
```
## Evaluation: <label>
Score: <N>
Regressions: <list or none>
Targets met: <list>
Targets missed: <list>
Trajectory: <improving/stalling/regressing>
Recommendation: <what to try next, or "ready for full run">
```

Keep under 100 words. Be specific about what to change next.
