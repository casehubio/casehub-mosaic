# CLAUDE.md

**Name:** casehub-mosaic



## Project Type

type: custom

## Work Tracking

Issue tracking: enabled
GitHub repo: casehubio/casehub-mosaic
Changelog: GitHub Releases

## What This Project Is

Shared UI components for CaseHub applications — the UI parallel to [casehub-agency](https://github.com/casehubio/agency) (shared Java coordination patterns). Each component consumes `casehub-pages` APIs (`registerPanel`, `pages-event`, dataset contracts) but knows nothing about a specific app's domain model.

TypeScript/Yarn workspace monorepo with TypeScript project references.

## Platform Docs
- [Platform Index](https://raw.githubusercontent.com/casehubio/parent/main/docs/INDEX.md) — discovery index (start here)
- [Building Platform](https://raw.githubusercontent.com/casehubio/parent/main/docs/guides/building-platform.md) — platform contributor guide

## Repo Guide

This repo owns its own documentation, synced to parent via CI:
- `docs/guides/consumer-guide.md` — for app builders: modules, APIs, quick start
- `docs/guides/contributor-guide.md` — for platform builders: architecture, SPIs, internals

Update the relevant guide in the same session when implementation changes modules, SPIs, or public APIs. Do not defer — drift compounds.

Read `docs/guides/consumer-guide.md` for app-level work. Only read `docs/guides/contributor-guide.md` when modifying this repo's internals or extension points.

## Repository Role

Reusable, domain-aware UI components that multiple CaseHub applications share. Consumes casehub-pages APIs. Framework-agnostic Web Components where possible.

**Peer repos (each has its own Claude session — do not commit to these):**
platform, eidos, ledger, connectors, iot, work, worker, qhorus, pages, engine, claudony, openclaw, neural-text, devtown, aml, clinical, drafthouse, life, quarkmind, flow, soc, fsitrading, ras, ops, workers, desiredstate, agency

## Frontend Dependencies

This project consumes frontend packages from casehub-pages via **Maven SNAPSHOT** artifacts (WebJar pattern) and **also publishes** its own components as Maven SNAPSHOT artifacts for downstream CaseHub apps.
See [casehub-pages ADR-0001](https://github.com/casehubio/casehub-pages/blob/main/docs/adr/0001-cross-repo-frontend-dependency-management.md).

| Direction | Source | Mechanism |
|-----------|--------|-----------|
| Consumes | casehub-pages | Maven SNAPSHOT (`META-INF/resources/`) |
| Publishes | mosaic components | Maven SNAPSHOT (`META-INF/resources/`) |

**Local development:** after changing pages, run `yarn build && mvn install` in casehub-pages to publish the SNAPSHOT to `~/.m2`. After changing mosaic, run the same here so downstream apps pick up changes.

**Do not use npm `file:` references for cross-repo dependencies** — they break in CI. See ADR-0001.

## Build Commands

```bash
yarn install
yarn build
yarn test
yarn typecheck
```

## Key Directories

For detailed component descriptions, read the guides: `docs/guides/consumer-guide.md` (module table with maturity) and `docs/guides/contributor-guide.md` (internals and SPIs).

**Core packages:**
- `packages/mosaic-core/` — domain types, status registry, orchestration types, pattern categories, conversation protocol types, shared CSS
- `packages/mosaic-schema/` — auto-generated Zod schemas, AgencyComponentRegistry, staleness tests
- `packages/agent-avatar-2d/` — composable SVG avatar system, 4 collections, 48 archetypes
- `packages/agent-viewer/` — agent visualization, 15 pattern views, PatternViewMixin
- `packages/diagram-core/` — DiagramBaseMixin, toolbar, properties, schema registry
- `packages/graph-stencil-{case,swf,htn,org}/` — domain-specific diagram adapters and stencils

**Components by domain:**
- **Work items:** work-item-inbox, work-item-detail, work-item-workbench, worker-task-pane
- **Agent config:** agent-catalog, agent-manifest-editor, agent-personality-workbench, agent-profile-panel, agent-relationship-editor, avatar-step
- **Trust & compliance:** trust-score-panel, trust-workbench, routing-rationale, trust-feedback-display, similarity-panel, compliance-summary, approval-gate
- **SLA & GDPR:** sla-indicator, sla-breach-policy, gdpr-erasure-action
- **Case & diagrams:** casehub-diagram, case-flow-viewer, case-explorer, diagram-workbench, swf-diagram, org-diagram, summarisation-timeline
- **Agency & orchestration:** agency-dag-viewer, agency-decomposition-tree, agency-plan-item-tree, agency-plan-model-dashboard, execution-monitor, orchestration-workbench
- **Channel & conversation:** channel-activity, commitment-viz, conversation-viewer
- **Audit & events:** audit-trail-viewer, event-trail, agency-timeline
- **Evolution:** evolution-config, evolution-workbench
- **Infra & ops:** service-card, cluster-panel, reconciliation-status, dimension-dashboard, topology-viewer
- **Notifications:** notification-inbox, kpi-metric-row
- **Sessions:** session-list, session-detail, session-workbench
- **Layout:** split-workbench, list-pane, detail-pane, grouped-data-view, preferences-editor

## Design Philosophy

- Components should be framework-agnostic Web Components where possible
- Each component defines its dataset contract (what data shape it consumes)
- Components communicate via `pages-event` CustomEvent — no direct component-to-component coupling
- Components should work standalone in a test harness AND embedded via pages `hostPanel`
- Visual consistency through `--pages-*` CSS custom properties from `pages-ui-tokens`
- Design for the full platform: trust scores from ledger, channel activity from qhorus, case timelines from engine, IoT device state from iot

## ARIA Requirements

Every component must have ARIA attributes. ARIA is the unified interaction model — no component ships without it.

**Mandatory for every `@customElement`:**
- `aria-label` on the host or primary container (set in `connectedCallback` or as a reflected property)
- Appropriate `role` attribute matching the component's interaction pattern
- State attributes (`aria-busy`, `aria-disabled`, `aria-expanded`, etc.) reflecting component state

**Pattern guide** (pick the pattern matching the component's function):
- **Interactive controls:** `role="button"`, `role="form"`, `role="listbox"` + state attrs
- **Data display:** `role="region"` + `aria-label`, or `role="status"` + `aria-live="polite"`
- **Trees:** `role="tree"` / `role="treeitem"` + `aria-expanded`, `aria-level`
- **Tabs:** `role="tablist"` / `role="tab"` / `role="tabpanel"` + `aria-selected`, `aria-controls`
- **Visualizations:** `role="img"` + `aria-label` describing the content
- **Live content:** `role="log"` or `role="status"` + `aria-live="polite"`
- **Composition shells:** Inherit ARIA from composed children (split-workbench provides regions)

**Tests:** Every component test file must include ARIA assertions verifying role and aria-label.

**Build validation:** `yarn aria-check` scans all components for minimum ARIA compliance. CI fails if any component lacks ARIA.

## IntelliJ MCP Routing

One IntelliJ MCP server is available:

- **`mcp__intellij-index__*`** — use this for ALL code intelligence and navigation. Supports auto-opening projects via `project_path` — pass the project path and the plugin opens it automatically. Never ask the user to open a project manually.

`mcp__intellij__*` (built-in JetBrains MCP) is **disabled** due to a memory leak. Do not attempt to use it. All operations (find class, find references, type hierarchy, diagnostics, rename, move) go through `mcp__intellij-index__*`.

**If a project is not open:** pass `project_path` to any `mcp__intellij-index__` tool — it opens automatically. Do not fall back to bash. Do not launch IntelliJ from the command line.

## Development Workflow

Before designing: `superpowers:brainstorming`
Before implementing: `superpowers:test-driven-development`
For all TypeScript work: `ts-dev`
Before committing: `superpowers:requesting-code-review`
After implementation: `implementation-doc-sync` (scoped doc sweep)

## Writing Style Guide

**The writing style guide at `~/claude-workspace/writing-styles/blog-technical.md` is mandatory for all blog and diary entries.** Load it in full before drafting. Complete the pre-draft voice classification (I / we / Claude-named) before generating any prose. Do not show a draft without verifying it against the style guide.

## Project Artifacts

Paths that are project content (not workspace noise). Skills use this to avoid
filtering or dropping commits that touch these paths.

| Path | What it is |
|------|------------|
| `CLAUDE.md` | Project conventions |
| `docs/` | Documentation |
