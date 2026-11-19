import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@casehubio/mosaic-connection-manager';

@customElement('mosaic-login-page')
export class LoginPage extends LitElement {
  @property({ attribute: false }) providers: readonly string[] = [];
  @property({ type: Boolean, attribute: 'passkey-enabled' }) passkeyEnabled = true;

  static override styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, system-ui);
      max-width: 400px;
      margin: 0 auto;
      padding: var(--pages-space-6, 2rem);
    }
    h1 {
      text-align: center;
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 var(--pages-space-5, 1.5rem);
      color: var(--pages-neutral-12, inherit);
    }
    .providers {
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-3, 0.75rem);
    }
    .providers mosaic-connect-button {
      display: block;
    }
    .divider {
      display: flex;
      align-items: center;
      gap: var(--pages-space-3, 0.75rem);
      margin: var(--pages-space-4, 1rem) 0;
      color: var(--pages-neutral-9, #888);
      font-size: 0.85rem;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-top: 1px solid var(--pages-neutral-6, #dee2e6);
    }
  `;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'main');
    this.setAttribute('aria-label', 'Sign in');
  }

  override render() {
    return html`
      <h1>Sign in</h1>
      <div class="providers" role="group" aria-label="Sign in options">
        ${this.providers.map(p => html`
          <mosaic-connect-button
            provider="${p}"
            mode="signin">
          </mosaic-connect-button>
        `)}
      </div>
      ${this.passkeyEnabled ? html`
        <div class="divider">or</div>
        <mosaic-passkey-authenticate></mosaic-passkey-authenticate>
      ` : nothing}
    `;
  }
}
