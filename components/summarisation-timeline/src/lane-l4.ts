import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { TimePositionedStep, DecisionNarrative, TimeRange, SignalDigest } from '@casehubio/mosaic-core';
import { rangeToPixels, laneStyles, isRangeVisible } from './styles.js';

@customElement('summarisation-lane-l4')
export class SummarisationLaneL4 extends LitElement {
  static override styles = [laneStyles, css`
    :host { height: 5rem; }
    .step-block {
      position: absolute;
      top: 4px;
      bottom: 4px;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      background: var(--pages-neutral-3, #f0f0f0);
      border: 1px solid var(--pages-neutral-5, #ccc);
      overflow: hidden;
      cursor: pointer;
    }
    .step-name { font-weight: 600; font-size: 12px; }
    .signal-badge {
      display: inline-block;
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      margin-right: 3px;
      background: var(--pages-accent-3, #e0f0ff);
      color: var(--pages-accent-11, #0066cc);
    }
    .confidence-bar {
      height: 3px;
      border-radius: 2px;
      background: var(--pages-neutral-4, #ddd);
      margin-top: 2px;
    }
    .confidence-fill {
      height: 100%;
      border-radius: 2px;
      background: var(--pages-accent-9, #3399ff);
    }
    .key-fact {
      display: inline-block;
      font-size: 9px;
      padding: 1px 4px;
      border-radius: 3px;
      background: var(--pages-neutral-2, #f5f5f5);
      margin: 1px 2px;
    }
    .narrative-summary {
      padding: 4px 8px;
      font-size: 12px;
      color: var(--pages-neutral-11, #444);
      font-style: italic;
    }
  `];

  @property({ type: Array }) steps: TimePositionedStep[] = [];
  @property({ type: Object }) narrative?: DecisionNarrative;
  @property({ type: Object }) visibleRange: TimeRange = { from: 0, to: 0 };
  @property({ type: Number }) containerWidth = 0;

  override render() {
    return html`
      <div class="lane-container" role="region" aria-label="Narrative lane">
        <div role="list">
          ${this.steps
            .filter((s: TimePositionedStep) => isRangeVisible(s.from, s.to, this.visibleRange))
            .map(s => this._renderStep(s))}
        </div>
        ${this.narrative?.explanation
          ? html`<div class="narrative-summary">${this.narrative.explanation}</div>`
          : nothing}
      </div>
    `;
  }

  private _renderStep(step: TimePositionedStep) {
    let { left, width } = rangeToPixels(step.from, step.to, this.visibleRange, this.containerWidth);
    if (left < 0) { width += left; left = 0; }
    if (left + width > this.containerWidth) { width = this.containerWidth - left; }
    return html`
      <div
        class="step-block"
        role="listitem"
        aria-label="Decision step: ${step.stepName}"
        style=${styleMap({ left: `${left}px`, width: `${width}px` })}
        @click=${() => this._onSelect(step)}
        @mouseenter=${() => this._onHover(step)}
        @mouseleave=${() => this._onLeave()}
      >
        <div class="step-name">${step.stepName}</div>
        ${step.signals.map((sig: SignalDigest) => html`
          <span class="signal-badge">${sig.type}</span>
          ${sig.confidence != null ? html`
            <div class="confidence-bar">
              <div class="confidence-fill" style=${styleMap({ width: `${sig.confidence * 100}%` })}></div>
            </div>
          ` : nothing}
          ${sig.keyFacts?.map((f: string) => html`<span class="key-fact">${f}</span>`)}
        `)}
      </div>
    `;
  }

  private _onSelect(step: TimePositionedStep) {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:event:selected', {
      bubbles: true, composed: true, detail: { event: step, lane: 'l4' },
    }));
  }

  private _onHover(step: TimePositionedStep) {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:event:hovered', {
      bubbles: true, composed: true,
      detail: { event: step, lane: 'l4' },
    }));
  }

  private _onLeave() {
    this.dispatchEvent(new CustomEvent('summarisation-timeline:event:hovered', {
      bubbles: true, composed: true,
      detail: { event: null, lane: null },
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'summarisation-lane-l4': SummarisationLaneL4;
  }
}
