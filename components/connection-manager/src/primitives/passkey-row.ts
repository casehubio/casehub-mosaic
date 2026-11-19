import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { emitPagesEvent } from '@casehubio/pages-data';
import type { WebAuthnCredential, AuthenticatorTransport } from '@casehubio/mosaic-core';
import { ConnectionManagerTopics } from '../topics.js';

const TRANSPORT_LABELS: Record<AuthenticatorTransport, string> = {
  usb: 'USB',
  ble: 'BLE',
  nfc: 'NFC',
  internal: 'Built-in',
  hybrid: 'Hybrid',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

@customElement('mosaic-passkey-row')
export class PasskeyRow extends LitElement {
  @property({ attribute: false }) credential: WebAuthnCredential | null = null;
  @property({ type: Boolean }) loading = false;
  @property() error: string | null = null;

  static override styles = css`
    :host {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      font-family: var(--pages-font-family, system-ui); font-size: 0.875rem;
      border-bottom: 1px solid var(--pages-neutral-4, rgba(0,0,0,0.1));
    }
    .name { font-weight: 500; flex: 1; }
    .transports { display: flex; gap: 0.25rem; }
    .transport {
      font-size: 0.7rem; padding: 0.125rem 0.375rem;
      background: var(--pages-neutral-3, rgba(0,0,0,0.05));
      border-radius: var(--pages-radius-1, 4px);
      color: var(--pages-neutral-11, inherit);
    }
    .time { color: var(--pages-neutral-9, #888); font-size: 0.8rem; }
    .revoke-btn {
      background: none; border: 1px solid var(--pages-danger-7, #e57373);
      color: var(--pages-danger-11, #c62828); border-radius: var(--pages-radius-1, 4px);
      padding: 0.25rem 0.5rem; cursor: pointer; font-size: 0.8rem;
      font-family: inherit;
    }
    .revoke-btn:hover { background: var(--pages-danger-3, rgba(198,40,40,0.1)); }
    .revoke-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .error { color: var(--pages-danger-11, #c62828); font-size: 0.75rem; }
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid var(--pages-neutral-6, rgba(0,0,0,0.15));
      border-top-color: var(--pages-neutral-11, #333); border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'listitem');
    this.updateAriaLabel();
  }

  override updated(): void {
    this.updateAriaLabel();
  }

  private updateAriaLabel(): void {
    if (this.credential) {
      this.setAttribute('aria-label', `Passkey: ${this.credential.displayName}`);
    }
  }

  override render() {
    if (!this.credential) return nothing;
    const c = this.credential;

    return html`
      <span class="name">${c.displayName}</span>
      <span class="transports">
        ${c.transports.map(t => html`<span class="transport">${TRANSPORT_LABELS[t] ?? t}</span>`)}
      </span>
      <span class="time">${c.lastUsedAt ? relativeTime(c.lastUsedAt) : 'Never'}</span>
      ${this.loading
        ? html`<span class="spinner"></span>`
        : html`<button class="revoke-btn" ?disabled=${this.loading} @click=${this.handleRevoke}>Revoke</button>`}
      ${this.error ? html`<span class="error" role="alert">${this.error}</span>` : nothing}
    `;
  }

  private handleRevoke(): void {
    if (this.credential) {
      emitPagesEvent(this, ConnectionManagerTopics.PASSKEY_REVOKE, {
        credentialId: this.credential.credentialId,
      });
    }
  }
}
