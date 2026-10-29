import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { PushMixin } from '@casehubio/pages-component';
import type { GraphModel, GraphNode, GraphEdge, NodeDecoration } from '@casehubio/graph-core';
import { computeElkLayout, toReactFlowGraph } from '@casehubio/graph-renderer';
import type { ElkLayoutResult } from '@casehubio/graph-renderer';
import '@casehubio/graph-renderer';
import type { TopologySnapshot, TopologyNode, TopologyNodeStatus, ClusterGroup, Situation, MutationAction } from './types.js';

export const TopologyViewerTopics = {
  NODE_SELECTED: 'topology.node-selected',
} as const;

const STATUS_BORDER: Record<TopologyNodeStatus, { style: string; color: string }> = {
  RUNNING:   { style: 'solid',  color: '#a6e3a1' },
  DEGRADED:  { style: 'solid',  color: '#f9e2af' },
  DEPLOYING: { style: 'solid',  color: '#89b4fa' },
  FAULTED:   { style: 'solid',  color: '#f38ba8' },
  ABSENT:    { style: 'dashed', color: '#6c7086' },
};

const MUTATION_BADGE: Record<MutationAction, { icon: string; color: string }> = {
  'scale-up':   { icon: '↑', color: '#a6e3a1' },
  'scale-down': { icon: '↓', color: '#f9e2af' },
  'add':        { icon: '+', color: '#89b4fa' },
  'remove':     { icon: '✕', color: '#f38ba8' },
  'reroute':    { icon: '↺', color: '#cba6f7' },
};

const STRATEGY_LABELS: Record<string, string> = {
  rolling: '🔄 Rolling',
  canary: '🐤 Canary',
  'blue-green': '🔵🟢 Blue-Green',
};

export function toGraphModel(snapshot: TopologySnapshot): GraphModel {
  const nodes: GraphNode[] = [];

  if (snapshot.clusters) {
    for (const cluster of snapshot.clusters) {
      nodes.push({
        id: `cluster:${cluster.id}`,
        type: 'topology-cluster',
        properties: { label: cluster.name, region: cluster.region },
      });
    }
  }

  for (const s of snapshot.services) {
    nodes.push({
      id: s.id,
      type: 'topology-service',
      ...(s.cluster ? { parentId: `cluster:${s.cluster}` } : {}),
      properties: { label: s.name, ...s } as Record<string, unknown>,
    });
  }

  const edges: GraphEdge[] = snapshot.edges.map((e, i) => ({
    id: `edge-${i}`,
    source: e.source,
    target: e.target,
    type: 'topology-dependency',
    properties: e.label ? { label: e.label } : {},
  }));

  const serviceIds = new Set(snapshot.services.map(s => s.id));
  for (const s of snapshot.services) {
    if (s.forEachSource && serviceIds.has(s.forEachSource)) {
      edges.push({
        id: `fe:${s.forEachSource}:${s.id}`,
        source: s.forEachSource,
        target: s.id,
        type: 'for-each',
        properties: { label: 'forEach' },
      });
    }
  }

  return { nodes, edges };
}

export function topologyToDecorations(
  snapshot: TopologySnapshot,
  activeSituation?: Situation,
): ReadonlyMap<string, NodeDecoration> {
  const map = new Map<string, NodeDecoration>();
  for (const s of snapshot.services) {
    const border = STATUS_BORDER[s.status] ?? STATUS_BORDER.ABSENT;
    const pills: { text: string; color: string }[] = [];
    if (s.replicas != null) pills.push({ text: `×${s.replicas}`, color: '#89b4fa' });

    const deco: NodeDecoration = {
      border,
      ...(s.status === 'DEGRADED'
        ? { badge: { icon: '⚠', color: '#f9e2af' } }
        : {}),
      ...(s.deploymentStrategy && s.status === 'DEPLOYING'
        ? { badge: { icon: STRATEGY_LABELS[s.deploymentStrategy] ?? s.deploymentStrategy, color: '#89b4fa' } }
        : {}),
      ...(pills.length > 0 ? { pills } : {}),
      ...(s.image ? { tooltip: s.image } : {}),
    };
    map.set(s.id, deco);
  }
  if (activeSituation) {
    const serviceIds = new Set(snapshot.services.map(s => s.id));
    for (const mutation of activeSituation.mutations) {
      if (!serviceIds.has(mutation.targetId)) continue;
      const badge = MUTATION_BADGE[mutation.action];
      const existing = map.get(mutation.targetId);
      const baseTooltip = existing?.tooltip ?? '';
      const mutationTooltip = mutation.detail
        ? (baseTooltip ? `${baseTooltip}\n${mutation.detail}` : mutation.detail)
        : baseTooltip;
      map.set(mutation.targetId, {
        ...existing,
        badge,
        ...(mutationTooltip ? { tooltip: mutationTooltip } : {}),
      });
    }
  }
  return map;
}

export interface TopologyViewerProps {
  data: TopologySnapshot | null;
  endpoint?: string;
  selectionTopic: string;
}

@customElement('agency-topology-viewer')
export class TopologyViewer extends PushMixin(LitElement) {
  @property({ attribute: false }) data: TopologySnapshot | null = null;
  @property() endpoint?: string;
  @property({ attribute: 'selection-topic' }) selectionTopic = 'topology.node-selected';

  @state() private _graphModel: GraphModel | null = null;
  @state() private _decorations: ReadonlyMap<string, NodeDecoration> = new Map();
  @state() private _nodes: ReturnType<typeof toReactFlowGraph>['nodes'] = [];
  @state() private _edges: ReturnType<typeof toReactFlowGraph>['edges'] = [];
  @state() private _fetchedData: TopologySnapshot | null = null;
  @state() private _loading = false;
  @state() private _activeSituationId: string | null = null;
  private _lastLayout: ElkLayoutResult | undefined;
  private _renderInProgress = false;

  static override styles = css`
    :host { display: flex; flex-direction: column; height: 100%; font-family: var(--pages-font-family, system-ui); }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--pages-space-2, 0.5rem) var(--pages-space-3, 0.75rem);
      border-bottom: 1px solid var(--pages-neutral-6, #dee2e6);
      font-size: 13px;
      color: var(--pages-text-secondary, #6c757d);
    }
    .stats { display: flex; gap: var(--pages-space-3, 0.75rem); }
    .stat { display: flex; align-items: center; gap: 4px; }
    .stat-value { font-weight: 600; color: var(--pages-text-primary, #212529); }
    .canvas-area { flex: 1; position: relative; }
    .empty { display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--pages-text-tertiary, #999); font-style: italic; }
    .situation-bar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-bottom: 1px solid var(--pages-neutral-6, #dee2e6);
      font-size: 12px;
    }
    .situation-pill {
      padding: 2px 10px;
      border-radius: 12px;
      border: 1px solid var(--pages-neutral-6, #dee2e6);
      background: transparent;
      color: var(--pages-text-secondary, #6c757d);
      cursor: pointer;
      font-size: 12px;
      font-family: inherit;
      transition: background 0.15s, color 0.15s;
    }
    .situation-pill:hover {
      background: var(--pages-neutral-3, #f1f3f5);
    }
    .situation-pill[aria-checked="true"] {
      background: var(--pages-accent, #4dabf7);
      color: #fff;
      border-color: var(--pages-accent, #4dabf7);
    }
  `;

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    const dataChanged = changed.has('data') || changed.has('_fetchedData');
    if (dataChanged) {
      this._activeSituationId = null;
      const d = this._effectiveData;
      if (d) this._fullRender(d);
      else {
        this._graphModel = null;
        this._nodes = [];
        this._edges = [];
      }
    }
    if (changed.has('endpoint') && this.endpoint && !this.data) {
      this._fetchFromEndpoint();
    }
  }

  override onPushEvent(event: unknown): void {
    const update = event as { serviceId: string; status: TopologyNodeStatus };
    if (this.data && update.serviceId) {
      this.data = {
        ...this.data,
        services: this.data.services.map(s =>
          s.id === update.serviceId ? { ...s, status: update.status } : s
        ),
      };
    }
  }

  private async _fullRender(snapshot: TopologySnapshot): Promise<void> {
    if (this._renderInProgress) return;
    this._renderInProgress = true;
    this._graphModel = toGraphModel(snapshot);
    const layout = await computeElkLayout(this._graphModel, { direction: 'DOWN', spacing: 60 });
    this._lastLayout = layout;
    this._decorations = topologyToDecorations(snapshot, this._activeSituation);
    this._applyLayout();
    this._renderInProgress = false;
  }

  private _applyLayout(): void {
    if (!this._graphModel || !this._lastLayout) return;
    const { nodes, edges } = toReactFlowGraph(this._graphModel, this._lastLayout, this._decorations);
    this._nodes = nodes;
    this._edges = edges;
  }

  private async _fetchFromEndpoint(): Promise<void> {
    if (!this.endpoint) return;
    this._loading = true;
    try {
      const resp = await fetch(this.endpoint);
      if (resp.ok) {
        this._fetchedData = await resp.json() as TopologySnapshot;
      }
    } finally {
      this._loading = false;
    }
  }

  private get _effectiveData(): TopologySnapshot | null {
    return this.data ?? this._fetchedData;
  }

  private get _activeSituation(): Situation | undefined {
    const d = this._effectiveData;
    if (!d?.situations || !this._activeSituationId) return undefined;
    return d.situations.find(s => s.id === this._activeSituationId);
  }

  private _selectSituation(id: string | null): void {
    this._activeSituationId = id;
    const d = this._effectiveData;
    if (d) {
      this._decorations = topologyToDecorations(d, this._activeSituation);
      this._applyLayout();
    }
  }

  private _renderSituationBar() {
    const d = this._effectiveData;
    if (!d?.situations?.length) return nothing;
    return html`
      <div class="situation-bar" role="radiogroup" aria-label="Topology situations">
        <button type="button" class="situation-pill"
                role="radio"
                aria-checked="${this._activeSituationId == null}"
                @click=${() => this._selectSituation(null)}>Baseline</button>
        ${d.situations.map(s => html`
          <button type="button" class="situation-pill"
                  role="radio"
                  aria-checked="${this._activeSituationId === s.id}"
                  title="${s.condition}"
                  @click=${() => this._selectSituation(s.id)}>${s.name}</button>
        `)}
      </div>
    `;
  }

  private _computeStats() {
    const d = this._effectiveData;
    if (!d) return { serviceCount: 0, edgeCount: 0, healthyCount: 0, degradedCount: 0 };
    return {
      serviceCount: d.services.length,
      edgeCount: d.edges.length,
      healthyCount: d.services.filter(s => s.status === 'RUNNING').length,
      degradedCount: d.services.filter(s => s.status !== 'RUNNING').length,
    };
  }

  override render() {
    if (this._loading) return html`<div class="empty">Loading topology...</div>`;
    const d = this._effectiveData;
    if (!d) return html`<div class="empty">No topology data</div>`;
    if (d.services.length === 0) return html`<div class="empty">No services in topology</div>`;

    const stats = this._computeStats();
    const activeSit = this._activeSituation;

    return html`
      <div class="toolbar" role="status" aria-live="polite">
        <div class="stats">
          <span class="stat">Services: <span class="stat-value">${stats.serviceCount}</span></span>
          <span class="stat">Dependencies: <span class="stat-value">${stats.edgeCount}</span></span>
          <span class="stat">Healthy: <span class="stat-value">${stats.healthyCount}</span></span>
          ${stats.degradedCount > 0
            ? html`<span class="stat">Issues: <span class="stat-value">${stats.degradedCount}</span></span>`
            : ''}
          ${activeSit
            ? html`<span class="stat">Mutations: <span class="stat-value">${activeSit.mutations.length}</span></span>`
            : ''}
        </div>
      </div>
      ${this._renderSituationBar()}
      <div class="canvas-area"
           role="img"
           aria-label="Application topology: ${stats.serviceCount} services, ${stats.healthyCount} healthy">
        <pages-graph-canvas
          .nodes=${this._nodes}
          .edges=${this._edges}
          style="width: 100%; height: 100%;"
          @pages-event=${(e: CustomEvent) => {
            if (e.detail?.topic === 'graph:node:click') {
              const nodeId = e.detail.payload?.nodeId as string | undefined;
              if (nodeId) {
                const svc = d.services.find(s => s.id === nodeId);
                if (svc) {
                  emitPagesEvent(this, this.selectionTopic, {
                    serviceId: svc.id,
                    serviceName: svc.name,
                    status: svc.status,
                  });
                }
              }
            }
          }}
        ></pages-graph-canvas>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-topology-viewer': TopologyViewer;
  }
}
