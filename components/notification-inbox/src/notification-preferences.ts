import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { WorkIdentity } from '@casehubio/mosaic-core';
import './channel-preferences.js';
import './mute-list.js';
import './snooze-control.js';

export interface NotificationPreferencesProps {
  endpoint?: string;
  identity?: WorkIdentity;
}

@customElement('agency-notification-preferences')
export class NotificationPreferencesEl extends LitElement {
  @property({ type: String }) endpoint?: string;
  @property({ type: Object }) identity?: WorkIdentity;

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', 'Notification preferences');
  }

  static override readonly styles = css`
    :host {
      display: block;
      font-family: var(--pages-font-family, system-ui);
    }
    section {
      margin-bottom: 24px;
    }
    section:last-child {
      margin-bottom: 0;
    }
    h3 {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--pages-neutral-12, #111);
      padding-bottom: 8px;
      border-bottom: 1px solid var(--pages-neutral-6, #e0e0e0);
    }
  `;

  override render() {
    return html`
      <section>
        <h3>Delivery Channels</h3>
        <agency-channel-preferences .endpoint=${this.endpoint} .identity=${this.identity}></agency-channel-preferences>
      </section>
      <section>
        <h3>Muted</h3>
        <agency-mute-list .endpoint=${this.endpoint} .identity=${this.identity}></agency-mute-list>
      </section>
      <section>
        <h3>Snooze</h3>
        <agency-snooze-control .endpoint=${this.endpoint} .identity=${this.identity}></agency-snooze-control>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'agency-notification-preferences': NotificationPreferencesEl;
  }
}
