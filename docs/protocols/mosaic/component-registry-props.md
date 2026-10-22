---
id: PP-20260907-fd8ee7
title: "Every agency-* component must export a Props interface and register in AgencyComponentRegistry"
type: rule
scope: repo
applies_to: "Any new @customElement('agency-*') component in components/"
severity: important
refs:
  - packages/mosaic-schema/src/registry.ts
  - packages/mosaic-schema/src/registry-completeness.test.ts
violation_hint: "registry-completeness.test.ts fails — an agency-* element exists without a registry entry"
created: 2026-09-07
---

New components must export a typed `FooProps` interface from their index.ts and
add a corresponding entry to `AgencyComponentRegistry` in
`packages/mosaic-schema/src/registry.ts`. The completeness test verifies
every `agency-*` custom element has a registry entry — CI fails if one is missing.
After adding the entry, run `yarn workspace @casehubio/mosaic-schema run generate`
to regenerate the Zod schemas.
