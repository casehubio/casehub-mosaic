# Decisions — #218 Unified Personality Selector

## D1: Component strategy — rework workbench in-place

**Choice:** Rewrite `agent-personality-workbench` to replace its two-tab layout with a single unified view. Keep `agent-catalog` and `avatar-step` as standalone components.
**Alternatives:**
- Refactor catalog to absorb avatar-step functionality — breaks catalog's standalone API, couples concerns
- New component replacing workbench — unnecessary duplication, workbench name is already correct
**Rationale:** The workbench is the composition shell. The tabs are its internal layout choice. Removing tabs and building a unified grid inline is a smaller change than restructuring the underlying components. Other consumers (standalone catalog embeds, avatar-step in agent setup wizard) are unaffected.
**Trade-offs:** The workbench grows larger since it owns the unified grid, filter bar, and grouping logic directly rather than delegating to children.
**Sources:** components/agent-personality-workbench/src/agent-personality-workbench.ts, components/agent-catalog/src/agent-catalog.ts, components/avatar-step/src/avatar-step.ts
**Exploration:** quick
**Status:** captured

## D2: Data model — unified item from catalog templates

**Choice:** The unified grid renders `CatalogTemplate` items (from `catalog-templates.ts`) because each template already maps to an archetype + profession + role. The compatibility matrix provides tiering via `getCompatibleArchetypes()`.
**Alternatives:**
- Start from raw archetypes (48 items) and annotate with template metadata — requires reverse-mapping archetypes to templates, more complex
- Create a new merged data structure — unnecessary abstraction, both data sources already exist
**Rationale:** `CATALOG_TEMPLATES` already contains ~120 items with archetype, profession, role, and personality data. `getCompatibleArchetypes()` returns a `Map<string, MatchTier>` for any personality selection. Combining these gives us groupable, filterable, tier-annotated items directly.
**Trade-offs:** Items without catalog templates (raw archetypes not in any profession preset) won't appear in the grid. This is acceptable — the catalog is the curated set.
**Sources:** components/agent-catalog/src/data/catalog-templates.ts, components/avatar-step/src/filter.ts, components/avatar-step/src/data/compatibility-matrix.ts
**Exploration:** quick
**Status:** captured

## D3: Grid grouping — toggle between role groups and archetype family groups

**Choice:** A toggle button switches between two grouping modes. "By Role" groups items as `profession > role` (current catalog layout). "By Archetype Family" groups by the 12 archetype families (Sage, Hero, Magician, etc.).
**Alternatives:**
- Fixed role-only grouping — loses the archetype exploration UX from avatar-step
- Collection-based grouping (Mythic/Chibi/Donut Creek/Neon) as primary — collections are visual style, not personality, better as a bar filter
**Rationale:** The issue spec calls for exactly this toggle. Both groupings exist in the current components (role groups in catalog, archetype families in avatar-step). The toggle bridges the two UX patterns.
**Trade-offs:** Two render paths to maintain. Mitigated by sharing the card rendering and only varying the grouping/heading logic.
**Sources:** Issue #218 design spec
**Exploration:** quick
**Status:** captured

## D4: Profile panel — reuse agent-profile-panel as-is

**Choice:** Keep `agent-profile-panel` on the right side, same as #217. The detail panel described in the issue (avatar picture, archetype name, professions/roles, full profile, reset/select) maps directly to the existing profile panel.
**Alternatives:**
- Build detail display inline in the workbench — duplicates profile panel rendering
- Create a new detail component — the profile panel already does exactly this
**Rationale:** The profile panel was designed for this exact use case in #217 — stateless display with event-driven editing. The only addition is showing "all professions/roles this archetype appears in," which can be computed from the catalog templates data and passed as a property.
**Trade-offs:** None significant. The profile panel may need a small addition (roles list display) but no structural changes.
**Sources:** components/agent-profile-panel/src/agent-profile-panel.ts
**Exploration:** quick
**Status:** captured

## D5: Facet filter — hidden by default, toggle to expand

**Choice:** A "Filters" button next to the profession/role pills toggles a collapsible section showing framework pill rows (MBTI, Enneagram, DISC, SDI, Belbin, Big Five). Selecting any framework value calls `getCompatibleArchetypes()` to compute tiering.
**Alternatives:**
- Always-visible filter panel — takes too much vertical space
- Sidebar filter panel — conflicts with the detail panel on the right
**Rationale:** The issue spec says "hidden by default." The pill rows from avatar-step's `_renderProfileSection` can be extracted into a compact filter section. The compatibility matrix already provides the tiering function.
**Trade-offs:** One extra click to access framework filtering. Acceptable since most users will browse by profession/role first.
**Sources:** Issue #218 design spec, components/avatar-step/src/data/compatibility-matrix.ts
**Exploration:** quick
**Status:** captured

## D6: Fix review findings from #217

**Choice:** Fix the 4 code-review findings from #217 as part of this work, since we're reworking the same components.
**Alternatives:**
- File as separate issues — overhead for small fixes in files we're already editing
**Rationale:** The findings (Escape key handler on tip dialog, invalid DISC test values, `as any` in disposition-mapping, dense Belbin template) are in files being modified by this issue.
**Trade-offs:** Slightly expands scope, but the fixes are trivial.
**Sources:** Code review findings from #217 work-end
**Exploration:** quick
**Status:** captured