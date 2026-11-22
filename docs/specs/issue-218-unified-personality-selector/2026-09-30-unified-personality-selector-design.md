# Design: Unified Personality Selector (#218)

## Problem

The agent-personality-workbench (#217) uses a two-tab layout (Templates / Advanced) that is redundant. Both tabs show archetype grids with personality data — the Templates tab via `agent-catalog` (grouped by profession/role) and the Advanced tab via `avatar-step` (grouped by collection). A single unified view with grouping and filtering controls replaces both.

## Approach

Rework `agent-personality-workbench` in-place. Remove the tab bar, tab panels, and direct usage of `agent-catalog` and `avatar-step` as children. Replace with a unified grid that combines catalog template data with the compatibility matrix tiering system. Keep `agent-catalog` and `avatar-step` as standalone components for other consumers.

## Architecture

### Layout

```
+-------------------------------------------+------------------------+
|  Collection bar  [Mythic] [Chibi] [DC] [N] |                        |
|  Group toggle: [By Role] / [By Family]     |   Avatar SVG           |
|  Profession pills: [Eng] [Med] [Legal] ... |                        |
|  Role pills (when profession selected)     |   Archetype Name       |
|  [Filters v] (toggle facet filter)         |   Family / Sub         |
|                                            |   Professions/Roles    |
|  === Group Heading ==================      |                        |
|  [avatar] [avatar] [avatar] [avatar]       |   Personality Profile   |
|  [avatar] [avatar]                         |   (frameworks, axes,   |
|                                            |    tendencies)          |
|  === Group Heading (ghosted) =========     |                        |
|  [ghost]  [ghost]  [ghost]                 |   [Reset] [Select]     |
+-------------------------------------------+------------------------+
```

### Component tree

```
agent-personality-workbench
  ├── collection-bar (inline — 4 pills)
  ├── group-toggle (inline — 2 radio buttons)
  ├── profession-pills (inline — from PROFESSION_LIST)
  ├── role-pills (inline — from PROFESSION_PRESETS[profession].roles)
  ├── facet-filter (inline, collapsible — framework pill rows)
  ├── avatar-grid (inline — grouped cards with tiering)
  └── agent-profile-panel (existing component, right column)
```

All filter/group/grid UI is inline in the workbench (no new child components). The profile panel remains a separate component.

### Data flow

1. **Source data:** `CATALOG_TEMPLATES` (~120 items) provides archetype + profession + role + personality. `listCollections()` from `agent-avatar-2d` provides collection options.

2. **Filter pipeline:**
   ```
   CATALOG_TEMPLATES
     → filter by collection (Mythic/Chibi/Donut Creek/Neon)
     → filter by profession (mutually exclusive radio)
     → filter by roles (multi-select, 0 = all)
     → filter by framework values (facet filter)
     → compute tiering via getCompatibleArchetypes()
     → group by (role | archetype family)
     → sort: strong first, weak middle, incompatible ghosted at bottom
   ```

3. **State model (workbench):**
   - `_collection: string` — active collection (default: first from `listCollections()`)
   - `_groupBy: 'role' | 'family'` — grouping mode
   - `_profession: string | null` — selected profession
   - `_roles: Set<string>` — selected roles (empty = all)
   - `_facetsExpanded: boolean` — filter panel visibility
   - `_frameworkSelections: Record<PersonalityFramework, string | null>` — framework filter values
   - `_bigFiveSelections: Record<BigFiveDimension, BigFivePole | null>` — Big Five filter values
   - `_profile: PersonalityProfile | null` — working profile
   - `_archetype: { family, subArchetype } | null` — selected archetype
   - `_locked: Set<string>` — locked profile fields

4. **Events emitted:**
   - `personality:confirmed` — same as #217 (profile + archetype payload)

### Grid rendering

Each card in the grid shows:
- Avatar SVG (from `agent-avatar-2d`, using the active `_collection`)
- Archetype label (variant label from catalog template)
- Brief description
- Tier indicator (border color: strong=accent, weak=neutral, incompatible=ghosted)

Cards are grouped under headings:
- **By Role:** `Profession > Role` headings (same as current catalog layout)
- **By Family:** `Archetype Family` headings (Sage, Hero, Magician, etc.)

Within each group, cards are sorted by tier: strong first, weak middle, incompatible last. Incompatible cards get reduced opacity (0.35) and sink to the bottom of their group.

### Tiering computation

When framework filters are active (any non-null value in `_frameworkSelections` or `_bigFiveSelections`):

```typescript
const tiers = getCompatibleArchetypes(frameworkSelections, bigFiveSelections);
// Returns Map<archetypeKey, 'strong' | 'weak' | 'incompatible'>
```

Each card's archetype key is looked up in this map. Cards without a tier entry default to 'weak'.

When no framework filters are active, all cards render without tiering (uniform appearance).

### Detail panel

The right column uses `agent-profile-panel` with one addition: a roles list showing all professions/roles this archetype appears in. This is computed by filtering `CATALOG_TEMPLATES` for the selected archetype.

The profile panel receives:
- `.profile` — the working personality profile
- `.archetype` — the selected archetype
- `.locked` — locked field set
- `.showConfirmButton` — true when profile and archetype are set
- `.archetypeRoles` — new property: array of `{ profession, role }` for the selected archetype

### What stays, what goes

| Component | Change |
|-----------|--------|
| `agent-personality-workbench` | Major rework — remove tabs, add unified grid |
| `agent-profile-panel` | Minor — add `archetypeRoles` property display |
| `agent-catalog` | No changes — kept as standalone |
| `avatar-step` | No changes — kept as standalone |
| `agent-avatar-2d` | No changes — used for rendering |

### Fix #217 review findings

As part of this work, fix the 4 findings from #217's code review:
1. Add Escape key handler to tip dialog in `agent-profile-panel`
2. Fix invalid DISC value `'CD'` in tests (use `'C'`)
3. Replace `{} as any` in `disposition-mapping.ts` with proper typing
4. Extract dense Belbin `.reduce()` in profile panel to a private method

## ARIA

The unified view maintains ARIA from the existing components:
- Collection bar: `role="radiogroup"` with `aria-label="Avatar collection"`
- Group toggle: `role="radiogroup"` with `aria-label="Group by"`
- Profession pills: `role="listbox"` with `aria-label="Filter by profession"` (from catalog)
- Role pills: `role="listbox"` with `aria-label="Filter by role"`, `aria-multiselectable="true"`
- Facet filter: `role="region"` with `aria-expanded` on toggle button
- Grid groups: `role="group"` with `aria-label` per group heading
- Cards: focusable, `role="option"`, `aria-selected` for the active card

## Testing

- Filter pipeline: unit tests for each filter stage (collection, profession, role, framework)
- Tiering: unit tests verifying `getCompatibleArchetypes()` integration
- Grouping: unit tests for both grouping modes with correct sort order
- Profile panel: test `archetypeRoles` rendering
- ARIA: assertions on role, aria-label, aria-selected, aria-expanded
- Edge cases: no matching templates, all incompatible, profession with no roles

## References

- Issue #218 design specification
- components/agent-personality-workbench/src/agent-personality-workbench.ts — current workbench
- components/agent-catalog/src/agent-catalog.ts — catalog template browsing
- components/avatar-step/src/filter.ts — `getCompatibleArchetypes()` tiering
- components/avatar-step/src/data/compatibility-matrix.ts — framework-family mappings
- components/avatar-step/src/data/profession-presets.ts — profession/role/variant data
- components/agent-profile-panel/src/agent-profile-panel.ts — profile display
- docs/protocols/blocks-ui/custom-event-namespace-prefix.md — event naming convention
- docs/protocols/blocks-ui/component-registry-props.md — registry requirement