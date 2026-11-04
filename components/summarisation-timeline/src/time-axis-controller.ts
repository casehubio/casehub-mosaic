import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { TimeRange } from '@casehubio/mosaic-core';

const ZOOM_FACTOR = 0.7;
const PAN_FRACTION = 0.1;

export class TimeAxisController implements ReactiveController {
  private _effectiveRange: TimeRange = { from: 0, to: 0 };
  private _visibleRange: TimeRange = { from: 0, to: 0 };
  private _containerWidth = 0;

  constructor(private host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected() {}
  hostDisconnected() {}

  get effectiveRange(): TimeRange { return this._effectiveRange; }
  get visibleRange(): TimeRange { return this._visibleRange; }
  get containerWidth(): number { return this._containerWidth; }

  get pixelsPerMs(): number {
    const duration = this._visibleRange.to - this._visibleRange.from;
    return duration > 0 ? this._containerWidth / duration : 0;
  }

  setEffectiveRange(range: TimeRange) {
    this._effectiveRange = range;
    this._visibleRange = { ...range };
    this.host.requestUpdate();
  }

  setContainerWidth(width: number) {
    this._containerWidth = width;
    this.host.requestUpdate();
  }

  setBrush(from: number, to: number) {
    this._visibleRange = {
      from: Math.max(from, this._effectiveRange.from),
      to: Math.min(to, this._effectiveRange.to),
    };
    this.host.requestUpdate();
  }

  zoomIn(centreMs?: number) {
    this._zoom(ZOOM_FACTOR, centreMs);
  }

  zoomOut(centreMs?: number) {
    this._zoom(1 / ZOOM_FACTOR, centreMs);
  }

  panLeft() {
    const duration = this._visibleRange.to - this._visibleRange.from;
    const shift = duration * PAN_FRACTION;
    this._pan(-shift);
  }

  panRight() {
    const duration = this._visibleRange.to - this._visibleRange.from;
    const shift = duration * PAN_FRACTION;
    this._pan(shift);
  }

  private _zoom(factor: number, centreMs?: number) {
    const duration = this._visibleRange.to - this._visibleRange.from;
    const centre = centreMs ?? (this._visibleRange.from + duration / 2);
    const newDuration = duration * factor;
    const halfNew = newDuration / 2;
    this._visibleRange = {
      from: Math.max(centre - halfNew, this._effectiveRange.from),
      to: Math.min(centre + halfNew, this._effectiveRange.to),
    };
    this.host.requestUpdate();
  }

  private _pan(deltaMs: number) {
    const duration = this._visibleRange.to - this._visibleRange.from;
    let from = this._visibleRange.from + deltaMs;
    let to = this._visibleRange.to + deltaMs;
    if (from < this._effectiveRange.from) {
      from = this._effectiveRange.from;
      to = from + duration;
    }
    if (to > this._effectiveRange.to) {
      to = this._effectiveRange.to;
      from = to - duration;
    }
    this._visibleRange = { from, to };
    this.host.requestUpdate();
  }
}
