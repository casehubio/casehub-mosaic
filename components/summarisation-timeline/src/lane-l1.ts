import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { RawEvent, TimeRange } from '@casehubio/mosaic-core';
import { clusterEvents, type EventCluster } from './clustering.js';
import { timestampToPixel, classificationColour, laneStyles, isPointVisible } from './styles.js';

@customElement('summarisation-lane-l1')
export class SummarisationLaneL1 extends LitElement {
  static override styles = [laneStyles, css`
    .dot {
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      top: 50%;
      cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .cluster {
      position: absolute;
      height: 16px;
      border-radius: 8px;
      top: 50%;
      transform: translateY(-50%);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: white;
      min-width: 20px;
      padding: 0 4px;
      transition: opacity 0.15s ease;
    }
    .dimmed { opacity: 0.2; }
  `];

  @property({ type: Array }) rawEvents: RawEvent[] = [];
  @property({ type: Object }) visibleRange: TimeRange = { from: 0, to: 0 };
  @property({ type: Number }) containerWidth = 0;
  @property({ type: Object }) classificationColours?: Record<string, string>;
  @property({ type: String }) hoveredEventId: string | null = null;
  @property({ type: Array }) highlightedIds: string[] = [];

  private _classIndex = new Map<string, number>();

  private _getClassIndex(cls: string): number {
    if (!this._classIndex.has(cls)) {
      this._classIndex.set(cls, this._classIndex.size);
    }
    return this._classIndex.get(cls)!;
  }

  getElementRect(id: string): DOMRect | null {
    const el = this.shadowRoot?.querySelector(`[data-event-id="${id}"]`);
    return el ? el.getBoundingClientRect() : null;
  }

  override render() {
    const visible = this.rawEvents.filter((e: RawEvent) => isPointVisible(e.timestamp, this.visibleRange));
    const clusters = clusterEvents(visible, this.visibleRange, this.containerWidth, 6);

    return html`
      <div class="lane-container" role="region" aria-label="Raw events lane">
        <div role="list">
          ${clusters.map(c => c.count === 1
            ? this._renderDot(c.events[0]!)
            : this._renderCluster(c)
          )}
        </div>
      </div>
    `;
  }

  private _renderDot(event: RawEvent) {
    const left = timestampToPixel(event.timestamp, this.visibleRange, this.containerWidth);
    const colour = classificationColour(
      event.classification, this.classificationColours, this._getClassIndex(event.classification),
    );
    const dimmed = this.hoveredEventId != null && !this.highlightedIds.includes(event.id);
    const descId = event.lineageRefs.length > 0 ? `desc-${event.id}` : undefined;
    return html`
      <div
        class="dot ${dimmed ? 'dimmed' : ''}"
        role="listitem"
        aria-label="${event.classification} event at ${new Date(event.timestamp).toLocaleTimeString()}"
        aria-describedby=${ifDefined(descId)}
        data-event-id="${event.id}"
        style=${styleMap({ left: `${left}px`, backgroundColor: colour })}
        @click=${() => this._onSelect(event)}
        @mouseenter=${() => this._onHover(event)}
        @mouseleave=${() => this._onLeave()}
      ></div>
      ${descId ? html`<span id="${descId}" class="sr-only">Connected to: ${event.lineageRefs.join(', ')}</span>` : nothing}
    `;
  }

  private _renderCluster(cluster: EventCluster) {
    const left = timestampToPixel(cluster.centroidTimestamp, this.visibleRange, this.containerWidth);
    const colour = classificationColour(
      cluster.dominantClassification, this.classificationColours,
      this._getClassIndex(cluster.dominantClassification),
    );
    const dimmed = this.hoveredEventId != null &&
      !cluster.events.some(e => this.highlightedIds.includes(e.id));
    return html`
      <div
        class="cluster ${dimmed ? 'dimmed' : ''}"
        role="listitem"
        aria-label="Cluster of ${cluster.count} events, mostly ${cluster.dominantClassification}"
        data-cluster-ids="${cluster.events.map(e => e.id).join(',')}"
        style=${styleMap({ left: `${left}px`, backgroundColor: colour })}
        @click=${() => this._onSelectCluster(cluster)}
        @mouseenter=${() => this._onHoverCluster(cluster)}
        @mouseleave=${() => this._onLeave()}
      >${cluster.count}</div>
    `;
  }

  private _onSelect(event: RawEvent) {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:event:selected', {
      bubbles: true, composed: true,
      detail: { event, lane: 'l1' },
    }));
  }

  private _onSelectCluster(cluster: EventCluster) {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:event:selected', {
      bubbles: true, composed: true,
      detail: { event: cluster.events[0]!, lane: 'l1', cluster },
    }));
  }

  private _onHover(event: RawEvent) {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:lineage:highlighted', {
      bubbles: true, composed: true,
      detail: { sourceIds: [event.id], targetIds: event.lineageRefs },
    }));
  }

  private _onHoverCluster(cluster: EventCluster) {
    const sourceIds = cluster.events.map(e => e.id);
    const targetIds = [...new Set(cluster.events.flatMap(e => e.lineageRefs))];
    this.dispatchEvent(new CustomEvent('summarisation-timeline:lineage:highlighted', {
      bubbles: true, composed: true,
      detail: { sourceIds, targetIds },
    }));
  }

  private _onLeave() {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:lineage:highlighted', {
      bubbles: true, composed: true,
      detail: { sourceIds: [], targetIds: [] },
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'summarisation-lane-l1': SummarisationLaneL1;
  }
}
