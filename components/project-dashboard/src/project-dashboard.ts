import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import type { ProjectDashboardData, LayerSummary, LayerHealth } from './types.js';

export const ProjectDashboardTopics = {
  LAYER_SELECTED: 'project.layer-selected',
} as const;

const HEALTH_COLORS: Record<LayerHealth, { bg: string; fg: string }> = {
  healthy:    { bg: 'var(--pages-success-3, #d4edda)', fg: 'var(--pages-success-11, #155724)' },
  degraded:   { bg: 'var(--pages-warning-3, #fff3cd)', fg: 'var(--pages-warning-11, #856404)' },
  incomplete: { bg: 'var(--pages-danger-3, #f8d7da)',  fg: 'var(--pages-danger-11, #721c24)' },
};

export function overallHealth(layers: readonly LayerSummary[]): LayerHealth {
  if (layers.some(l => l.health === 'incomplete')) return 'incomplete';
  if (layers.some(l => l.health === 'degraded')) return 'degraded';
  return 'healthy';
}

export interface ProjectDashboardProps {
  data: ProjectDashboardData | null;
  endpoint?: string;
  compact: boolean;
  selectionTopic: string;
}

@customElement('agency-project-dashboard')
export class ProjectDashboard extends LitElement {
  @property({ attribute: false }) data: ProjectDashboardData | null = null;
  @property() endpoint?: string;
  @property({ type: Boolean }) compact = false;
  @property({ attribute: 'selection-topic' }) selectionTopic = 'project.layer-selected';

  @state() private _fetchedData: ProjectDashboardData | null = null;
  @state() private _loading = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Project dashboard');
  }

  override willUpdate(changed: Map<PropertyKey, unknown>): void {
    if (changed.has('endpoint') && this.endpoint && !this.data) {
      this._fetchFromEndpoint();
    }
  }

  private async _fetchFromEndpoint(): Promise<void> {
    if (!this.endpoint) return;
    this._loading = true;
    try {
      const resp = await fetch(this.endpoint);
      if (resp.ok) {
        this._fetchedData = await resp.json() as ProjectDashboardData;
      }
    } finally {
      this._loading = false;
    }
  }

  private get _effectiveData(): ProjectDashboardData | null {
    return this.data ?? this._fetchedData;
  }

  private _onCardClick(layer: LayerSummary): void {
    emitPagesEvent(this, this.selectionTopic, {
      layerId: layer.id,
      layerLabel: layer.label,
    });
  }

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--pages-space-3, 0.75rem);
      padding: 0 var(--pages-space-2, 0.5rem);
    }
    .project-name { font-weight: 600; font-size: 16px; color: var(--pages-text-primary, #212529); }
    .health-badge {
      font-size: 12px;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: var(--pages-radius-2, 4px);
      text-transform: capitalize;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--pages-space-3, 0.75rem);
    }
    .card {
      border: 1px solid var(--pages-neutral-6, #dee2e6);
      border-radius: var(--pages-radius-3, 8px);
      padding: var(--pages-space-3, 0.75rem);
      cursor: pointer;
      transition: box-shadow 0.15s;
      background: var(--pages-surface, #fff);
    }
    .card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .card-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      font-size: 14px;
      color: var(--pages-text-primary, #212529);
      margin-bottom: 8px;
    }
    .card-icon { font-size: 18px; }
    .progress-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 13px;
      color: var(--pages-text-secondary, #6c757d);
    }
    .progress-track {
      flex: 1;
      height: 6px;
      background: var(--pages-neutral-4, #e9ecef);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }
    .progress-fill.healthy { background: var(--pages-success-9, #28a745); }
    .progress-fill.degraded { background: var(--pages-warning-9, #ffc107); }
    .progress-fill.incomplete { background: var(--pages-danger-9, #dc3545); }
    .metrics {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .metric-pill {
      font-size: 11px;
      padding: 1px 6px;
      border-radius: 8px;
      background: var(--pages-neutral-3, #f1f3f5);
      color: var(--pages-text-secondary, #6c757d);
    }
    .empty { color: var(--pages-text-tertiary, #999); font-style: italic; padding: 2rem; text-align: center; }
  `;

  override render() {
    if (this._loading) return html`<div class="empty">Loading...</div>`;
    const d = this._effectiveData;
    if (!d) return html`<div class="empty">No project data</div>`;

    const oh = overallHealth(d.layers);
    const ohColors = HEALTH_COLORS[oh];

    return html`
      <div class="header">
        <span class="project-name">${d.projectName}</span>
        <span class="health-badge"
              role="status"
              aria-live="polite"
              style="background:${ohColors.bg};color:${ohColors.fg}">${oh}</span>
      </div>
      <div class="grid">
        ${d.layers.map(layer => this._renderCard(layer))}
      </div>
    `;
  }

  private _renderCard(layer: LayerSummary) {
    const pct = layer.total > 0 ? Math.round((layer.completed / layer.total) * 100) : 0;
    const hc = HEALTH_COLORS[layer.health];
    return html`
      <div class="card"
           role="button"
           tabindex="0"
           aria-label="${layer.label}: ${layer.completed} of ${layer.total}, ${layer.health}"
           @click=${() => this._onCardClick(layer)}
           @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._onCardClick(layer); } }}>
        <div class="card-header">
          <span class="card-icon">${layer.icon}</span>
          <span>${layer.label}</span>
        </div>
        <div class="progress-row">
          <span>${layer.completed} / ${layer.total}</span>
          <div class="progress-track">
            <div class="progress-fill ${layer.health}"
                 role="progressbar"
                 aria-valuenow="${layer.completed}"
                 aria-valuemin="0"
                 aria-valuemax="${layer.total}"
                 style="width:${pct}%"></div>
          </div>
        </div>
        <span class="health-badge" style="background:${hc.bg};color:${hc.fg}">${layer.health}</span>
        ${!this.compact && layer.metrics?.length ? html`
          <div class="metrics">
            ${layer.metrics.map(m => html`<span class="metric-pill">${m.value} ${m.label}</span>`)}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-project-dashboard': ProjectDashboard;
  }
}
