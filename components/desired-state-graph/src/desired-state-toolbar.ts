import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { formatTimestamp } from '@casehubio/mosaic-core';

@customElement('agency-desired-state-toolbar')
export class DesiredStateToolbar extends LitElement {
  @property({ type: Number }) nodeCount = 0;
  @property({ type: Number }) convergedCount = 0;
  @property({ type: Number }) driftedCount = 0;
  @property({ type: Number }) faultedCount = 0;
  @property({ attribute: false }) lastReconciled: string | null = null;

  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 6px 12px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 11px;
      color: #a6adc8;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .stat { display: flex; align-items: center; gap: 4px; }
    .dot { width: 6px; height: 6px; border-radius: 50%; }
    .dot.converged { background: #a6e3a1; }
    .dot.drifted { background: #f9e2af; }
    .dot.faulted { background: #f38ba8; }
    .spacer { flex: 1; }
    .stale-warning { color: #f9e2af; }
    .stale-critical { color: #f38ba8; }
  `;

  private _stalenessClass(): string {
    if (!this.lastReconciled) return '';
    const age = Date.now() - new Date(this.lastReconciled).getTime();
    if (age > 15 * 60_000) return 'stale-critical';
    if (age > 5 * 60_000) return 'stale-warning';
    return '';
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
  }

  override render() {
    const staleClass = this._stalenessClass();
    return html`
      <span class="stat">${this.nodeCount} nodes</span>
      <span class="stat"><span class="dot converged"></span>${this.convergedCount} converged</span>
      <span class="stat"><span class="dot drifted"></span>${this.driftedCount} drifted</span>
      <span class="stat"><span class="dot faulted"></span>${this.faultedCount} faulted</span>
      <span class="spacer"></span>
      ${this.lastReconciled ? html`
        <span class="stat ${staleClass}">
          Reconciled ${formatTimestamp(this.lastReconciled)}
        </span>
      ` : nothing}
    `;
  }
}
