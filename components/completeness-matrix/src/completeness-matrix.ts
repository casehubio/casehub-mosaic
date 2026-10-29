import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { CompletenessMatrixData, CompletionSignal, CompletionStatus } from './types.js';

const SIGNALS: readonly CompletionSignal[] = ['exists', 'configured', 'tested', 'deployed'];

const STATUS_INDICATOR: Record<CompletionStatus, { symbol: string; cssClass: string }> = {
  done:    { symbol: '●', cssClass: 'status-done' },
  partial: { symbol: '◐', cssClass: 'status-partial' },
  missing: { symbol: '○', cssClass: 'status-missing' },
};

export interface CompletenessMatrixProps {
  data: CompletenessMatrixData | null;
  endpoint?: string;
  compact: boolean;
}

@customElement('agency-completeness-matrix')
export class CompletenessMatrix extends LitElement {
  @property({ attribute: false }) data: CompletenessMatrixData | null = null;
  @property() endpoint?: string;
  @property({ type: Boolean }) compact = false;

  @state() private _fetchedData: CompletenessMatrixData | null = null;
  @state() private _loading = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Project completeness');
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
        this._fetchedData = await resp.json() as CompletenessMatrixData;
      }
    } finally {
      this._loading = false;
    }
  }

  private get _effectiveData(): CompletenessMatrixData | null {
    return this.data ?? this._fetchedData;
  }

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); }
    .matrix { width: 100%; border-collapse: collapse; }
    .matrix-header-row { border-bottom: 2px solid var(--pages-neutral-6, #dee2e6); }
    .matrix-header-row th {
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--pages-text-secondary, #6c757d);
      text-align: center;
      text-transform: capitalize;
    }
    .matrix-header-row th:first-child { text-align: left; }
    .matrix-row { border-bottom: 1px solid var(--pages-neutral-4, #e9ecef); }
    .matrix-row:last-child { border-bottom: none; }
    .layer-cell {
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      color: var(--pages-text-primary, #212529);
    }
    .layer-icon { font-size: 16px; }
    .signal-cell {
      padding: 8px 12px;
      text-align: center;
      font-size: 16px;
    }
    .status-done { color: var(--pages-success-9, #28a745); }
    .status-partial { color: var(--pages-warning-9, #ffc107); }
    .status-missing { color: var(--pages-danger-9, #dc3545); }
    .action-cell {
      padding: 8px 12px;
      font-size: 12px;
      color: var(--pages-text-tertiary, #999);
      font-style: italic;
    }
    .empty { color: var(--pages-text-tertiary, #999); font-style: italic; padding: 2rem; text-align: center; }
  `;

  override render() {
    if (this._loading) return html`<div class="empty">Loading...</div>`;
    const d = this._effectiveData;
    if (!d) return html`<div class="empty">No completeness data</div>`;

    return html`
      <table class="matrix" role="table">
        <thead>
          <tr class="matrix-header-row" role="row">
            <th role="columnheader">Layer</th>
            ${SIGNALS.map(s => html`<th role="columnheader">${s}</th>`)}
            ${!this.compact ? html`<th role="columnheader">Next</th>` : nothing}
          </tr>
        </thead>
        <tbody>
          ${d.layers.map(layer => html`
            <tr class="matrix-row" role="row">
              <td role="cell">
                <div class="layer-cell">
                  <span class="layer-icon">${layer.layerIcon}</span>
                  <span>${layer.layerLabel}</span>
                </div>
              </td>
              ${SIGNALS.map(signal => {
                const status = layer.signals[signal];
                const ind = STATUS_INDICATOR[status];
                return html`
                  <td class="signal-cell" role="cell" aria-label="${signal}: ${status}">
                    <span class="${ind.cssClass}">${ind.symbol}</span>
                  </td>
                `;
              })}
              ${!this.compact ? html`
                <td class="action-cell" role="cell">
                  ${layer.nextAction ?? ''}
                </td>
              ` : nothing}
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-completeness-matrix': CompletenessMatrix;
  }
}
