import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import {
  type SummarisationSnapshot, type LineageIndex,
  type RawEvent, type SummarisedEvent, type PhaseSummary,
  type TimePositionedStep, type DecisionNarrative,
  buildLineageIndex, computeEffectiveTimeRange,
} from '@casehubio/mosaic-core';
import { DataSourceMixin, DataSourceAdapter } from '@casehubio/pages-component';
import { createTypedFetchSource, EMPTY_DATASET } from '@casehubio/pages-data';
import type { SourceFactory, TypedDataSet } from '@casehubio/pages-data';
import { TimeAxisController } from './time-axis-controller.js';
import {
  computeLineagePaths, renderLineageOverlay, type LineagePath,
} from './lineage-overlay.js';
import { renderTooltip } from './tooltip.js';
import { timelineShellStyles } from './styles.js';
import type { HoverState } from './types.js';
import './lane-l1.js';
import './lane-l2.js';
import './lane-l3.js';
import './lane-l4.js';
import './minimap.js';

interface HasGetElementRect {
  getElementRect(id: string): DOMRect | null;
}

interface LaneRef {
  el: HasGetElementRect;
  lane: 'l1' | 'l2' | 'l3';
}

interface NarrativeResponse {
  steps: TimePositionedStep[];
  narrative?: DecisionNarrative;
}

export interface SummarisationTimelineProps {
  data?: SummarisationSnapshot;
  narrativeEndpoint?: string;
  classificationColours?: Record<string, string>;
  timestampFormat?: 'utc' | 'local';
}

@customElement('agency-summarisation-timeline')
export class SummarisationTimeline extends DataSourceMixin(LitElement) {
  static override styles = [timelineShellStyles, css`
    .tooltip {
      position: absolute;
      z-index: 20;
      background: var(--pages-neutral-1, #fff);
      border: 1px solid var(--pages-neutral-5, #ccc);
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      max-width: 300px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      pointer-events: none;
      animation: tooltipFadeIn 0.15s ease;
    }
    .tooltip.pinned {
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      border-color: var(--pages-accent-7, #4d99cc);
    }
    @keyframes tooltipFadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .tooltip-header { font-weight: 600; margin-bottom: 4px; }
    .tooltip-row { margin: 2px 0; }
    .tooltip-section { margin-top: 6px; padding-top: 4px; border-top: 1px solid var(--pages-neutral-3, #eee); }
  `];

  @property({ type: Object }) data?: SummarisationSnapshot;
  @property({ type: String, attribute: 'narrative-endpoint' }) narrativeEndpoint?: string;
  @property({ type: Object }) classificationColours?: Record<string, string>;
  @property({ attribute: 'timestamp-format' }) timestampFormat: 'utc' | 'local' = 'local';

  @state() private _snapshot?: SummarisationSnapshot;
  @state() private _narrativeSteps: TimePositionedStep[] = [];
  @state() private _narrativeData: DecisionNarrative | undefined;
  private _narrativeSource?: DataSourceAdapter;
  @state() private _lineageIndex: LineageIndex = { upward: new Map(), downward: new Map() };
  @state() private _hoverState: HoverState = { eventId: null, lane: null };
  @state() private _highlightedIds: string[] = [];
  @state() private _tooltipEvent: { id?: string; [k: string]: unknown } | null = null;
  @state() private _tooltipLane: 'l1' | 'l2' | 'l3' | 'l4' | null = null;
  @state() private _tooltipPos: { x: number; y: number } | null = null;
  @state() private _tooltipPinned = false;
  @state() private _lineagePaths: LineagePath[] = [];
  private _selectHandledClick = false;

  @query('.lanes-container') private _lanesContainer!: HTMLElement;

  private _timeAxis = new TimeAxisController(this);
  private _resizeObserver?: ResizeObserver;

  override resolveEndpoint(): string | undefined {
    if (this.data) return undefined;
    return this.endpoint;
  }

  override createSourceFactory(): SourceFactory {
    return (url) => createTypedFetchSource<SummarisationSnapshot>(url, (snapshot, sink) => {
      this._snapshot = snapshot;
      if (!this.narrativeEndpoint) {
        this._narrativeSteps = snapshot.steps;
        this._narrativeData = snapshot.narrative;
      }
      sink.apply({ type: 'snapshot', dataset: EMPTY_DATASET as TypedDataSet });
    });
  }

  private _initNarrativeSource() {
    this._narrativeSource = new DataSourceAdapter(this, {
      sourceFactory: (url) => createTypedFetchSource<NarrativeResponse>(url, (data, sink) => {
        this._narrativeSteps = data.steps;
        this._narrativeData = data.narrative;
        sink.apply({ type: 'snapshot', dataset: EMPTY_DATASET as TypedDataSet });
      }),
    });
    this._narrativeSource.endpoint = this.narrativeEndpoint;
  }

  override connectedCallback() {
    super.connectedCallback();
    this._resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this._timeAxis.setContainerWidth(entry.contentRect.width);
        this._updateLineagePaths();
      }
    });
    if (this.narrativeEndpoint) {
      this._initNarrativeSource();
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._narrativeSource?.dispose();
  }

  override firstUpdated() {
    if (this._lanesContainer) {
      this._resizeObserver?.observe(this._lanesContainer);
    }
  }

  override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('data') && this.data) {
      this._snapshot = this.data;
      if (!this.narrativeEndpoint) {
        this._narrativeSteps = this.data.steps;
        this._narrativeData = this.data.narrative;
      }
    }
    if (changed.has('narrativeEndpoint') && this.narrativeEndpoint) {
      if (!this._narrativeSource) {
        this._initNarrativeSource();
      } else {
        this._narrativeSource.endpoint = this.narrativeEndpoint;
      }
    }
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('_snapshot') && this._snapshot) {
      const effectiveRange = computeEffectiveTimeRange(this._snapshot);
      this._timeAxis.setEffectiveRange(effectiveRange);
      this._lineageIndex = buildLineageIndex(
        this._snapshot.rawEvents, this._snapshot.summarisedEvents, this._snapshot.phaseSummaries,
      );
      requestAnimationFrame(() => requestAnimationFrame(() => this._updateLineagePaths()));
    }
  }

  private _hasData(): boolean {
    return !!(this._snapshot && (
      this._snapshot.rawEvents.length > 0 ||
      this._snapshot.summarisedEvents.length > 0 ||
      this._snapshot.phaseSummaries.length > 0 ||
      this._narrativeSteps.length > 0
    ));
  }

  override render() {
    if (this.error) return this._renderError();
    if (this.loading || !this._snapshot) return this._renderLoading();
    if (!this._hasData()) return this._renderEmpty();

    const vr = this._timeAxis.visibleRange;
    const cw = this._timeAxis.containerWidth;
    const allTimestamps = [
      ...this._snapshot.rawEvents.map((e: RawEvent) => e.timestamp),
      ...this._snapshot.summarisedEvents.map((e: SummarisedEvent) => e.from),
      ...this._snapshot.phaseSummaries.map((p: PhaseSummary) => p.from),
    ];

    return html`
      <div role="group" aria-label="Summarisation timeline: ${this._snapshot.pipelineName}" tabindex="0" @keydown=${this._onKeyDown}>
        <summarisation-minimap
          .effectiveRange=${this._timeAxis.effectiveRange}
          .visibleRange=${vr}
          .eventTimestamps=${allTimestamps}
          @summarisation-timeline:zoom:changed=${this._onZoomChanged}
        ></summarisation-minimap>

        <div class="timeline-wrapper">
          <div class="lanes-container"
            @summarisation-timeline:lineage:highlighted=${this._onLineageHighlighted}
            @summarisation-timeline:event:selected=${this._onEventSelected}
            @summarisation-timeline:event:hovered=${this._onEventHovered}
            @click=${this._onContainerClick}
            @wheel=${this._onWheel}
          >
            ${this._snapshot.rawEvents.length > 0 ? html`
              <div class="lane-label">L1 — Raw Events</div>
              <summarisation-lane-l1
                .rawEvents=${this._snapshot.rawEvents}
                .visibleRange=${vr}
                .containerWidth=${cw}
                .classificationColours=${this.classificationColours}
                .hoveredEventId=${this._hoverState.eventId}
                .highlightedIds=${this._highlightedIds}
              ></summarisation-lane-l1>
            ` : nothing}

            ${this._snapshot.summarisedEvents.length > 0 ? html`
              <div class="lane-label">L2 — Episodes</div>
              <summarisation-lane-l2
                .summarisedEvents=${this._snapshot.summarisedEvents}
                .visibleRange=${vr}
                .containerWidth=${cw}
                .classificationColours=${this.classificationColours}
                .hoveredEventId=${this._hoverState.eventId}
                .highlightedIds=${this._highlightedIds}
              ></summarisation-lane-l2>
            ` : nothing}

            ${this._snapshot.phaseSummaries.length > 0 ? html`
              <div class="lane-label">L3 — Phases</div>
              <summarisation-lane-l3
                .phaseSummaries=${this._snapshot.phaseSummaries}
                .visibleRange=${vr}
                .containerWidth=${cw}
                .classificationColours=${this.classificationColours}
                .hoveredEventId=${this._hoverState.eventId}
                .highlightedIds=${this._highlightedIds}
              ></summarisation-lane-l3>
            ` : nothing}

            ${this._narrativeSteps.length > 0 ? html`
              <div class="lane-label">L4 — Narrative</div>
              <summarisation-lane-l4
                .steps=${this._narrativeSteps}
                .narrative=${this._narrativeData}
                .visibleRange=${vr}
                .containerWidth=${cw}
              ></summarisation-lane-l4>
            ` : nothing}

            <svg class="svg-overlay" xmlns="http://www.w3.org/2000/svg">
              ${renderLineageOverlay(this._lineagePaths, this._hoverState.eventId != null)}
            </svg>
          </div>
        </div>

        ${renderTooltip(
          this._tooltipEvent, this._tooltipLane, this._tooltipPos,
          this.timestampFormat,
          this._getUpwardLabels(), this._getDownwardCount(),
          this._tooltipPinned,
        )}
      </div>
    `;
  }

  private _renderLoading() {
    return html`
      <div class="loading-skeleton" role="status" aria-label="Loading summarisation data">
        <div class="skeleton-lane"></div>
        <div class="skeleton-lane"></div>
        <div class="skeleton-lane"></div>
        <div class="skeleton-lane"></div>
      </div>
    `;
  }

  private _renderEmpty() {
    return html`
      <div class="empty-state" role="status">
        No summarisation data available.
      </div>
    `;
  }

  private _renderError() {
    return html`
      <div class="error-state" role="alert">
        Failed to load summarisation data.
        <button @click=${() => { this.dataSource.refresh(); }}>
          Retry
        </button>
      </div>
    `;
  }

  private _onZoomChanged(e: CustomEvent) {
    this._timeAxis.setBrush(e.detail.from, e.detail.to);
    this._updateLineagePaths();
  }

  private _onWheel(e: WheelEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    if (e.deltaY < 0) this._timeAxis.zoomIn();
    else this._timeAxis.zoomOut();
    this._updateLineagePaths();
  }

  private _onLineageHighlighted(e: CustomEvent) {
    const { sourceIds, targetIds } = e.detail;
    if (sourceIds.length === 0 && targetIds.length === 0) {
      this._hoverState = { eventId: null, lane: null };
      this._highlightedIds = [];
    } else {
      const hoveredId: string = sourceIds[0] ?? targetIds[0] ?? '';
      const lane = this._resolveEventLane(hoveredId);
      this._hoverState = { eventId: hoveredId, lane };
      this._highlightedIds = [...sourceIds, ...targetIds];
    }
    this._updateLineagePaths();
  }

  private _onEventSelected(e: CustomEvent) {
    const { event: ev, lane } = e.detail;
    this._tooltipEvent = ev;
    this._tooltipLane = lane;
    this._tooltipPinned = true;
    this._selectHandledClick = true;
    const target = e.composedPath()[0] as HTMLElement;
    if (target) {
      this._positionTooltip(target);
    }
  }

  private _onEventHovered(e: CustomEvent) {
    const { event: ev, lane } = e.detail;
    if (!ev) {
      if (!this._tooltipPinned) {
        this._tooltipEvent = null;
        this._tooltipPos = null;
        this._tooltipLane = null;
      }
      return;
    }
    if (this._tooltipPinned) return;
    this._tooltipEvent = ev;
    this._tooltipLane = lane;
    const target = e.composedPath()[0] as HTMLElement;
    if (target) {
      this._positionTooltip(target);
    }
  }

  private _onContainerClick() {
    if (this._selectHandledClick) {
      this._selectHandledClick = false;
      return;
    }
    if (this._tooltipPinned) {
      this._tooltipPinned = false;
      this._tooltipEvent = null;
      this._tooltipPos = null;
      this._tooltipLane = null;
    }
  }

  private _onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this._tooltipPinned) {
      this._tooltipPinned = false;
      this._tooltipEvent = null;
      this._tooltipPos = null;
      this._tooltipLane = null;
    }
  }

  private _positionTooltip(target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    const host = this.getBoundingClientRect();
    const tooltipWidth = 300;
    let x = rect.left - host.left + rect.width / 2;
    x = Math.max(0, Math.min(x, host.width - tooltipWidth));
    let y = rect.top - host.top - 10;
    if (y < 0) {
      y = rect.bottom - host.top + 10;
    }
    this._tooltipPos = { x, y };
  }

  private _resolveEventLane(id: string): 'l1' | 'l2' | 'l3' | 'l4' | null {
    if (this._snapshot?.rawEvents.some((e: RawEvent) => e.id === id)) return 'l1';
    if (this._snapshot?.summarisedEvents.some((e: SummarisedEvent) => e.id === id)) return 'l2';
    if (this._snapshot?.phaseSummaries.some((e: PhaseSummary) => e.id === id)) return 'l3';
    return null;
  }

  private _getLaneElements(): LaneRef[] {
    const refs: LaneRef[] = [];
    const tags: Array<{ tag: string; lane: 'l1' | 'l2' | 'l3' }> = [
      { tag: 'summarisation-lane-l1', lane: 'l1' },
      { tag: 'summarisation-lane-l2', lane: 'l2' },
      { tag: 'summarisation-lane-l3', lane: 'l3' },
    ];
    for (const { tag, lane } of tags) {
      const el = this.shadowRoot?.querySelector(tag);
      if (el && 'getElementRect' in el) {
        refs.push({ el: el as unknown as HasGetElementRect, lane });
      }
    }
    return refs;
  }

  private _updateLineagePaths() {
    if (!this._lanesContainer) return;
    const svgEl = this._lanesContainer.querySelector('svg');
    if (!svgEl) return;
    const svgRect = svgEl.getBoundingClientRect();

    const lanes = this._getLaneElements();
    this._lineagePaths = computeLineagePaths(
      this._lineageIndex,
      this._hoverState,
      this._highlightedIds,
      (id: string) => {
        for (const lane of lanes) {
          const rect = lane.el.getElementRect(id);
          if (rect) return rect;
        }
        return null;
      },
      (id: string) => {
        if (this._snapshot?.rawEvents.some((e: RawEvent) => e.id === id)) return 'l1';
        if (this._snapshot?.summarisedEvents.some((e: SummarisedEvent) => e.id === id)) return 'l2';
        if (this._snapshot?.phaseSummaries.some((e: PhaseSummary) => e.id === id)) return 'l3';
        return null;
      },
      svgRect,
    );
  }

  private _getUpwardLabels(): string[] {
    if (!this._tooltipEvent || !this._tooltipLane) return [];
    const eventId = this._tooltipEvent?.id;
    if (!eventId) return [];
    const upIds = this._lineageIndex.upward.get(eventId) ?? [];
    return upIds.map((id: string) => {
      const ev = this._snapshot?.summarisedEvents.find((e: SummarisedEvent) => e.id === id);
      if (ev) return ev.label;
      const phase = this._snapshot?.phaseSummaries.find((p: PhaseSummary) => p.id === id);
      return phase?.label ?? id;
    });
  }

  private _getDownwardCount(): number {
    if (!this._tooltipEvent || !this._tooltipLane) return 0;
    const eventId = this._tooltipEvent?.id;
    if (!eventId) return 0;
    return (this._lineageIndex.downward.get(eventId) ?? []).length;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-summarisation-timeline': SummarisationTimeline;
  }
}
