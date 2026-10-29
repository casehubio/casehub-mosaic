import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { DesiredStateSnapshot } from '@casehubio/mosaic-core';

vi.mock('@casehubio/graph-renderer', () => ({
  computeElkLayout: vi.fn().mockResolvedValue(new Map()),
  toReactFlowGraph: vi.fn().mockReturnValue({ nodes: [], edges: [] }),
}));

vi.mock('@casehubio/pages-data', () => ({
  emitPagesEvent: vi.fn(),
}));

import './desired-state-graph.js';
import type { DesiredStateGraph } from './desired-state-graph.js';
import './desired-state-toolbar.js';
import type { DesiredStateToolbar } from './desired-state-toolbar.js';

function makeSnapshot(nodeCount: number): DesiredStateSnapshot {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    id: `n${i}`,
    name: `node-${i}`,
    type: 'Service',
    status: i === 0 ? 'CONVERGED' as const : i === 1 ? 'DRIFTED' as const : 'PENDING' as const,
    desired: `v${i}`,
    actual: i === 1 ? `v${i}-old` : `v${i}`,
    convergencePercent: i === 0 ? 100 : 50,
    dependsOn: [] as string[],
    forEach: null,
    forEachSource: null,
    driftDetectedAt: i === 1 ? '2026-10-29T11:00:00Z' : null,
  }));
  return { nodes, lastReconciled: '2026-10-29T12:00:00Z' };
}

describe('agency-desired-state-graph', () => {
  let el: DesiredStateGraph;

  beforeEach(async () => {
    el = document.createElement('agency-desired-state-graph') as DesiredStateGraph;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('renders empty state when data is null', () => {
    expect(el.shadowRoot!.querySelector('.empty')?.textContent).toContain('No desired state data');
  });

  it('renders pages-graph-canvas when data is provided', async () => {
    el.data = makeSnapshot(3);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('pages-graph-canvas')).not.toBeNull();
  });

  it('has ARIA role img on canvas area', async () => {
    el.data = makeSnapshot(3);
    await el.updateComplete;
    const area = el.shadowRoot!.querySelector('.canvas-area');
    expect(area?.getAttribute('role')).toBe('img');
    expect(area?.getAttribute('aria-label')).toContain('converged');
  });

  it('renders toolbar with correct counts', async () => {
    el.data = makeSnapshot(3);
    await el.updateComplete;
    const toolbar = el.shadowRoot!.querySelector('agency-desired-state-toolbar') as DesiredStateToolbar;
    expect(toolbar).not.toBeNull();
    expect(toolbar.nodeCount).toBe(3);
    expect(toolbar.convergedCount).toBe(1);
    expect(toolbar.driftedCount).toBe(1);
  });

  it('hides canvas and shows empty when data set to null', async () => {
    el.data = makeSnapshot(2);
    await el.updateComplete;
    el.data = null;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.empty')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('pages-graph-canvas')).toBeNull();
  });
});

describe('agency-desired-state-toolbar', () => {
  let el: DesiredStateToolbar;

  beforeEach(async () => {
    el = document.createElement('agency-desired-state-toolbar') as DesiredStateToolbar;
    el.nodeCount = 5;
    el.convergedCount = 3;
    el.driftedCount = 1;
    el.faultedCount = 1;
    el.lastReconciled = new Date().toISOString();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => el.remove());

  it('shows node count', () => {
    expect(el.shadowRoot!.textContent).toContain('5 nodes');
  });

  it('shows converged count', () => {
    expect(el.shadowRoot!.textContent).toContain('3 converged');
  });

  it('shows drifted count', () => {
    expect(el.shadowRoot!.textContent).toContain('1 drifted');
  });

  it('shows faulted count', () => {
    expect(el.shadowRoot!.textContent).toContain('1 faulted');
  });

  it('has ARIA role status', () => {
    expect(el.getAttribute('role')).toBe('status');
  });

  it('has aria-live polite', () => {
    expect(el.getAttribute('aria-live')).toBe('polite');
  });
});
