import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { DesiredStateSnapshot } from '@casehubio/mosaic-core';
import type { NodeDecoration } from '@casehubio/graph-core';
import { computeElkLayout, toReactFlowGraph } from '@casehubio/graph-renderer';
import type { ElkLayoutResult } from '@casehubio/graph-renderer';
import { emitPagesEvent } from '@casehubio/pages-data';
import '@casehubio/graph-renderer';
import { desiredStateToGraph, desiredStateToDecorations } from './adapter.js';
import type { DesiredStateAdapterResult } from './types.js';
import './desired-state-toolbar.js';

export interface DesiredStateGraphProps {
  data: DesiredStateSnapshot | null;
  selectionTopic: string;
}

@customElement('agency-desired-state-graph')
export class DesiredStateGraph extends LitElement {
  @property({ type: Object }) data: DesiredStateSnapshot | null = null;
  @property({ attribute: 'selection-topic' }) selectionTopic = 'desired-state-node';

  @state() private _adapterResult: DesiredStateAdapterResult | null = null;
  @state() private _decorations: ReadonlyMap<string, NodeDecoration> = new Map();
  @state() private _nodes: ReturnType<typeof toReactFlowGraph>['nodes'] = [];
  @state() private _edges: ReturnType<typeof toReactFlowGraph>['edges'] = [];
  private _lastLayout: ElkLayoutResult | undefined;
  private _renderInProgress = false;

  override updated(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('data')) {
      this._decorations = new Map();
      if (this.data != null) this._fullRender(this.data);
      else {
        this._adapterResult = null;
        this._nodes = [];
        this._edges = [];
      }
    }
  }

  private async _fullRender(snapshot: DesiredStateSnapshot): Promise<void> {
    if (this._renderInProgress) return;
    this._renderInProgress = true;
    this._adapterResult = desiredStateToGraph(snapshot);
    const layout = await computeElkLayout(this._adapterResult.model, { direction: 'DOWN', spacing: 60 });
    this._lastLayout = layout;
    this._decorations = desiredStateToDecorations(snapshot);
    this._applyLayout();
    this._renderInProgress = false;
  }

  private _applyLayout(): void {
    if (!this._adapterResult || !this._lastLayout) return;
    const { nodes, edges } = toReactFlowGraph(this._adapterResult.model, this._lastLayout, this._decorations);
    this._nodes = nodes;
    this._edges = edges;
  }

  private _computeStats() {
    if (this.data == null) return { nodeCount: 0, convergedCount: 0, driftedCount: 0, faultedCount: 0 };
    return {
      nodeCount: this.data.nodes.length,
      convergedCount: this.data.nodes.filter(n => n.status === 'CONVERGED').length,
      driftedCount: this.data.nodes.filter(n => n.status === 'DRIFTED').length,
      faultedCount: this.data.nodes.filter(n => n.status === 'FAULTED').length,
    };
  }

  private _onNodeClick(nodeId: string): void {
    emitPagesEvent(this, this.selectionTopic, { nodeId });
  }

  static override styles = css`
    :host { display: flex; flex-direction: column; height: 100%; }
    .canvas-area { flex: 1; position: relative; }
    .empty { display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--pages-text-tertiary, #999); font-style: italic; }
  `;

  override render() {
    const stats = this._computeStats();
    return html`
      <agency-desired-state-toolbar
        .nodeCount=${stats.nodeCount}
        .convergedCount=${stats.convergedCount}
        .driftedCount=${stats.driftedCount}
        .faultedCount=${stats.faultedCount}
        .lastReconciled=${this.data?.lastReconciled ?? null}
      ></agency-desired-state-toolbar>
      <div class="canvas-area"
           role="img"
           aria-label="Desired state graph: ${stats.convergedCount} converged, ${stats.driftedCount} drifted, ${stats.faultedCount} faulted">
        ${this.data == null
          ? html`<div class="empty" role="status">No desired state data loaded</div>`
          : html`<pages-graph-canvas
              .nodes=${this._nodes}
              .edges=${this._edges}
              style="width: 100%; height: 100%;"
              @pages-event=${(e: CustomEvent) => {
                if (e.detail?.topic === 'graph:node:click') {
                  const graphNodeId = e.detail.payload?.nodeId as string | undefined;
                  if (graphNodeId?.startsWith('ds:')) this._onNodeClick(graphNodeId);
                }
              }}
            ></pages-graph-canvas>`}
      </div>
    `;
  }
}
