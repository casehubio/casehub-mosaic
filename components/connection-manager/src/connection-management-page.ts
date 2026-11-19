import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ServiceConnection, WebAuthnCredential } from '@casehubio/mosaic-core';
import './primitives/provider-status-row.js';
import './primitives/passkey-row.js';
import './primitives/passkey-register-button.js';

@customElement('mosaic-connection-management')
export class ConnectionManagementPage extends LitElement {
  @property({ attribute: false }) connections: readonly ServiceConnection[] = [];
  @property({ attribute: false }) credentials: readonly WebAuthnCredential[] = [];
  @property({ attribute: false }) providers: readonly string[] = [];

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Connection management');
  }

  static override styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, system-ui);
      color: var(--pages-neutral-12, inherit);
    }
    h2 {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 0.75rem;
      color: var(--pages-neutral-12, inherit);
    }
    .section {
      margin-bottom: 1.5rem;
    }
    .list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .empty {
      padding: 1rem;
      text-align: center;
      color: var(--pages-neutral-9, #888);
      border: 1px dashed var(--pages-neutral-6, #dee2e6);
      border-radius: var(--pages-radius-2, 6px);
      font-size: 0.875rem;
    }
    .register-row {
      margin-top: 0.75rem;
    }
  `;

  override render() {
    return html`
      <div class="section">
        <h2>Service Connections</h2>
        ${this.connections.length > 0
          ? html`
            <div class="list" role="list" aria-label="Service connections">
              ${this.connections.map(conn => html`
                <mosaic-provider-status-row
                  .connection=${conn}
                ></mosaic-provider-status-row>
              `)}
            </div>`
          : html`<div class="empty">No service connections configured.</div>`
        }
      </div>

      <div class="section">
        <h2>Passkeys</h2>
        ${this.credentials.length > 0
          ? html`
            <div class="list" role="list" aria-label="Passkeys">
              ${this.credentials.map(cred => html`
                <mosaic-passkey-row
                  .credential=${cred}
                ></mosaic-passkey-row>
              `)}
            </div>`
          : html`<div class="empty">No passkeys registered.</div>`
        }
        <div class="register-row">
          <mosaic-passkey-register></mosaic-passkey-register>
        </div>
      </div>
    `;
  }
}
