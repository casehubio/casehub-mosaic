import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import type { ServiceConnection, ProviderBrand } from '@casehubio/mosaic-core';
import { defaultBrandRegistry } from '../controllers/provider-brand-registry.js';
import { ConnectionManagerTopics } from '../topics.js';
import './scope-list.js';

const STATUS_LABELS: Record<string, string> = {
  CONNECTED: 'Connected',
  PARTIAL: 'Partial',
  DISCONNECTED: 'Disconnected',
};

const STATUS_BADGE_STYLES: Record<string, { bg: string; fg: string }> = {
  CONNECTED: { bg: 'var(--pages-success-3, rgba(40,167,69,0.15))', fg: 'var(--pages-success-11, #155724)' },
  PARTIAL: { bg: 'var(--pages-warning-3, rgba(255,193,7,0.15))', fg: 'var(--pages-warning-11, #856404)' },
  DISCONNECTED: { bg: 'var(--pages-neutral-3, rgba(108,117,125,0.15))', fg: 'var(--pages-neutral-11, #495057)' },
};

const ACTION_LABELS: Record<string, string> = {
  CONNECTED: 'Disconnect',
  PARTIAL: 'Grant Access',
  DISCONNECTED: 'Connect',
};

@customElement('mosaic-provider-status-row')
export class ProviderStatusRow extends LitElement {
  @property({ attribute: false }) connection!: ServiceConnection;
  @property({ attribute: false }) brand: ProviderBrand | null = null;
  @property({ type: Boolean }) loading = false;
  @property() error: string | null = null;

  private get resolvedBrand(): ProviderBrand | null {
    return this.brand ?? (this.connection ? defaultBrandRegistry.get(this.connection.provider) : null);
  }

  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--pages-neutral-4, rgba(0,0,0,0.1));
      border-radius: var(--pages-radius-2, 6px);
      font-family: var(--pages-font-family, system-ui);
      font-size: 0.875rem;
      position: relative;
    }
    .icon { display: flex; align-items: center; flex-shrink: 0; }
    .info { flex: 1; min-width: 0; }
    .provider-name { font-weight: 600; }
    .status-badge {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: var(--pages-radius-1, 4px);
      font-size: 0.75rem;
      font-weight: 500;
      margin-left: 0.5rem;
    }
    .scopes { margin-top: 0.25rem; }
    .action-btn {
      padding: 0.375rem 0.75rem;
      border: 1px solid var(--pages-neutral-6, rgba(0,0,0,0.15));
      border-radius: var(--pages-radius-2, 6px);
      background: var(--pages-neutral-1, rgba(255,255,255,0.9));
      color: inherit;
      cursor: pointer;
      font-size: 0.8125rem;
      font-family: inherit;
      flex-shrink: 0;
    }
    .action-btn:hover:not(:disabled) { background: var(--pages-neutral-3, rgba(0,0,0,0.05)); }
    .action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .loading-overlay {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.6);
      border-radius: inherit;
    }
    .spinner {
      width: 20px; height: 20px;
      border: 2px solid var(--pages-neutral-6, #ccc);
      border-top-color: var(--pages-primary, #3b82f6);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-msg { color: var(--pages-danger-11, #721c24); font-size: 0.75rem; margin-top: 0.25rem; }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.updateAriaLabel();
  }

  override updated(changed: PropertyValues): void {
    if (changed.has('connection')) {
      this.updateAriaLabel();
    }
  }

  private updateAriaLabel(): void {
    if (!this.connection) return;
    const brand = this.resolvedBrand;
    const name = brand?.displayName ?? this.connection.provider;
    const status = STATUS_LABELS[this.connection.status] ?? this.connection.status;
    this.setAttribute('aria-label', `${name} — ${status}`);
  }

  override render() {
    if (!this.connection) return nothing;

    const brand = this.resolvedBrand;
    const name = brand?.displayName ?? this.connection.provider;
    const status = this.connection.status;
    const badgeStyle = STATUS_BADGE_STYLES[status];
    const hasScopes = this.connection.grantedScopes.length > 0 || this.connection.missingScopes.length > 0;

    return html`
      ${brand?.icon ? html`<span class="icon">${unsafeHTML(brand.icon)}</span>` : nothing}
      <div class="info">
        <span class="provider-name">${name}</span>
        <span class="status-badge" style="background:${badgeStyle?.bg};color:${badgeStyle?.fg}">
          ${STATUS_LABELS[status]}
        </span>
        ${hasScopes ? html`
          <div class="scopes">
            <mosaic-scope-list
              .grantedScopes=${this.connection.grantedScopes}
              .missingScopes=${this.connection.missingScopes}>
            </mosaic-scope-list>
          </div>
        ` : nothing}
        ${this.error ? html`<div class="error-msg" role="alert">${this.error}</div>` : nothing}
      </div>
      <button class="action-btn" ?disabled=${this.loading} @click=${this.handleAction}>
        ${ACTION_LABELS[status]}
      </button>
      ${this.loading ? html`<div class="loading-overlay"><span class="spinner"></span></div>` : nothing}
    `;
  }

  private handleAction(): void {
    if (!this.connection) return;
    const { status, provider, missingScopes } = this.connection;
    switch (status) {
      case 'CONNECTED':
        emitPagesEvent(this, ConnectionManagerTopics.DISCONNECT, { provider });
        break;
      case 'PARTIAL':
        emitPagesEvent(this, ConnectionManagerTopics.CONSENT, { provider, missingScopes: [...missingScopes] });
        break;
      case 'DISCONNECTED':
        emitPagesEvent(this, ConnectionManagerTopics.CONNECT, { provider });
        break;
    }
  }
}
