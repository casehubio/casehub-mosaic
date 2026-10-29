import type { DesiredStateSnapshot, DesiredStateNodeStatus } from '@casehubio/mosaic-core';
import type { GraphNode, GraphEdge, NodeDecoration } from '@casehubio/graph-core';
import type { DesiredStateAdapterResult } from './types.js';

const PREFIX = 'ds:';

const STATUS_BORDER: Record<DesiredStateNodeStatus, { style: string; color: string }> = {
  CONVERGED:    { style: 'solid',  color: '#a6e3a1' },
  PENDING:      { style: 'solid',  color: '#89b4fa' },
  DRIFTED:      { style: 'solid',  color: '#f9e2af' },
  FAULTED:      { style: 'solid',  color: '#f38ba8' },
  PROVISIONING: { style: 'solid',  color: '#89b4fa' },
  ABSENT:       { style: 'dashed', color: '#6c7086' },
};

export function desiredStateToGraph(snapshot: DesiredStateSnapshot): DesiredStateAdapterResult {
  const nodeIds = new Set(snapshot.nodes.map(n => n.id));
  const nodes: GraphNode[] = snapshot.nodes.map(n => ({
    id: `${PREFIX}${n.id}`,
    type: 'desired-state',
    properties: {
      name: n.name,
      nodeType: n.type,
      status: n.status,
      desired: n.desired,
      actual: n.actual,
    },
  }));

  const edges: GraphEdge[] = [];

  for (const node of snapshot.nodes) {
    for (const dep of node.dependsOn) {
      if (nodeIds.has(dep)) {
        edges.push({
          id: `dep:${node.id}:${dep}`,
          source: `${PREFIX}${node.id}`,
          target: `${PREFIX}${dep}`,
          type: 'depends-on',
          properties: { label: 'dependsOn' },
        });
      }
    }
    if (node.forEachSource != null && nodeIds.has(node.forEachSource)) {
      edges.push({
        id: `fe:${node.forEachSource}:${node.id}`,
        source: `${PREFIX}${node.forEachSource}`,
        target: `${PREFIX}${node.id}`,
        type: 'for-each',
        properties: { label: 'forEach' },
      });
    }
  }

  return { model: { nodes, edges } };
}

export function desiredStateToDecorations(
  snapshot: DesiredStateSnapshot,
): ReadonlyMap<string, NodeDecoration> {
  const map = new Map<string, NodeDecoration>();
  for (const node of snapshot.nodes) {
    const border = STATUS_BORDER[node.status] ?? STATUS_BORDER.ABSENT;
    const deco: NodeDecoration = {
      border,
      ...(node.status === 'DRIFTED' && node.driftDetectedAt
        ? { badge: { icon: '⚠', color: '#f9e2af' } }
        : {}),
      ...(node.status === 'PROVISIONING'
        ? { badge: { icon: '⟳', color: '#89b4fa', pulse: true } }
        : {}),
      ...(node.convergencePercent != null
        ? { tooltip: `Convergence: ${node.convergencePercent}%` }
        : {}),
    };
    map.set(`${PREFIX}${node.id}`, deco);
  }
  return map;
}
