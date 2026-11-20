import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import type { ProviderBrand } from '@casehubio/mosaic-core';
import { defaultBrandRegistry } from '../controllers/provider-brand-registry.js';
import { OAuthFlowController } from '../controllers/oauth-flow-controller.js';
import { ConnectionManagerTopics } from '../topics.js';

@customElement('mosaic-connect-button')
export class ConnectButton extends LitElement {
  @property() provider = '';
  @property() mode: 'connect' | 'signin' = 'connect';
  @property({ attribute: 'authorization-url' }) authorizationUrl: string | null = null;
  @property({ attribute: 'expected-origin' }) expectedOrigin: string | null = null;
  @property({ attribute: 'oauth-state' }) oauthState: string | null = null;
  @property({ attribute: false }) brand: ProviderBrand | null = null;
  @property({ type: Boolean }) loading = false;
  @property() error: string | null = null;
  @property({ type: Boolean }) disabled = false;

  private flowController = new OAuthFlowController();

  private get resolvedBrand(): ProviderBrand | null {
    return this.brand ?? defaultBrandRegistry.get(this.provider);
  }

  static override styles = css`
    :host { display: inline-block; }
    button {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 1rem; border: 1px solid var(--pages-neutral-6, #dee2e6);
      border-radius: var(--pages-radius-2, 6px); cursor: pointer;
      font-family: var(--pages-font-family, system-ui); font-size: 0.875rem;
      color: #fff; transition: opacity 0.15s;
    }
    button:hover:not(:disabled) { opacity: 0.9; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .icon { display: flex; align-items: center; }
    .spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error { color: var(--pages-danger-11, #721c24); font-size: 0.75rem; margin-top: 0.25rem; }
  `;

  override render() {
    const brand = this.resolvedBrand;
    const label = this.mode === 'signin' ? 'Sign in with' : 'Connect with';
    const displayName = brand?.displayName ?? this.provider;
    const bgColor = brand?.brandColor ?? 'var(--pages-neutral-9, #333)';

    return html`
      <button
        style="background: ${bgColor}"
        aria-label="${label} ${displayName}"
        ?disabled=${this.disabled || this.loading}
        @click=${this.handleClick}>
        ${this.loading
          ? html`<span class="spinner"></span>`
          : brand?.icon ? html`<span class="icon">${unsafeHTML(brand.icon)}</span>` : nothing}
        ${label} ${displayName}
      </button>
      ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
    `;
  }

  private async handleClick() {
    if (this.authorizationUrl && this.expectedOrigin) {
      this.loading = true;
      this.error = null;
      try {
        const result = await this.flowController.start({
          authorizationUrl: this.authorizationUrl,
          state: this.oauthState ?? new URL(this.authorizationUrl).searchParams.get('state') ?? '',
          expectedOrigin: this.expectedOrigin,
        });
        emitPagesEvent(this, ConnectionManagerTopics.OAUTH_COMPLETE, {
          provider: this.provider, ...result,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'OAuth flow failed';
        this.error = message;
        emitPagesEvent(this, ConnectionManagerTopics.OAUTH_ERROR, {
          provider: this.provider, error: message,
        });
      } finally {
        this.loading = false;
      }
    } else {
      emitPagesEvent(this, ConnectionManagerTopics.CONNECT, { provider: this.provider });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.flowController.cancel();
  }
}
