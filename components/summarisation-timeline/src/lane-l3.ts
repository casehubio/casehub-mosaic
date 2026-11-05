import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { PhaseSummary, TimeRange } from '@casehubio/mosaic-core';
import { rangeToPixels, classificationColour, laneStyles, isRangeVisible } from './styles.js';

@customElement('summarisation-lane-l3')
export class SummarisationLaneL3 extends LitElement {
  static override styles = [laneStyles, css`
    :host { height: 2.5rem; }
    .phase-bar {
      position: absolute;
      top: 2px;
      bottom: 2px;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      border: 1px solid var(--pages-neutral-6, #666);
      transition: opacity 0.15s ease;
    }
    .dimmed { opacity: 0.2; }
  `];

  @property({ type: Array }) phaseSummaries: PhaseSummary[] = [];
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
      <div class="lane-container" role="region" aria-label="Phase summaries lane">
        <div role="list">
          ${this.phaseSummaries
            .filter((p: PhaseSummary) => isRangeVisible(p.from, p.to, this.visibleRange))
            .map(p => this._renderPhase(p))}
        </div>
      </div>
    `;
  }

  private _renderPhase(phase: PhaseSummary) {
    let { left, width } = rangeToPixels(phase.from, phase.to, this.visibleRange, this.containerWidth);
    if (left < 0) { width += left; left = 0; }
    if (left + width > this.containerWidth) { width = this.containerWidth - left; }
    if (!this._classIndex.has(phase.classification)) {
      this._classIndex.set(phase.classification, this._classIndex.size);
    }
    const bg = classificationColour(
      phase.classification, this.classificationColours, this._classIndex.get(phase.classification)!,
    );
    const dimmed = this.hoveredEventId != null && !this.highlightedIds.includes(phase.id);
    const descId = phase.sourceRefs.length > 0 ? `desc-${phase.id}` : undefined;
    return html`
      <div
        class="phase-bar ${dimmed ? 'dimmed' : ''}"
        role="listitem"
        aria-label="${phase.label} phase — ${phase.classification}"
        aria-describedby=${ifDefined(descId)}
        data-event-id="${phase.id}"
        style=${styleMap({ left: `${left}px`, width: `${width}px`, backgroundColor: `${bg}66` })}
        @click=${() => this._onSelect(phase)}
        @mouseenter=${() => this._onHover(phase)}
        @mouseleave=${() => this._onLeave()}
      >${phase.label}</div>
      ${descId ? html`<span id="${descId}" class="sr-only">Sources: ${phase.sourceRefs.length} episodes</span>` : nothing}
    `;
  }

  private _onSelect(phase: PhaseSummary) {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:event:selected', {
      bubbles: true, composed: true, detail: { event: phase, lane: 'l3' },
    }));
  }

  private _onHover(phase: PhaseSummary) {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:lineage:highlighted', {
      bubbles: true, composed: true,
      detail: { sourceIds: phase.sourceRefs, targetIds: [phase.id] },
    }));
    this.dispatchEvent(new CustomEvent('summarisation-timeline:event:hovered', {
      bubbles: true, composed: true,
      detail: { event: phase, lane: 'l3' },
    }));
  }

  private _onLeave() {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:lineage:highlighted', {
      bubbles: true, composed: true, detail: { sourceIds: [], targetIds: [] },
    }));
    this.dispatchEvent(new CustomEvent('summarisation-timeline:event:hovered', {
      bubbles: true, composed: true,
      detail: { event: null, lane: null },
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'summarisation-lane-l3': SummarisationLaneL3;
  }
}
