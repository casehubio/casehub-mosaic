# casehub-mosaic — Contributor Guide

> Internal architecture, extension points, and development conventions for contributors modifying or extending mosaic components.

**GitHub:** [casehubio/casehub-mosaic](https://github.com/casehubio/casehub-mosaic)

---

## Internal Architecture

### Design Philosophy

- Components should be framework-agnostic Web Components where possible
- Each component defines its dataset contract (what data shape it consumes)
- Components communicate via `pages-event` CustomEvent — no direct component-to-component coupling
- Components should work standalone in a test harness AND embedded via pages `hostPanel`
- Visual consistency through `--pages-*` CSS custom properties from `pages-ui-tokens`
- Design for the full platform: trust scores from ledger, channel activity from qhorus, case timelines from engine, work items from work, IoT device state from iot

### Data Architecture

**DataSourceMixin** — Lit mixin for pull-based data loading (REST endpoints). Adds `endpoint`, `loading`, `error`, `dataSet` properties. Wraps `DataSourceAdapter` -> `DataSourceController`, producing `TypedDataSet` via extraction pipeline. **Canonical home: `@casehubio/pages-component`** — re-exported from mosaic-core for backward compatibility. Used by: similarity-panel, compliance-summary, grouped-data-view, list-pane, routing-rationale.

Additional data-source exports (all canonical in `@casehubio/pages-data`, re-exported here):
- `fetchSource(url, options)` — standalone fetch with TypedDataSet extraction
- `createTypedFetchSource(options)` — factory for typed fetch sources
- `EMPTY_DATASET` — empty TypedDataSet placeholder for initial state
- `DatasetContract` — the contract type for dataset shapes

**TrendSourceMixin** — Lit mixin for time-series trend data. Adds trend endpoint, provides `TrendPoint[]` via `extractTrendPoints`. **Canonical home: `@casehubio/pages-component`**. Used by trust-score-panel for sparkline trend lines.

**EventStreamController** — Lit `ReactiveController` for push-based data (SSE streams). Wraps `EventStream` from pages-data. **Canonical home: `@casehubio/pages-component`**. Provides `latest`, `all`, and `status` (ConnectionStatus). Batches events by default.

Components can use both — DataSourceMixin for initial load, EventStreamController for live updates.

### Frontend Dependencies

This project consumes frontend packages from casehub-pages via Yarn **portal** resolutions (pointing to `.casehub-packages/`) and **also publishes** its own components as Maven SNAPSHOT artifacts for downstream CaseHub apps. See [casehub-pages ADR-0001](https://github.com/casehubio/casehub-pages/blob/main/docs/adr/0001-cross-repo-frontend-dependency-management.md).

| Direction | Source | Mechanism |
|-----------|--------|-----------|
| Consumes | casehub-pages | Yarn portal (`.casehub-packages/`) for dev; Maven SNAPSHOT (`META-INF/resources/`) for CI/apps |
| Consumes | graph-core | Yarn portal (`.casehub-packages/packages/graph-core`) |
| Publishes | mosaic components | Maven SNAPSHOT (`META-INF/resources/`) |

Portal resolutions are declared in the root `package.json`:
- `@casehubio/pages-component`, `@casehubio/pages-data`, `@casehubio/pages-primitives`, `@casehubio/pages-table`, `@casehubio/pages-ui-components`, `@casehubio/pages-ui-tokens`, `@casehubio/pages-viz`, `@casehubio/graph-core`

**Local development:** after changing pages, run `yarn build && mvn install` in casehub-pages to publish the SNAPSHOT to `~/.m2`. After changing mosaic, run the same here so downstream apps pick up changes.

**Do not use npm `file:` references for cross-repo dependencies** — they break in CI.

---

## Full Module Details

### mosaic-schema (`packages/mosaic-schema`)

Auto-generated Zod schemas for all mosaic component properties. `AgencyComponentRegistry` in `src/registry.ts` maps element tag names to their Props interfaces. A ts-morph generator (`scripts/generate-schemas.ts`) reads the registry and produces `component-schemas.generated.ts` with per-component Zod schemas and an `agencyComponentSchemaMap`. The generator uses `tsconfig.generator.json` (with `paths` mapping packages to source) to resolve types without requiring a full build. Staleness test ensures generated schemas stay in sync. Registry completeness test ensures every `agency-*` element has an entry.

When adding a new component:
1. Export a `FooProps` interface from the component's index.ts
2. Add `import type` and registry entry in `src/registry.ts`
3. Add `workspace:*` devDependency in `package.json`
4. Run `yarn workspace @casehubio/casehub-mosaic-schema run generate`

### mosaic-core (`packages/mosaic-core`)

Core shared utilities re-exported from pages and domain-specific to mosaic:

**Tokens** (re-exported from pages-ui-tokens): `generateScale`, `SPACING_SCALE`, `TYPOGRAPHY`, `MOTION`, `RADIUS`, `ELEVATION_LIGHT`, `ELEVATION_DARK`, `DENSITY_COMPACT_OVERRIDES`, `applyTheme`, `registerTheme`, `getTheme`, `listThemes`.

**Data source** (re-exported from pages — canonical home is `@casehubio/pages-component` and `@casehubio/pages-data`): `DataSourceMixin`, `DataSourceAdapter`, `fetchSource` + `FetchSourceOptions`, `createTypedFetchSource` + `TypedFetchOptions`, `EMPTY_DATASET`, `TrendSourceMixin`, `TrendPoint`, `extractTrendPoints`.

**Event stream** (re-exported from `@casehubio/pages-component`): `EventStreamController` (Lit ReactiveController for SSE).

**Rendering** (re-exported from `@casehubio/pages-ui-components`): `renderSparkline` + `SparklineOptions` (shared SVG sparkline), `renderPropertyTree` + `propertyTreeStyles` (recursive nested object renderer).

**Domain types**: `TrustLevel`, `trustLevelFromScore(score)`, `CommitmentState` (7-state: OPEN/ACKNOWLEDGED/FULFILLED/FAILED/DECLINED/DELEGATED/EXPIRED), `CommitmentRecord`, `RawCommitment`, `commitmentStateCategory(state)`, `isTerminalCommitmentState(state)`, `toCommitmentRecord(raw)`, `toCommitmentMap(commitments)`, `StateCategory`. Orchestration types (#111): `ExecutionState` (7 states), `ExecutionResult` (4 outcomes), `AgentRef`/`AgentResult`, `PatternType` (8 patterns), `ExecutionModel`, `FailurePolicy`, `AgentRetryPolicy`, `OrchestrationAuditEvent` (discriminated union payload), `ExecutionSnapshot`. Pattern category types (#277): hierarchical `PatternCategory` discriminated union — `OrchestrationPatternCategory`, `DeliberationPatternCategory`, `GovernancePatternCategory`, `PerceptionPatternCategory`, `OptimisationPatternCategory`, `SocialPatternCategory`, `CommunicationPatternCategory`, `PlaybookPatternCategory`. Sub-spec types: perception (`PipelineSpec`, `WorldSpec` with `RendererSpec`), optimisation (`PromptOptimisationPipeline` with signature/optimiser/config/safety/scorer), social (`CognitionConfig` 13-section, `RetentionConfig` with 4 weights), deliberation (`NegotiationParty`, `AcceptancePolicy`).

**Status registry** (#109): `StatusDescriptor`, `StateCategory`, `lookupStatus(domain, state)`, `registerStatus(domain, state, descriptor)`, `FALLBACK_DESCRIPTOR`. 13 built-in domains (case, task, workitem, work, milestone, outcome, group, sla, node, session, commitment, execution, agent, pattern) with cross-domain defaults. Extend with `registerStatus()` for new domains:

```typescript
import { registerStatus } from '@casehubio/casehub-mosaic-core';
registerStatus('myDomain', 'ACTIVE', { category: 'info', icon: '◉', pulse: true });
```

**UI components**: `StatusBadge` (`<status-badge>`, generic status pill for all domains — #109), `PagesConfirmDialog` (re-exported from `@casehubio/pages-ui-components` as `AgencyConfirmDialog` for backward compat), `CommitmentStatePill` (`<commitment-state-pill>`, deprecated — delegates to status-badge), `stateCategoryStyles` + `CategoryStyle`.

**Utilities** (re-exported from pages): `SharedTimerController` (`subscribe`/`unsubscribe` from `@casehubio/pages-component`), `pulseAnimation` CSS (from `@casehubio/pages-ui-tokens`), `DatasetContract` (from `@casehubio/pages-data`).

**Event helpers**: re-exported from pages-component (`emitPagesEvent`, `onPagesEvent`).

### graph-stencil-case (`packages/graph-stencil-case`)

Case domain adapter for the visual diagram editor (epic #103). Exports:
- `toGraph(yaml)` → `AdapterResult { model: GraphModel, yamlPaths: Map }` — parses YAML into graph model with YAML path metadata for editing
- `applyPropertyEdit(yaml, nodePath, field, value)` → new YAML string — CST-preserving property mutation
- `addElement(yaml, elementType, defaults?)` → new YAML string — adds binding/worker/milestone/goal with generated defaults
- `removeElement(yaml, nodePath)` → new YAML string — removes element by YAML path
- `switchBindingTarget(yaml, bindingPath, targetType)` → new YAML string — switches binding target (capability/subCase/humanTask)
- `registerCaseStencils()` — registers 5 stencil descriptors via pages `registerStencil()` (StencilDescriptor API with grammar, properties schema, render function) and 5 property schemas via `registerPropertySchema` (milestone, goal, subcase, binding, worker)
- `registerThumbnailRenderer(type, renderer)` / `getThumbnailRenderer(type)` — ThumbnailRenderer SPI for worker node previews (SWF thumbnails registered by the hosting app)
- `GitHubBackend` — `PersistenceBackend` implementation using GitHub Contents API
- `toDecorations(state: CaseRuntimeState)` → `ReadonlyMap<string, NodeDecoration>` — pure function mapping runtime state to visual decorations. PlanItem aggregation uses active-worst-first priority per binding; milestones map 1:1.
- `toDecoration(domain, state)` → `NodeDecoration` — single-state decoration via status registry (#109). Used internally by `toDecorations`; also available for custom domain decorations. `BADGE_COLORS` provides raw hex per `StateCategory`.
- Types: `CaseRuntimeState` (with optional `caseStatus`), `PlanItemSnapshot`, `MilestoneSnapshot`, `TaskStatus` (9 states), `MilestoneLifecycleStatus` (3 states)
- `CaseDefinition` type (generated from CaseDefinition.yaml JSON Schema)

Each stencil's render function accepts `(node: GraphNode, decoration?: NodeDecoration)` → `StencilTemplate`. Decorations are rendered by the pages graph-renderer; OBSOLETE status additionally applies reduced opacity inside the stencil render function.

### diagram-core (migrated to `@casehubio/pages-diagram-core`)

**No longer a local package** — migrated to casehub-pages as `@casehubio/pages-diagram-core`. All diagram components (`casehub-diagram`, `swf-diagram`, `org-diagram`, `htn-diagram`) import `DiagramBaseMixin` from the pages package. The local `packages/diagram-core` directory has been removed.

Key exports (from pages-diagram-core):
- `DiagramBaseMixin(LitElement)` — Lit mixin owning undo/redo, render pipeline (`_fullRender`/`_updateWithoutLayout`), dirty tracking, persistence (`_load`/`_save`), keyboard shortcuts, selected node state, mode toggle, `src` fetch with AbortController, error/degraded/readonly modes, SVG/PNG export via `exportDiagram`. Subclasses implement 4 abstract methods: `_adaptYaml`, `_applyPropertyEdit`, `_paletteTypes`, `_emptyTemplate`.
- `registerPropertySchema(nodeType, schema)` / `getPropertySchema(nodeType)` — schema registry. Each stencil package registers schemas in its `register*Stencils()` function.
- `DiagramToolbar`, `DiagramProperties` — base toolbar and schema-driven property panel
- Form utilities: `fieldTypeFor`, `validateField`, `renderNestedGroup`, `renderTriggerEditor`

### graph-stencil-swf (`packages/graph-stencil-swf`)

SWF domain adapter for the visual diagram editor (#106). Uses `@openworkflowspec/sdk`. Exports:
- `toSwfGraph(yaml)` → `AdapterResult { model, yamlPaths, degraded? }` — dual YAML walk (SDK `buildFlatGraph` + YAML CST path walker), type prefixing (`swf-*`), integrity assertion
- `applySwfPropertyEdit(yaml, nodePath, field, value)` → new YAML string — CST-preserving via `yaml` library
- `registerSwfStencils()` — registers 10 typed stencils (call with sub-type icons, set, switch, raise, try, try-catch, start, end, entry, exit) + generic fallback, 2 edge types (flow, switch-case)
- `swfTaskSchema` — static JSON Schema for SWF task types with x-group/x-order/x-visibility annotations (CallTask, SetTask, SwitchTask, RaiseTask, TryTask, TryCatchTask). Registered per-$def via `registerPropertySchema` in `registerSwfStencils()`.
- `createSwfThumbnailRenderer()` — SVG thumbnail renderer with layout caching
- `wrapDoBlock(doBlock)` — wraps a `do:` array into a minimal SWF document envelope
- `SWF_KNOWN_TYPES`, `SYNTHETIC_TYPES`, `SWF_TYPE_PREFIX` — type constants

### graph-stencil-htn (`packages/graph-stencil-htn`)

HTN/DAG domain adapter for the DAG execution viewer and decomposition tree (epic #107). Exports:
- `dagToGraph(plan)` → `DagAdapterResult { model, entryNodeIds, exitNodeIds, taskIdToGraphNodeId }` — converts `DagPlanSnapshot` to `GraphModel` with topology metadata
- `dagToDecorations(result)` → `ReadonlyMap<string, NodeDecoration>` — maps `DagResultSnapshot` node states to decorations via `node:` status domain (#109)
- `nodeStatesToTaskStates(plan, result)` → `Record<string, NodeStateSnapshot>` — re-keys DagNode states by taskId for the decomposition tree
- `registerHtnStencils()` — registers the `dag-node` stencil via pages `registerStencil()` (join indicators, executor badges, dimmed opacity for Skipped/Cancelled)
- `toDecoration(domain, state)` → `NodeDecoration` — local duplicate of graph-stencil-case's decoration function (parallel packages, no cross-dependency)
- Types: `TaskNodeSnapshot` (LeafTask/CompoundTask), `DecompositionSnapshot`, `DagPlanSnapshot`, `DagNodeSnapshot`, `DagResultSnapshot`, `NodeStateKind` (6 variants), `PlanItemDefinition` (Primitive/Compound), `CasePlanModelSnapshot`

### graph-stencil-org (`packages/graph-stencil-org`)

Eidos org domain adapter for the organizational structure diagram. Exports:
- `toOrgGraph(yaml)` → `OrgAdapterResult { model: GraphModel }` — parses org YAML into graph model with compound nodes (org units as containers, agents as leaves)
- `toOrgYaml(roster, relationships)` → YAML string — converts roster entries and relationships back to YAML for the relationship editor diagram tab
- `registerOrgStencils()` — registers 2 stencils (`org-unit` container, `org-agent`) and 6 edge types (one per `RelationshipKind`)
- `applyOrgPropertyEdit`, `addOrgUnit`, `removeOrgUnit`, `addMember`, `removeMember`, `addRelationship`, `removeRelationship` — CST-preserving YAML editing operations
- `createOrgEditPolicy()` — `EditPolicy` for org-specific structural editing constraints
- `enrichWithDescriptors(model, descriptors)` — applies `AgentDescriptor` data to graph nodes
- `computeDerivedData(model)` → `DerivedOrgData` — derives supervision entries and other computed data
- `resolveKindColors(kinds)` / `DEFAULT_KIND_PALETTE` — edge colour resolution per relationship kind
- `applyCollapsedUnits`, `applyOrgEdgeLabels`, `applySelectionHighlight` — graph model transforms for visual state
- `extractEgoSubgraph(model, agentId)` — single-hop subgraph extraction for focal-agent views
- `OrgLayoutEngine` — rule-based layout engine with `orgClassificationRules`, `sizingClassifier`, `orgLayoutRules`, `orgHardConstraints`
- Types: `OrgUnit`, `Membership`, `AgentRelationship`, `RelationshipKind`, `OrgStructureYaml`, `OrgLayoutStrategy`, `FactBase`, `ArchetypeHint`

### agent-avatar-2d (`packages/agent-avatar-2d`)

Composable 2D SVG avatar system. Exports:
- `AgentAvatar` (`<agent-avatar>`) — Lit component rendering an avatar from archetype config or custom parts
- `buildAvatar(config, size, modifiers?)` → SVG string — layered builder (body→costume→head→hair→face→props)
- `ARCHETYPE_CONFIGS` / `ARCHETYPE_INDEX` / `HEAD_FACE_SPECS` — 48 archetype configs (12 families × 4 sub-archetypes), face specs for expression variants
- `registerCollection(name, collection)` / `getCollection(name)` / `listCollections()` — collection registry for avatar styles
- 4 built-in collections: `mythicCollection` (parts-based), `chibiCollection`, `simpsonsCollection`, `neonCollection` (fixed SVG)
- `encodePreset(family, sub)` / `encodeCustom(parts)` / `decodeCode(code)` — compact avatar identity codes for serialisation
- `resolveModifiers(input)` — modifier resolution for expression/pose customisation
- `FAMILY_PALETTES` — per-family colour palettes
- Types: `AvatarCollection` (`PartsCollection | FixedCollection` discriminated union), `ArchetypeFamily`, `AvatarSize`, `AvatarModifiers`, `AvatarPayload`, `AxisExpression`

### agent-viewer (`packages/agent-viewer`)

Agent visualization package — the tabbed drill-down container and 15+ pattern views. Exports:
- `AgentViewer` (`<agency-agent-viewer>`) — tabbed container with exhaustive `PatternCategory` dispatch
- `EidosView` (`<agency-eidos-view>`) — agent descriptor with disposition bars, capabilities, goals
- `AgentCard` (`<agency-agent-card>`) — compact agent reference card
- `HumanWorkItemCard` (`<agency-human-work-item-card>`) — human work item card for orchestration views
- `CoordinationPipelineView` (`<agency-coordination-pipeline-view>`) — coordination playbook as vertical pipeline with agent-delegate cards, signal/quorum barriers, parallel swim lanes, match/case routing, expression pills
- `CoordinationDiffView` / `computeCoordinationDiff` — before/after diff view for coordination pipelines
- `assignTiers`, `detectPreferredView` — graph model utilities for coordination visualisation
- 15 pattern views organized by category in `src/views/`:
  - **Orchestration:** `SupervisorView`, `ChoreographyView`, `SagaView`, `DecompositionView`, `RoutingStrategyView` (composable with `registerRoutingRenderer`)
  - **Deliberation:** `VotingView`, `DebateView`, `NegotiationView`, `CoalitionView`, `NormativeView`
  - **Governance:** `JudgmentView`
  - **Perception:** `SummarisationView`, `ObservationView`, `NarrativeView`
  - **Optimisation:** `PromptOptimisationView`
  - **Social:** `CognitionView`, `MemoryHygieneView`
- `PatternViewMixin` + `patternViewStyles` — shared infrastructure (Execution/Reports tab architecture with `renderTabBar`/`renderTabPanel`, ARIA roving tabindex, shared header CSS with `--pattern-badge-color`)
- `BasePatternView`, `PlaybookSpecView` — base classes for pattern views
- Types: `AgentDescriptor`, `Disposition`, `Capability`, `Goal`, `CoordinationPipeline`, `CoordinationStep`, `DrillDownDetail`

### avatar (`packages/avatar`)

3D avatar rendering and conversational interaction. Uses TalkingHead for WebGL-rendered 3D avatars with lip-sync. Exports:
- `CasehubAvatar` (`<casehub-avatar>`) — 3D avatar component with mood, camera view (head/upper/full), lip-sync language, speed control, and audio queue for TTS playback
- `CasehubAvatarPanel` (`<casehub-avatar-panel>`) — panel wrapper composing avatar + transcript + speech controls
- `CasehubTranscript` (`<casehub-transcript>`) — conversation transcript display
- `CasehubSpeech` (`<casehub-speech>`) — speech controls (play/pause/stop)
- `AvatarWsController` — Lit ReactiveController for WebSocket-based avatar communication, manages audio queue and viseme frames
- Types: `VisemeFrame`, `PlaybackItem`, `ConversationTurn`, `AvatarConfig`, `AvatarMessage`

### lsp-schemas (`packages/lsp-schemas`)

YAML language server schema definitions for diagram editors. Re-exports `createSchemaRegistry` and `SchemaRegistry` from `@casehubio/pages-lsp`. Provides domain-specific format registrations:
- `caseDefinitionFormat` — CaseDefinition YAML schema
- `swfFormat` — Serverless Workflow YAML schema
- `htnFormat` — HTN plan YAML schema
- `orgFormat` — Org structure YAML schema

### agency-dag-viewer (`components/agency-dag-viewer`)

Read-only DAG execution graph viewer. Wraps `pages-graph-canvas` with ELK layout. Property-based data delivery (`dagPlan`, `dagResult`, `dispatchMode`). Toolbar with dispatch mode badge, summary stats, staleness timer. Decoration-only update path skips ELK when only `dagResult` changes. Node selection via `selectionTopic` with `taskId` payload for tree ↔ DAG coordination.

### agency-decomposition-tree (`components/agency-decomposition-tree`)

HTN decomposition tree — recursive ARIA tree for `CompoundTask → DecompositionMethod → children`. 8 strategy badge colours + unknown fallback, guard label display, `selectedMethodIndex` highlighting, `nodeStates`-driven status badges on leaves. Render callbacks (`renderLeaf`, `renderMethod`) per component-customisation protocol. Shared `selectionTopic` with DAG viewer for coordination.

### agency-plan-item-tree (`components/agency-plan-item-tree`)

PlanItemDefinition tree — recursive ARIA tree for Primitive/Compound plan item hierarchy. `CompletionSemantics` badges (All/M-of-N/FirstWins), `DispatchMode` pills (ORCHESTRATED/CHOREOGRAPHED), repeatable indicators, entry condition display. Render callbacks (`renderPrimitive`, `renderCompound`).

### agency-plan-model-dashboard (`components/agency-plan-model-dashboard`)

CasePlanModel dashboard — card-based grid layout showing agenda (table with status badges), focus area with rationale, resource budget key-value pairs, sub-case list with case status, compound definition progress bars. Consumes `CasePlanModelSnapshot` as a single property.

### split-workbench (`components/split-workbench`)

Generic split-pane layout shell — draggable divider, localStorage-persisted ratio, CSS container query responsive mode (single-panel below 768px), selection coordination via pages-event topics. Accepts any children via named slots (list, detail, header).

### list-pane (`components/list-pane`)

Data list wrapping `<pages-table>` — paginated mode, single selection, client-sort/filter, emits selection events on topic. Uses DataSourceMixin for endpoint-driven data. Also supports inline data via the `data` property (data-property mode, used by case-explorer's entity-list).

### detail-pane (`components/detail-pane`)

Tabbed detail view — lazily creates tab panels via `TabDefinition[]`, receives selected item via topic events, keyboard tab navigation, badges.

### grouped-data-view (`components/grouped-data-view`)

Grouped data view — items grouped by column key with per-group pages-table rendering, DataSourceMixin, group styling. Thin wrapper over `<pages-grouped-view>`.

### work-item-inbox (`components/work-item-inbox`)

Work item inbox — queue pill bar, scope context bar, filter bar with counts, summary bar, three-tab perspective (My Work / Claimable / All), queue scope integration, SSE lifecycle. Uses pages-table for rendering with the raw array + `fromRows` pattern.

### work-item-detail (`components/work-item-detail`)

Work item detail panel — action bar, activity tab, relations tab (outgoing + incoming with semantic type inverses).

### work-item-workbench (`components/work-item-workbench`)

Full workbench — split-pane layout with inbox (left) and detail (right), keyboard shortcuts and overlay. Uses split-workbench internally.

### notification-inbox (`components/notification-inbox`)

Notification inbox — bell with unread badge, inbox with tabs/filters/SSE, subscription list CRUD, subscription editor (schema-driven form with dynamic event-type field rebuild), channel preferences (per-channel delivery mode/digest/groupBy/quiet hours), mute list (table + inline add form with scope-conditional fields), snooze control (toggle with date-time picker), notification preferences container (composes channel/mute/snooze).

### sla-indicator (`components/sla-indicator`)

SLA deadline indicator — countdown, breach state, escalation badge, threshold-based colour transitions.

### kpi-metric-row (`components/kpi-metric-row`)

KPI metric cards — responsive grid with sparklines, trends, status colours, density property (comfortable/compact/dense), reactive endpoint.

### approval-gate (`components/approval-gate`)

Approval gate — structured decision point with quorum, evidence slots, SLA integration, confirmation dialog.

### audit-trail-viewer (`components/audit-trail-viewer`)

Audit trail viewer — ledger entries with data-table, Merkle verification banner, attestations, actor/type/date filters, GDPR erasure handling.

### agency-timeline (`components/agency-timeline`)

Pluggable timeline — strategy-based content (event chronology, state progression, commitment lifecycle), three layouts (vertical, horizontal, compact), render callback resolution (component > strategy > default), temporal weighting, staggered axis labels, strategy-declared pagination (load-more in vertical layout, bypasses DataSourceMixin for raw JSON access). Replaces case-timeline.

### trust-score-panel (`components/trust-score-panel`)

Trust score panel — SVG gauge, per-capability breakdown table, trend sparkline (via TrendSourceMixin, supports simulated/inline/direct data), maturity badges, compact badge mode.

### channel-activity (`components/channel-activity`)

Qhorus channel activity — message feed with sender grouping and threading, channel nav with keyboard navigation, member panel with presence, message input with speech-act type selector, emoji reactions, stale cursor detection. Promoted from connectors chat-demo. Extension points: `formatSender`, `renderContent`, `renderContextHeader`, `renderError`, `allowedTypes`/`deniedTypes` filtering (per protocol PP-20260713-8ea1af), channel-nav layout (sidebar/dropdown), `showCreate`/`showDelete` toggles, `messageCounts`. DOMPurify + marked for markdown rendering.

### commitment-viz (`components/commitment-viz`)

Commitment lifecycle visualization — transition badges (`commitment-transition-badge`), range bars (compact/detailed modes), `decorateCommitmentRanges` pure function for feed decoration metadata. Props-driven, decoupled from channel-activity. Types and commitment-state-pill re-exported from mosaic-core (pill promoted in #101).

### similarity-panel (`components/similarity-panel`)

Similar past cases — similarity scores, outcomes, resolution times via pages-table. Column renderers for similarity bar and outcome badge. Dual data mode (property or endpoint). Promoted from clinical.

### compliance-summary (`components/compliance-summary`)

Regulation compliance grid — status badges (MET/PARTIAL/GAP/BREACHED), evidence links via pages-table. Dual data mode. Promoted from clinical.

### trust-feedback-display (`components/trust-feedback-display`)

Post-gate trust score delta — decision/attestation badges, trust before/after with directional arrow, full card and compact inline modes. Complements trust-score-panel. Promoted from clinical.

### sla-breach-policy (`components/sla-breach-policy`)

SLA breach escalation tiers — active tier highlighting, optional embedded sla-indicator countdown via deadline prop, shared pulseAnimation. Promoted from clinical.

### gdpr-erasure-action (`components/gdpr-erasure-action`)

GDPR data erasure form — three-phase (input, confirmation, receipt), customisable `subjectLabel` and `reasonOptions`. Extends LitElement directly (no DataSourceMixin). Promoted from clinical.

### routing-rationale (`components/routing-rationale`)

Routing rationale — trust-weighted assignment explanation: score vs threshold with borderline margin, alternatives table with phase badges, policy summary. DataSourceMixin + LiveRegionMixin, inline-styled column renderers, `renderCandidate` callback, dual-data mode.

### trust-workbench (`components/trust-workbench`)

Trust workbench — composes trust-score-panel + list-pane (left) and routing-rationale + trust-feedback-display (right) in split-workbench. Capability drill-down filters routing history. Inline data mode for demos. Three consumption tiers.

### case-explorer (`components/case-explorer`)

Composable case explorer — universal entity browser with registration-based entity types. Generic components: entity-list (cursor-aware fetch, list-pane data-property mode), entity-detail (three-tier renderer resolution: sub-type, entity-type, default), entity-tree (collapsible hierarchy with lazy loading, ARIA tree, M-of-N groups), entity-command-bar (MCP-tools-style dynamic commands with confirmation), case-explorer (full split-workbench composition with NavigationController, entity type tabs, list/tree mode, breadcrumbs). Presets: caseInstanceType, workerType, caseDefinitionType, gateType, channelType. Convenience wrappers: case-instance-list, worker-list, case-definition-browser, case-detail-panel, worker-detail-panel. Domain customisation via `columnRenderers`, `detailRenderer`, `detailRendererMap`, `nodeRenderer`, `filters`.

### preferences-editor (`components/preferences-editor`)

Preferences editor — tree-table UI for scope-aware preference management. Scope hierarchy (system, tenant, team, user) with preference key-value pairs as leaves. Type-aware inline editors (string, integer, number, boolean, duration, enum) driven by `PreferenceSchemaDescriptor` from platform REST API. Inheritance computation (local, inherited, overridden, default) with source scope badges. `PreferencesApi` REST client, `ValueEditor` sub-component.

### session-list (`components/session-list`)

Session list — claudony session table with status badges (ACTIVE/WAITING/IDLE), inline spawn form, delete/restart actions with failure recovery. Uses raw array + `fromRows` pattern (like work-item-inbox), `emitPagesEvent` for selection/change events. Types: `SessionResponse`, `SessionStatus`, `CreateSessionRequest`, `GitStatusResponse`, `PortStatus`.

### session-detail (`components/session-detail`)

Session detail — tabbed detail pane for a selected session: Terminal (polling output), Git (branch/PR/checks), Health (port status via pages-table), Events (SSE via SSEManager). Tab lifecycle manages timers and SSE connections. Listens for `session:selected`/`session:deselected` events.

### session-workbench (`components/session-workbench`)

Session workbench — composition shell for session management. Composes session-list + session-detail in split-workbench with `selection-topic="session"`. `KeyboardShortcutMixin` for overlay. `configure()` method for hostPanel integration.

### conversation-viewer (`components/conversation-viewer`)

Conversation protocol viewer — five Lit components for structured deliberation. Extends `KeyboardShortcutMixin(LiveRegionMixin(LitElement))` for the workbench. Property-based data delivery (`ConversationState` as a single reactive property). All events use `emitPagesEvent` with colon-delimited topics (`${selectionTopic}:selected`/`:deselected`).

Domain types live in `mosaic-core` (`types/conversation.ts`): `EpistemicStatus`, `ConvergenceState`, `ConvergenceSignal`, `CommonGroundState`, `GroundedFact`, `ConversationPoint`, `ConversationEntry`, `SubTaskFinding`, `FlagEntry`, `RoundMemo`, `ObligationChain`, `ConversationState`. `TransitionRecord` promoted from commitment-viz to `mosaic-core` (`types/commitment.ts`).

Status registrations (`conversation` and `epistemic` domains) execute at module scope in `index.ts` as top-level side effects.

Workbench internals: `_selectedPointId` tracks selection. `willUpdate` derives `_selectedPoint`, filtered findings/flags/obligations by point ID. Stale selection guard clears `_selectedPointId` and emits deselection when the selected point disappears from `conversationState`. Right pane swaps between `agency-point-detail` (selected) and `agency-common-ground-panel` (deselected).

Extension points per PP-20260713-8ea1af: `renderPoint`, `renderEntry`, `renderFact` callbacks with inline styles. Generalization path for document-workbench tracked as #117.

### casehub-diagram (`components/casehub-diagram`)

Visual diagram editor for CaseDefinition YAML. Orchestrates graph-stencil-case adapter + stencils, pages `<pages-graph-canvas>` rendering, ELK auto-layout. Sub-elements: `casehub-diagram-toolbar` (save/dirty/mode toggle/staleness), `casehub-diagram-palette` (add nodes), `casehub-diagram-properties` (schema-driven property editing, binding target switching).

**Runtime overlay internals:** `runtimeState` property triggers decoration flow. On change: `toDecorations(runtimeState)` produces `Map<string, NodeDecoration>`, passed to `toReactFlowGraph(model, layout, decorations)`. Decoration-only updates (no YAML change) skip `computeElkLayout` — the `_updateWithoutLayout` path reuses the cached layout and applies fresh decorations. Full renders (YAML change) also include decorations when in runtime mode.

Mode toggle (`_mode: 'design' | 'runtime'`): defaults to `'design'`. Reverts to `'design'` only when `runtimeState` is explicitly set to `null` (checked via `changedProperties.has('runtimeState')`) — not on transient absence during refetch.

Staleness: `_staleSeconds` computed from `CaseRuntimeState.timestamp` vs `Date.now()`. Re-evaluated on each `runtimeState` update and mode change. No timer — intentionally freezes at last-known age if updates stop.

Render guard: async `_fullRender` tracks `_renderInProgress` and `_pendingRenderYaml` to handle YAML changes during ELK layout computation. Same guard covers decoration changes during layout.

### case-dependency-graph (`components/case-dependency-graph`)

Force-directed graph of case relationships using pages graph infrastructure (`computeElkLayout` with `algorithm: 'force'` + `pages-graph-canvas`). Consumes `GraphModel` from graph-core. Three built-in relationship types (parent_child, supersedes, coordination) via the relationship type registry in mosaic-core — apps register additional types with `registerRelationshipType()`. Dual data mode (endpoint fetch or `graphData` property). Edge type filter toolbar with DOT export. Node click emits selection topic events.

### document-workbench (`components/document-workbench`)

Document review workbench panels for AI-assisted document review. Nine LitElement components:

**DebateFeed** (`<debate-feed>`) — streaming debate entry viewer with round dividers, auto-scroll. Receives entries via `debate-entries` pages-event. Agent roles: REV, IMP, HUMAN, SUPERVISOR, MODERATOR, SELECTOR. Entry types: RAISE, AGREE, COUNTER, DISPUTE, QUALIFY, FLAG_HUMAN, DECLINED, MEMO, SUB_TASK_REQUEST/FINDING/ERROR, RESTART_CONTEXT, COMMENT, HUMAN_OVERRIDE, REPRIORITISE, VERIFIED, DEFERRED. Entries with `pointId` emit `point-selected` on click. CSS colour-codes entries by type (border-left colours, opacity for declined, warning banner for FLAG_HUMAN, indented for sub-tasks).

**DocumentDiff** (`<document-diff>`) — side-by-side markdown diff viewer. Split and unified view modes. Line-level LCS diff with adjacent del+ins coalesced into mod chunks. Word-level diff highlighting within modified chunks. Scroll sync via heading-matched anchor interpolation. Minimap canvas in the divider gutter (red=deleted, green=inserted). Diff navigation (nextDiff/prevDiff with wrap-around). Drag-and-drop file loading. `loadFile(panel, path)` fetches via REST, `loadContent(panel, content, label)` for inline data. `scrollToLocation(location)` with heading fuzzy-match (numeric sections, substring, word overlap). `highlightSection(location)` adds vertical accent bar. `selection-changed` event for text selection. Listens to `timeline-comparison-changed` for snapshot pair loading. Uses marked for markdown rendering.

**DocumentTimeline** (`<document-timeline>`) — horizontal snapshot timeline. Receives `ROUND_SNAPSHOT` entries from debate-entries. Click selects comparison range; shift-click for second endpoint. Emits `timeline-comparison-changed`. Trail highlight integration: `point-selected`/`point-deselected` events set raise/fix/verify round markers on the timeline.

**ReviewTracker** (`<review-tracker>`) — review point tracker derived from debate entries. Derives point status from entry types (RAISE->OPEN, AGREE->AGREED, COUNTER->ACTIVE, DISPUTE->DISPUTED, QUALIFY->ACTIVE, FLAG_HUMAN->PENDING_HUMAN, DECLINED->DECLINED, VERIFIED->VERIFIED, DEFERRED->DEFERRED, HUMAN_OVERRIDE->HUMAN_OVERRIDE). Progress bar (resolved/total). Filter toggle (hide resolved). Per-point actions: comment (POST to `human/comment`), override (POST to `human/override`), priority change (POST to `human/prioritise`). Batch accept/defer for low-priority points (POST to `human/batch`). Agent trail display. Point selection emits `point-selected`/`point-deselected`.

**ContextGauge** (`<context-gauge>`) — LLM context window usage. Receives `context-usage` pages-event with `effectivePercent`, `windowSizeChars`, `serverContributionChars`, `messageCount`, `agentReportedPercent`. Gauge bar with threshold colours (normal < 60%, warn < 80%, error >= 80%). Pulse animation on `thresholdExceeded`. Tooltip with detailed stats.

**DocPicker** (`<doc-picker>`) — document slot picker dropdown. Shows available documents from `documents-changed` events. A/B slot buttons for comparison selection. Posts comparison changes to `api/debate/{sessionId}/comparison`. Visible only when documents exist.

**BrainstormOptions** (`<brainstorm-options>`) — brainstorm option cards. Receives `brainstorm-options`, `brainstorm-converged`, `brainstorm-ended` events. Status badges (LIVE/RECOMMENDED/EXPLORED/ELIMINATED/SELECTED). Actions: recommend, eliminate, select (PATCH to `api/brainstorm/{sessionId}/options/{optionId}`). Converged/ended banners.

**BrainstormPicker** (`<brainstorm-picker>`) — brainstorm session switcher. Lists sessions from `brainstorm-sessions` events. Emits `brainstorm-session-selected`.

**WorkspaceStatus** (`<workspace-status>`) — agent workspace progress. Receives `workspace-progress` events. Progress types: AGENT_START, AGENT_STATUS, AGENT_COMPLETE, ISSUES_RAISED, ROUND_COMPLETE, REVIEW_TERMINAL. Elapsed timer, cost display, pulsing/terminal status dot.

All panels follow the `configure(props)` pattern for hostPanel integration and use `onPagesEvent` for data flow. All listen for `reconnected` to reset state on SSE reconnect.

### work-item-row (`components/work-item-row`) — DEPRECATED

Single work item row component. Legacy — inbox now uses pages-table. Do not use in new code.

### agent-catalog (`components/agent-catalog`)

Agent template catalog — browsable grid of pre-built agent configurations derived from `PROFESSION_PRESETS` (8 professions, 42 roles, ~120 variants). `CATALOG_TEMPLATES` / `FEATURED_TEMPLATES` static data, `buildDescriptor(template)` constructs a `FullAgentDescriptor`. Profession pill filters, fuzzy search, featured picks section, responsive card grid with inline detail expansion. `collection` property for avatar style, `groupBy` property (`'role' | 'family'`) for pluggable grouping strategy. Emits `catalog:template:selected` with `FullAgentDescriptor`.

### agent-manifest-editor (`components/agent-manifest-editor`)

Agent manifest editor — LLM provider/model/credential configuration. `ManifestProviderCard` sub-component for per-provider UI. `PRESETS` with built-in provider templates (Anthropic/OpenAI/Google/Ollama). `PROVIDER_DEFAULTS` / `OTHER_PROVIDER_DEFAULTS` for provider-specific inference ranges. Progressive disclosure provider cards, credential editing (env/file/ref + dev-mode inline), model picker with tier grouping and capability badges, model alias configuration, per-model inference sliders. Test connection with persistent badges. Manifest YAML preview. Host + sub-component architecture.

### agent-personality-workbench (`components/agent-personality-workbench`)

Agent personality workbench — tabbed composition of `agent-catalog` (Templates) and `avatar-step` (Advanced) with shared `agent-profile-panel`. Custom CSS grid layout with responsive stacking. Event-up/property-down state coordination. Tab keyboard navigation. Collection bar, group toggle (By Role/By Family), detail header pass-through. Emits `personality:confirmed` with `PersonalityProfile` + archetype.

### agent-profile (`components/agent-profile`)

Agent profile — read-only agent profile display with avatar, name, archetype/profession badges, SVG radar chart for disposition axes, framework pills, and description text. Receives `FullAgentDescriptor` and `PersonalityProfile` as properties. Uses `deriveDispositions` from avatar-step. Purely presentational — no editing, no events.

### agent-profile-panel (`components/agent-profile-panel`)

Agent profile panel — editable personality profile display with profession/role/framework pickers (MBTI, Enneagram, DISC, SDI, Belbin, Big Five), lock toggles, disposition axes, behavioral tendencies. Detail header (avatar, name, archetype, description, alias, summary) when template selected. `archetypeRoles` badge list. Stateless: all data via properties, all edits via events (`profile:value:changed`, `profile:lock:changed`, `profile:reset`, `personality:confirmed`).

### agent-relationship-editor (`components/agent-relationship-editor`)

Agent relationship editor — three-tab view (Table/Arc/Diagram) for org relationships. `ArcView` sub-component for SVG focal-agent arc diagram. Table: grouped-by-kind CRUD with avatar thumbnails and profession badges via `agents` property. Diagram: readonly `org-diagram` composed via `toOrgYaml` bridge, live pending changes, click-to-focus bidirectional interaction. Emits `relationship:changed` with `RelationshipChangeset`.

### avatar-step (`components/avatar-step`)

Avatar personality wizard step — faceted personality selector (6 frameworks: MBTI, Enneagram, DISC, Belbin, SDI, Big Five), profession presets (8 professions, 42 roles via `PROFESSION_PRESETS`). Split-panel profile configurator with hover-to-edit and lock. 4 avatar collections (Mythic/Chibi/Donut Creek/Neon), 12×4 archetype grid with three-tier filtering + profession ghosting + role-match highlighting. External `collection` property (hides internal bar when set). Exports: `getCompatibleArchetypes`, `getValidFrameworkValues`, `initProfile`, `deriveDispositions`, `deriveTendencies`, `buildSummaryText`, `FRAMEWORK_LABELS`, `FRAMEWORK_TOOLTIPS`, `DISPOSITION_TIPS`. Types: `PersonalityFramework`, `AxisScore`, `BehavioralTendency`, `ProfessionRole`, `RoleVariant`.

### case-flow-viewer (`components/case-flow-viewer`)

Read-only case flow DAG viewer — the viewer counterpart to `casehub-diagram`. Element tag: `<agency-case-flow-viewer>`. Extends `DiagramBaseMixin` in readonly mode, composes `toGraph` + `toDecorations` from graph-stencil-case. Trust score pills, adaptive decision badges, parallel group ELK partitioning. `AgencyCaseFlowToolbar` sub-component with stats, staleness, case status badge, SVG/PNG export. Properties: `yaml`, `src`, `runtimeState`, `selectionTopic`.

### swf-diagram (`components/swf-diagram`)

Standalone SWF workflow diagram — extends `DiagramBaseMixin` from `@casehubio/pages-diagram-core`. Delegates to `graph-stencil-swf` for adapter (`toSwfGraph`), property editing (`applySwfPropertyEdit`), and structural editing (`addSwfTask`, `insertSwfTask`, `spliceSwfTask`, `removeSwfTask`, `moveSwfTask`). `createSwfEditPolicy()` provides edit constraints. Custom `computeSwfLayout` for SWF-specific ELK layout. Detects diagram type via `detectDiagramType` from mosaic-core.

### org-diagram (`components/org-diagram`)

Eidos org structure diagram — extends `DiagramBaseMixin` from `@casehubio/pages-diagram-core`. Element tag: `<agency-org-diagram>`. `OrgLayoutEngine`-driven layout (10 strategies via ELK), org-specific toolbar with layout dropdown and archetype badge, stencil palette, property panel. Sub-panels: escalation chain, supervision hierarchy, attestation grants, legend (chip bar toggles ESC/SUP/ATT/LGD). `OrgEdgeTooltip` and `OrgTooltip` for hover detail. Full structural editing via graph-stencil-org YAML editor functions. `enrichWithDescriptors` + `computeDerivedData` for agent descriptor overlay. `applyCollapsedUnits`, `applyOrgEdgeLabels`, `applySelectionHighlight` for visual transforms.

### htn-diagram (`components/htn-diagram`)

HTN plan diagram — extends `DiagramBaseMixin` from `@casehubio/pages-diagram-core`. Element tag: `<htn-diagram>`. Readonly diagram for HTN plan YAML. Delegates to `htnYamlToGraph` from graph-stencil-htn for adapter. `layoutDirection` property (`'DOWN' | 'RIGHT'`). No structural editing (read-only). Detects diagram type via `detectDiagramType`.

### diagram-workbench (`components/diagram-workbench`)

Diagram workbench — split-pane composition of `casehub-diagram` + `swf-diagram`. Click worker node to drill down from case diagram to SWF workflow via `diagram:worker-drill-down` event. Three consumption tiers.

### event-trail (`components/event-trail`)

Event trail — re-exports `@casehubio/pages-ui-components/event-trail`. The actual implementation lives in pages; this package exists as a mosaic entry point for backward compatibility. Provides pages-filter-bar + pages-table with DataSourceMixin lifecycle, client-side chip/entity filtering, server-side date range params, dual data mode (endpoint or inline), `data-loaded` event for raw entry access.

### execution-monitor (`components/execution-monitor`)

Execution monitor — EventStreamController-driven live execution state for orchestration framework. State badge, pattern badge, execution model summary, agent roster. Dual data mode (endpoint or property). Staleness detection. `ExecutionMonitorTopics` for event coordination.

### orchestration-workbench (`components/orchestration-workbench`)

Orchestration workbench — composes `execution-monitor` + `agency-timeline` with orchestration-events strategy in split-workbench. Three consumption tiers (standalone, panel-hosted, inline data).

### worker-task-pane (`components/worker-task-pane`)

Worker task pane — generic specialist task queue with context tabs (`TabDefinition[]`), workspace element registry (`WorkspaceDefinition[]`), response/claim/decline form. Extends `LiveRegionMixin`. Direct fetch (no DataSourceMixin) like work-item-inbox. Optional push via `eventStreamEndpoint` + `EventStreamController`. `WorkerTaskEventTopics` for event coordination. Types: `WorkspaceDefinition`, `WorkerTaskResponse`, `WorkerTaskSubmission`, `WorkerTaskClaimRequest`, `WorkerTaskContext`.

### cluster-panel (`components/cluster-panel`)

Cluster management panel — cluster list, registration form, connectivity test, delete. `ClusterPanelTopics` for event coordination. Dual data mode. Readonly mode.

### service-card (`components/service-card`)

Per-service health card — status badge, replicas, image, per-cluster deployment status. `ServiceCardTopics` for event coordination. Dual data mode.

### reconciliation-status (`components/reconciliation-status`)

Desired vs actual reconciliation — per-cluster sections with per-node status grid. EventStreamController push updates. `ReconciliationStatusTopics` for event coordination.

### dimension-dashboard (`components/dimension-dashboard`)

Multi-dimension status dashboard — N dimensions with severity badges, active response counts, compact layout. `DimensionDashboardTopics` for event coordination. Dual data mode.

### topology-viewer (`components/topology-viewer`)

Service dependency DAG — topology graph with status-coloured nodes, replica badges, edge labels. EventStreamController push updates. `TopologyViewerTopics` for event coordination.

### evolution-config (`components/evolution-config`)

Evolution conductor components — five sub-components:
- `DenyPatternEditor` — static + dynamic deny pattern CRUD, stream preview
- `WatchPatternEditor` — escalation patterns
- `GatePolicyEditor` — per-stage GATED/AUTO/NOTIFY, impact preview
- `EvolutionStreams` — improvement stream table with block/unblock
- `EvolutionInbox` — conductor inbox table with approve/reject
Shared `EvolutionApi` for REST calls, `EvolutionEventTopics` + `emitEvolutionEvent` for event coordination. Dual data mode.

### evolution-workbench (`components/evolution-workbench`)

Evolution conductor dashboard — KPI summary bar (health, active, inbox, circuit breaker, enabled) + tabbed content via detail-pane `renderContent` callbacks (Streams, Inbox, Audit, Configuration, Health). Domain-extensible via `TabDefinition[]`. CSS container queries for responsive layout. Three consumption tiers.

### summarisation-timeline (`components/summarisation-timeline`)

Summarisation pipeline timeline — four-lane viewer (L1 raw events, L2 episodes, L3 phases, L4 narrative) with density clustering, SVG lineage overlay, brush zoom minimap, and click-to-inspect tooltips. Element tag: `<agency-summarisation-timeline>`. Shell composes lane sub-components (`lane-l1`, `lane-l2`, `lane-l3`, `lane-l4`, `minimap`) via `TimeAxisController`. `DataSourceMixin` for endpoint-driven data. Inline data via `data` property (`SummarisationSnapshot`). `narrativeEndpoint` for fetching decision narrative. `classificationColours` for per-classification colour overrides. Hover-to-show tooltips, click to pin, Escape to dismiss.

### narrative-timeline (`components/narrative-timeline`)

Decision narrative timeline — vertical timeline displaying step-by-step agent decision summaries. Element tag: `<agency-narrative-timeline>`. Uses `DataSourceMixin`. Renders `StepDecisionSummary` items with signal badges (ROUTING/CBR/TRUST/DELIBERATION/STEP_OUTCOME with per-type icons and colours), optional `SignalDigest` detail expansion, and a narrative explanation block. Designed for orchestration flow explanation.

### completeness-matrix (`components/completeness-matrix`)

Project completeness matrix — grid showing completion status (done/partial/missing) across four signals (exists, configured, tested, deployed) for a set of dimensions. Element tag: `<agency-completeness-matrix>`. Dual data mode (property or endpoint). `compact` mode for dashboard embedding. ARIA `role="region"`.

### project-dashboard (`components/project-dashboard`)

Project dashboard — card-based grid layout showing layer health summaries. Element tag: `<agency-project-dashboard>`. `overallHealth(layers)` utility function. Health colours (healthy/degraded/incomplete). `selectionTopic` for layer drill-down. `ProjectDashboardTopics` for event coordination. Dual data mode. `compact` mode.

### desired-state-graph (`components/desired-state-graph`)

Desired state graph viewer — visualises `DesiredStateSnapshot` as a DAG using `pages-graph-canvas` with ELK layout. Element tag: `<agency-desired-state-graph>`. Adapter functions: `desiredStateToGraph(snapshot)` → `DesiredStateAdapterResult`, `desiredStateToDecorations(snapshot)` → decorations map. `DesiredStateToolbar` sub-component. `selectionTopic` for node selection events.

### contributor-workbench (`components/contributor-workbench`)

Contributor workbench — split-workbench for contributor detail views. Element tag: `<agency-contributor-workbench>`. Left panel shows intake classification (lane badge: FAST_TRACK/STANDARD/TRIAGE with reason), dimension scores, and trust score via `trust-score-panel`. Right panel shows outcome history via `pages-table` with `fromRows`. Extends `LiveRegionMixin`. Direct fetch from `endpoint`/`actorId` properties.

---

## Known Gotchas

### Shadow DOM select

The `<select>` element inside Shadow DOM can silently reset to the first option when `.value` is set before `<option>` children have rendered. The gdpr-erasure-action component demonstrates the workaround: dispatch a `change` event explicitly after setting the value programmatically.

### Portal resolution ordering

Yarn portal resolutions in root `package.json` must match the actual directory structure in `.casehub-packages/`. If a new pages package is added upstream, add a corresponding portal resolution here or the build will fail with unresolved peer dependencies.

### agency- prefix convention

All custom element tag names use the `agency-` prefix (renamed from `blocks-` in #279). When adding new components, register with `@customElement('agency-<name>')`. The document-workbench panels are an exception — they use unprefixed names (`<debate-feed>`, `<document-diff>`, etc.) because they predate the convention.

---

## Depended On By

Application repos embed components via `hostPanel` + `registerPanel` in their pages dashboards. Each application's dashboard composes mosaic components into domain-specific layouts.

Key consumers by component:
- **split-workbench + list-pane + detail-pane:** openclaw, devtown, aml, clinical, drafthouse, life, soc, ops
- **grouped-data-view:** clinical, aml
- **channel-activity:** drafthouse, claudony, devtown, clinical
- **notification-inbox:** all applications (platform-level feature)
- **audit-trail-viewer:** aml, clinical, devtown, life, soc
- **agency-timeline:** aml, clinical, life, ops, drafthouse, devtown
- **trust-score-panel:** aml, devtown, clinical, life, ops
- **document-workbench:** drafthouse (document review workflow)

---

## Current State

TypeScript/Yarn workspace monorepo with TypeScript project references. Yarn 4.10.3. All Yarn workspace with no build-time configuration.

Build commands:

```bash
yarn install
yarn build            # topological build across all workspaces
yarn test             # run tests across all workspaces
yarn typecheck        # tsc --build
yarn examples         # start Vite showcase server
```

Test framework: Vitest with jsdom environment.

---

## Design Documents

- [UI Architecture](https://raw.githubusercontent.com/casehubio/parent/main/docs/platform/ui-architecture.md) — pages, mosaic, app layering
- [Platform Index](https://raw.githubusercontent.com/casehubio/parent/main/docs/INDEX.md) — discovery index
- `docs/specs/` — design specs for individual features (23+ specs since July 2026)
- `docs/plans/` — implementation plans
- `docs/blog/` — technical diary entries
