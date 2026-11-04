import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { TimeRange } from '@casehubio/mosaic-core';

type DragMode = 'pan' | 'resize-left' | 'resize-right' | null;
const MIN_BRUSH_FRACTION = 0.02;

@customElement('summarisation-minimap')
export class SummarisationMinimap extends LitElement {
  static override styles = css`
    :host { display: block; height: 32px; position: relative; }
    .minimap-container {
      display: flex; align-items: center; gap: 4px; height: 100%;
    }
    .overview {
      flex: 1; height: 20px; position: relative;
      background: var(--pages-neutral-2, #f5f5f5);
      border: 1px solid var(--pages-neutral-4, #ddd);
      border-radius: 4px; overflow: hidden;
    }
    .brush {
      position: absolute; top: 0; bottom: 0;
      background: var(--pages-accent-4, #cce5ff);
      border: 1px solid var(--pages-accent-7, #66b3ff);
      border-radius: 2px;
      cursor: grab;
    }
    .brush:active { cursor: grabbing; }
    .handle {
      position: absolute; top: 0; bottom: 0; width: 6px;
      cursor: ew-resize;
      z-index: 1;
    }
    .handle::after {
      content: '';
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 2px; height: 10px;
      background: var(--pages-accent-9, #3399ff);
      border-radius: 1px;
    }
    .handle-left { left: -3px; }
    .handle-right { right: -3px; }
    .density-dot {
      position: absolute; width: 2px; height: 6px; top: 50%;
      transform: translateY(-50%);
      background: var(--pages-neutral-8, #777);
      border-radius: 1px;
    }
    button {
      width: 24px; height: 24px; border-radius: 4px;
      border: 1px solid var(--pages-neutral-6, #888);
      background: var(--pages-neutral-3, #333);
      color: var(--pages-neutral-11, #ccc);
      cursor: pointer; font-size: 14px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
    }
    button:hover { background: var(--pages-neutral-5, #555); }
    :host(.dragging) { user-select: none; }
    @media (prefers-reduced-motion: reduce) {
      * { transition: none !important; }
    }
  `;

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('mousemove', this._onDragMove);
    window.removeEventListener('mouseup', this._onDragEnd);
  }

  @property({ type: Object }) effectiveRange: TimeRange = { from: 0, to: 0 };
  @property({ type: Object }) visibleRange: TimeRange = { from: 0, to: 0 };
  @property({ type: Array }) eventTimestamps: number[] = [];
  @state() private _dragMode: DragMode = null;
  @state() private _dragStartX = 0;
  @state() private _dragStartFrom = 0;
  @state() private _dragStartTo = 0;

  override render() {
    const duration = this.effectiveRange.to - this.effectiveRange.from;
    if (duration <= 0) return html`<div class="minimap-container" role="group" aria-label="Timeline zoom controls"></div>`;

    const brushLeft = ((this.visibleRange.from - this.effectiveRange.from) / duration) * 100;
    const brushWidth = ((this.visibleRange.to - this.visibleRange.from) / duration) * 100;

    return html`
      <div class="minimap-container" role="group" aria-label="Timeline zoom controls">
        <button aria-label="Zoom out" @click=${this._onZoomOut}>−</button>
        <div class="overview">
          ${this.eventTimestamps.map(ts => {
            const left = ((ts - this.effectiveRange.from) / duration) * 100;
            return html`<div class="density-dot" style="left: ${left}%"></div>`;
          })}
          <div
            class="brush"
            role="slider"
            tabindex="0"
            aria-label="Visible time range"
            aria-valuemin="${this.effectiveRange.from}"
            aria-valuemax="${this.effectiveRange.to}"
            aria-valuenow="${this.visibleRange.from}"
            style=${styleMap({ left: `${brushLeft}%`, width: `${brushWidth}%` })}
            @mousedown=${this._onBrushPanStart}
            @keydown=${this._onKeydown}
          >
            <div class="handle handle-left"
              aria-label="Resize left edge"
              @mousedown=${this._onHandleLeftStart}
            ></div>
            <div class="handle handle-right"
              aria-label="Resize right edge"
              @mousedown=${this._onHandleRightStart}
            ></div>
          </div>
        </div>
        <button aria-label="Zoom in" @click=${this._onZoomIn}>+</button>
      </div>
    `;
  }

  private _onZoomIn() { this._emitZoom('in'); }
  private _onZoomOut() { this._emitZoom('out'); }

  private _emitZoom(direction: 'in' | 'out') {
    const duration = this.visibleRange.to - this.visibleRange.from;
    const centre = this.visibleRange.from + duration / 2;
    const factor = direction === 'in' ? 0.7 : 1 / 0.7;
    const newDuration = duration * factor;
    const halfNew = newDuration / 2;
    const from = Math.max(centre - halfNew, this.effectiveRange.from);
    const to = Math.min(centre + halfNew, this.effectiveRange.to);
    this._emitChange(from, to);
  }

  private _onHandleLeftStart(e: MouseEvent) {
    e.stopPropagation();
    this._startDrag(e, 'resize-left');
  }

  private _onHandleRightStart(e: MouseEvent) {
    e.stopPropagation();
    this._startDrag(e, 'resize-right');
  }

  private _onBrushPanStart(e: MouseEvent) {
    this._startDrag(e, 'pan');
  }

  private _startDrag(e: MouseEvent, mode: DragMode) {
    e.preventDefault();
    this._dragMode = mode;
    this._dragStartX = e.clientX;
    this._dragStartFrom = this.visibleRange.from;
    this._dragStartTo = this.visibleRange.to;
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', this._onDragMove);
    window.addEventListener('mouseup', this._onDragEnd);
  }

  private _onDragMove = (e: MouseEvent) => {
    if (!this._dragMode) return;
    e.preventDefault();
    const overview = this.shadowRoot!.querySelector('.overview') as HTMLElement;
    if (!overview) return;
    const rect = overview.getBoundingClientRect();
    const totalDuration = this.effectiveRange.to - this.effectiveRange.from;
    const pxRatio = totalDuration / rect.width;
    const deltaMs = (e.clientX - this._dragStartX) * pxRatio;
    const minDuration = totalDuration * MIN_BRUSH_FRACTION;

    let from: number;
    let to: number;

    switch (this._dragMode) {
      case 'pan': {
        const duration = this._dragStartTo - this._dragStartFrom;
        from = this._dragStartFrom + deltaMs;
        to = from + duration;
        if (from < this.effectiveRange.from) { from = this.effectiveRange.from; to = from + duration; }
        if (to > this.effectiveRange.to) { to = this.effectiveRange.to; from = to - duration; }
        break;
      }
      case 'resize-left': {
        from = Math.max(this._dragStartFrom + deltaMs, this.effectiveRange.from);
        to = this._dragStartTo;
        if (to - from < minDuration) from = to - minDuration;
        break;
      }
      case 'resize-right': {
        from = this._dragStartFrom;
        to = Math.min(this._dragStartTo + deltaMs, this.effectiveRange.to);
        if (to - from < minDuration) to = from + minDuration;
        break;
      }
      default:
        return;
    }

    this._emitChange(from, to);
  };

  private _onDragEnd = () => {
    this._dragMode = null;
    document.body.style.userSelect = '';
    window.removeEventListener('mousemove', this._onDragMove);
    window.removeEventListener('mouseup', this._onDragEnd);
  };

  private _onKeydown(e: KeyboardEvent) {
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); this._emitPan(-1); break;
      case 'ArrowRight': e.preventDefault(); this._emitPan(1); break;
      case '+': case '=': e.preventDefault(); this._emitZoom('in'); break;
      case '-': e.preventDefault(); this._emitZoom('out'); break;
    }
  }

  private _emitPan(direction: number) {
    const duration = this.visibleRange.to - this.visibleRange.from;
    const panStep = duration * 0.1;
    const deltaMs = panStep * direction;
    let from = this.visibleRange.from + deltaMs;
    let to = from + duration;
    if (from < this.effectiveRange.from) { from = this.effectiveRange.from; to = from + duration; }
    if (to > this.effectiveRange.to) { to = this.effectiveRange.to; from = to - duration; }
    this._emitChange(from, to);
  }

  private _emitChange(from: number, to: number) {
    const totalDuration = this.effectiveRange.to - this.effectiveRange.from;
    this.dispatchEvent(new CustomEvent('summarisation-timeline:zoom:changed', {
      bubbles: true, composed: true,
      detail: { from, to, zoomLevel: totalDuration / (to - from) },
    }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'summarisation-minimap': SummarisationMinimap;
  }
}
