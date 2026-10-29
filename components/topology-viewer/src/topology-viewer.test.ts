import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { TopologySnapshot } from './types.js';
import { toGraphModel, topologyToDecorations } from './topology-viewer.js';

vi.mock('@casehubio/graph-renderer', () => ({
  computeElkLayout: vi.fn().mockResolvedValue(new Map()),
  toReactFlowGraph: vi.fn().mockReturnValue({ nodes: [], edges: [] }),
}));

vi.mock('@casehubio/pages-data', () => ({
  emitPagesEvent: vi.fn(),
}));

vi.mock('@casehubio/pages-component', () => ({
  PushMixin: (Base: any) => Base,
}));

import './topology-viewer.js';

type TopologyViewerEl = HTMLElement & {
  data: TopologySnapshot | null;
  endpoint?: string;
  updateComplete: Promise<boolean>;
};

const SAMPLE_TOPOLOGY: TopologySnapshot = {
  services: [
    { id: 'order-api', name: 'Order API', status: 'RUNNING', replicas: 3, image: 'quay.io/app/orders:1.5.0', type: 'backend' },
    { id: 'payment-svc', name: 'Payment Service', status: 'DEGRADED', replicas: 2, image: 'quay.io/app/payments:2.1.0', type: 'backend' },
    { id: 'notification-svc', name: 'Notification Service', status: 'RUNNING', replicas: 1, type: 'worker' },
    { id: 'gateway', name: 'API Gateway', status: 'RUNNING', replicas: 2, type: 'gateway' },
  ],
  edges: [
    { source: 'gateway', target: 'order-api', label: 'HTTP' },
    { source: 'order-api', target: 'payment-svc', label: 'gRPC' },
    { source: 'order-api', target: 'notification-svc', label: 'async' },
  ],
};

describe('toGraphModel', () => {
  it('creates a GraphNode per service', () => {
    const model = toGraphModel(SAMPLE_TOPOLOGY);
    const serviceNodes = model.nodes.filter(n => n.type === 'topology-service');
    expect(serviceNodes).toHaveLength(4);
  });

  it('creates dependency edges', () => {
    const model = toGraphModel(SAMPLE_TOPOLOGY);
    const depEdges = model.edges.filter(e => e.type === 'topology-dependency');
    expect(depEdges).toHaveLength(3);
  });

  it('creates cluster container nodes', () => {
    const snap: TopologySnapshot = {
      services: [
        { id: 'svc-1', name: 'Svc 1', status: 'RUNNING', cluster: 'us-east' },
        { id: 'svc-2', name: 'Svc 2', status: 'RUNNING', cluster: 'us-east' },
      ],
      edges: [],
      clusters: [{ id: 'us-east', name: 'US East', region: 'us-east-1' }],
    };
    const model = toGraphModel(snap);
    const clusterNode = model.nodes.find(n => n.id === 'cluster:us-east');
    expect(clusterNode).toBeDefined();
    expect(clusterNode!.type).toBe('topology-cluster');
    const childNodes = model.nodes.filter(n => (n as any).parentId === 'cluster:us-east');
    expect(childNodes).toHaveLength(2);
  });

  it('creates for-each edges from forEachSource', () => {
    const snap: TopologySnapshot = {
      services: [
        { id: 'template', name: 'Worker Template', status: 'RUNNING' },
        { id: 'worker-1', name: 'Worker 1', status: 'RUNNING', forEachSource: 'template' },
        { id: 'worker-2', name: 'Worker 2', status: 'RUNNING', forEachSource: 'template' },
      ],
      edges: [],
    };
    const model = toGraphModel(snap);
    const feEdges = model.edges.filter(e => e.type === 'for-each');
    expect(feEdges).toHaveLength(2);
    expect(feEdges.every(e => e.source === 'template')).toBe(true);
  });
});

describe('topologyToDecorations', () => {
  it('maps RUNNING to green border', () => {
    const decos = topologyToDecorations(SAMPLE_TOPOLOGY);
    expect(decos.get('order-api')?.border?.color).toBe('#a6e3a1');
  });

  it('maps DEGRADED to yellow border with warning badge', () => {
    const decos = topologyToDecorations(SAMPLE_TOPOLOGY);
    expect(decos.get('payment-svc')?.border?.color).toBe('#f9e2af');
    expect(decos.get('payment-svc')?.badge?.icon).toBe('⚠');
  });

  it('adds replica pills', () => {
    const decos = topologyToDecorations(SAMPLE_TOPOLOGY);
    expect(decos.get('order-api')?.pills?.[0]?.text).toBe('×3');
  });

  it('adds deployment strategy badge when deploying', () => {
    const snap: TopologySnapshot = {
      services: [{ id: 'svc', name: 'Svc', status: 'DEPLOYING', deploymentStrategy: 'canary' }],
      edges: [],
    };
    const decos = topologyToDecorations(snap);
    expect(decos.get('svc')?.badge?.icon).toContain('Canary');
  });

  it('adds image tooltip', () => {
    const decos = topologyToDecorations(SAMPLE_TOPOLOGY);
    expect(decos.get('order-api')?.tooltip).toBe('quay.io/app/orders:1.5.0');
  });
});

describe('agency-topology-viewer', () => {
  let el: TopologyViewerEl;

  beforeEach(() => {
    el = document.createElement('agency-topology-viewer') as TopologyViewerEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it('renders empty state when no data', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No topology data');
  });

  it('renders pages-graph-canvas when data provided', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 50));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('pages-graph-canvas')).not.toBeNull();
  });

  it('renders with empty services array', async () => {
    el.data = { services: [], edges: [] };
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No services');
  });

  it('renders summary stats in toolbar', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;
    const text = el.shadowRoot!.textContent!;
    expect(text).toContain('4');
    expect(text).toContain('3');
  });

  it('toolbar has ARIA role status', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;
    const toolbar = el.shadowRoot!.querySelector('.toolbar');
    expect(toolbar?.getAttribute('role')).toBe('status');
  });

  it('canvas area has ARIA role img', async () => {
    el.data = SAMPLE_TOPOLOGY;
    await el.updateComplete;
    const area = el.shadowRoot!.querySelector('.canvas-area');
    expect(area?.getAttribute('role')).toBe('img');
    expect(area?.getAttribute('aria-label')).toContain('services');
  });
});
