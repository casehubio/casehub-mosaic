import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import { ConnectionManagerTopics } from '../topics.js';

@customElement('mosaic-passkey-authenticate')
export class PasskeyAuthenticateButton extends LitElement {
  @property({ attribute: false }) challengeOptions: PublicKeyCredentialRequestOptions | null = null;
  @property({ type: Boolean }) loading = false;
  @property() error: string | null = null;
  @property({ type: Boolean }) disabled = false;

  static override styles = css`
    :host { display: inline-block; }
    button {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.625rem 1rem;
      border: 1px solid var(--pages-neutral-6, rgba(0,0,0,0.15));
      border-radius: var(--pages-radius-2, 6px); cursor: pointer;
      font-family: var(--pages-font-family, system-ui); font-size: 0.875rem;
      background: var(--pages-neutral-9, #333);
      color: #fff; transition: opacity 0.15s;
    }
    button:hover:not(:disabled) { opacity: 0.9; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff; border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error { color: var(--pages-danger-11, #c62828); font-size: 0.75rem; margin-top: 0.25rem; }
  `;

  override render() {
    return html`
      <button
        aria-label="Sign in with passkey"
        ?disabled=${this.disabled || this.loading}
        @click=${this.handleClick}>
        ${this.loading ? html`<span class="spinner"></span>` : nothing}
        Sign in with passkey
      </button>
      ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
    `;
  }

  private async handleClick() {
    if (!this.challengeOptions) {
      emitPagesEvent(this, ConnectionManagerTopics.PASSKEY_AUTHENTICATE_REQUEST, {});
      return;
    }

    this.loading = true;
    this.error = null;
    try {
      const credential = await navigator.credentials.get({
        publicKey: this.challengeOptions,
      });
      emitPagesEvent(this, ConnectionManagerTopics.PASSKEY_AUTHENTICATED, { credential });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      this.error = message;
      emitPagesEvent(this, ConnectionManagerTopics.PASSKEY_AUTHENTICATE_ERROR, { error: message });
    } finally {
      this.loading = false;
    }
  }
}
