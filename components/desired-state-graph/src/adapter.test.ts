import { describe, it, expect } from 'vitest';
import type { DesiredStateSnapshot, DesiredStateNode } from '@casehubio/mosaic-core';
import { desiredStateToGraph, desiredStateToDecorations } from './adapter.js';

function makeNode(overrides: Partial<DesiredStateNode> = {}): DesiredStateNode {
  return {
    id: 'node-1',
    name: 'web-server',
    type: 'Service',
    status: 'CONVERGED',
    desired: 'replicas=3',
    actual: 'replicas=3',
    convergencePercent: 100,
    dependsOn: [],
    forEach: null,
    forEachSource: null,
    driftDetectedAt: null,
    ...overrides,
  };
}

function makeSnapshot(nodes: DesiredStateNode[]): DesiredStateSnapshot {
  return { nodes, lastReconciled: '2026-10-29T12:00:00Z' };
}

describe('desiredStateToGraph', () => {
  it('creates a GraphNode per DesiredStateNode', () => {
    const snap = makeSnapshot([makeNode({ id: 'a' }), makeNode({ id: 'b', name: 'db' })]);
    const result = desiredStateToGraph(snap);
    expect(result.model.nodes).toHaveLength(2);
    expect(result.model.nodes.map(n => n.id)).toEqual(['ds:a', 'ds:b']);
  });

  it('sets node type to desired-state', () => {
    const snap = makeSnapshot([makeNode({ id: 'a' })]);
    const result = desiredStateToGraph(snap);
    expect(result.model.nodes[0].type).toBe('desired-state');
  });

  it('stores name and status in properties', () => {
    const snap = makeSnapshot([makeNode({ id: 'a', name: 'web', status: 'DRIFTED' })]);
    const result = desiredStateToGraph(snap);
    expect(result.model.nodes[0].properties.name).toBe('web');
    expect(result.model.nodes[0].properties.status).toBe('DRIFTED');
  });

  it('creates depends-on edges from dependsOn array', () => {
    const snap = makeSnapshot([
      makeNode({ id: 'app', dependsOn: ['db'] }),
      makeNode({ id: 'db', name: 'database' }),
    ]);
    const result = desiredStateToGraph(snap);
    const edge = result.model.edges.find(e => e.type === 'depends-on');
    expect(edge).toBeDefined();
    expect(edge!.source).toBe('ds:app');
    expect(edge!.target).toBe('ds:db');
  });

  it('creates for-each edges from forEachSource', () => {
    const snap = makeSnapshot([
      makeNode({ id: 'template', name: 'worker-template', forEach: 'worker' }),
      makeNode({ id: 'worker-1', name: 'worker-1', forEachSource: 'template' }),
      makeNode({ id: 'worker-2', name: 'worker-2', forEachSource: 'template' }),
    ]);
    const result = desiredStateToGraph(snap);
    const forEachEdges = result.model.edges.filter(e => e.type === 'for-each');
    expect(forEachEdges).toHaveLength(2);
    expect(forEachEdges.every(e => e.source === 'ds:template')).toBe(true);
  });

  it('handles empty snapshot', () => {
    const result = desiredStateToGraph(makeSnapshot([]));
    expect(result.model.nodes).toHaveLength(0);
    expect(result.model.edges).toHaveLength(0);
  });

  it('ignores dependsOn references to missing node IDs', () => {
    const snap = makeSnapshot([makeNode({ id: 'app', dependsOn: ['nonexistent'] })]);
    const result = desiredStateToGraph(snap);
    expect(result.model.edges).toHaveLength(0);
  });
});

describe('desiredStateToDecorations', () => {
  it('maps CONVERGED to green border', () => {
    const snap = makeSnapshot([makeNode({ id: 'a', status: 'CONVERGED' })]);
    const decos = desiredStateToDecorations(snap);
    expect(decos.get('ds:a')?.border?.color).toBe('#a6e3a1');
  });

  it('maps DRIFTED to yellow border with badge', () => {
    const snap = makeSnapshot([makeNode({ id: 'a', status: 'DRIFTED', driftDetectedAt: '2026-10-29T11:00:00Z' })]);
    const decos = desiredStateToDecorations(snap);
    expect(decos.get('ds:a')?.border?.color).toBe('#f9e2af');
    expect(decos.get('ds:a')?.badge?.icon).toBe('⚠');
  });

  it('maps FAULTED to red border', () => {
    const snap = makeSnapshot([makeNode({ id: 'a', status: 'FAULTED' })]);
    const decos = desiredStateToDecorations(snap);
    expect(decos.get('ds:a')?.border?.color).toBe('#f38ba8');
  });

  it('maps PENDING to blue border', () => {
    const snap = makeSnapshot([makeNode({ id: 'a', status: 'PENDING' })]);
    const decos = desiredStateToDecorations(snap);
    expect(decos.get('ds:a')?.border?.color).toBe('#89b4fa');
  });

  it('maps ABSENT to grey dashed border', () => {
    const snap = makeSnapshot([makeNode({ id: 'a', status: 'ABSENT' })]);
    const decos = desiredStateToDecorations(snap);
    expect(decos.get('ds:a')?.border?.color).toBe('#6c7086');
    expect(decos.get('ds:a')?.border?.style).toBe('dashed');
  });

  it('maps PROVISIONING to blue border with pulse badge', () => {
    const snap = makeSnapshot([makeNode({ id: 'a', status: 'PROVISIONING' })]);
    const decos = desiredStateToDecorations(snap);
    expect(decos.get('ds:a')?.badge?.pulse).toBe(true);
  });

  it('includes convergence tooltip when convergencePercent is set', () => {
    const snap = makeSnapshot([makeNode({ id: 'a', convergencePercent: 75 })]);
    const decos = desiredStateToDecorations(snap);
    expect(decos.get('ds:a')?.tooltip).toBe('Convergence: 75%');
  });
});
