import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { SummarisedEvent, TimeRange } from '@casehubio/mosaic-core';
import { rangeToPixels, classificationColour, laneStyles, isRangeVisible } from './styles.js';

@customElement('summarisation-lane-l2')
export class SummarisationLaneL2 extends LitElement {
  static override styles = [laneStyles, css`
    :host { height: 2.5rem; }
    .episode-card {
      position: absolute;
      top: 4px;
      bottom: 4px;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      cursor: pointer;
      border: 1px solid var(--pages-neutral-6, #aaa);
      transition: opacity 0.15s ease;
    }
    .episode-card .label { font-weight: 500; }
    .episode-card .badge {
      display: inline-block;
      font-size: 9px;
      padding: 0 4px;
      border-radius: 3px;
      background: var(--pages-neutral-3, #eee);
      margin-left: 4px;
    }
    .dimmed { opacity: 0.2; }
  `];

  @property({ type: Array }) summarisedEvents: SummarisedEvent[] = [];
  @property({ type: Object }) visibleRange: TimeRange = { from: 0, to: 0 };
  @property({ type: Number }) containerWidth = 0;
  @property({ type: Object }) classificationColours?: Record<string, string>;
  @property({ type: String }) hoveredEventId: string | null = null;
  @property({ type: Array }) highlightedIds: string[] = [];

  private _classIndex = new Map<string, number>();

  getElementRect(id: string): DOMRect | null {
    const el = this.shadowRoot?.querySelector(`[data-event-id="${id}"]`);
    return el ? el.getBoundingClientRect() : null;
  }

  override render() {
    return html`
      <div class="lane-container" role="region" aria-label="Summarised events lane">
        <div role="list">
          ${this.summarisedEvents
            .filter((ev: SummarisedEvent) => isRangeVisible(ev.from, ev.to, this.visibleRange))
            .map(ev => this._renderCard(ev))}
        </div>
      </div>
    `;
  }

  private _renderCard(ev: SummarisedEvent) {
    let { left, width } = rangeToPixels(ev.from, ev.to, this.visibleRange, this.containerWidth);
    if (left < 0) { width += left; left = 0; }
    if (left + width > this.containerWidth) { width = this.containerWidth - left; }
    if (!this._classIndex.has(ev.classification)) {
      this._classIndex.set(ev.classification, this._classIndex.size);
    }
    const bg = classificationColour(
      ev.classification, this.classificationColours, this._classIndex.get(ev.classification)!,
    );
    const dimmed = this.hoveredEventId != null && !this.highlightedIds.includes(ev.id);
    const descId = (ev.sourceRefs.length > 0 || ev.lineageRefs.length > 0) ? `desc-${ev.id}` : undefined;
    return html`
      <div
        class="episode-card ${dimmed ? 'dimmed' : ''}"
        role="listitem"
        aria-label="${ev.label} — ${ev.classification}"
        aria-describedby=${ifDefined(descId)}
        data-event-id="${ev.id}"
        style=${styleMap({ left: `${left}px`, width: `${width}px`, backgroundColor: `${bg}33` })}
        @click=${() => this._onSelect(ev)}
        @mouseenter=${() => this._onHover(ev)}
        @mouseleave=${() => this._onLeave()}
      >
        <span class="label">${ev.label}</span>
        <span class="badge">${ev.classification}</span>
      </div>
      ${descId ? html`<span id="${descId}" class="sr-only">Sources: ${ev.sourceRefs.length} events. Connected to: ${ev.lineageRefs.join(', ')}</span>` : nothing}
    `;
  }

  private _onSelect(ev: SummarisedEvent) {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:event:selected', {
      bubbles: true, composed: true, detail: { event: ev, lane: 'l2' },
    }));
  }

  private _onHover(ev: SummarisedEvent) {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:lineage:highlighted', {
      bubbles: true, composed: true,
      detail: { sourceIds: ev.sourceRefs, targetIds: [ev.id, ...ev.lineageRefs] },
    }));
  }

  private _onLeave() {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:lineage:highlighted', {
      bubbles: true, composed: true, detail: { sourceIds: [], targetIds: [] },
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'summarisation-lane-l2': SummarisationLaneL2;
  }
}
