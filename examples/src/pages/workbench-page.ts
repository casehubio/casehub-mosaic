import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import type { WorkIdentity } from '@casehubio/mosaic-core';
import '@casehubio/mosaic-work-item-workbench';

const IDENTITY: WorkIdentity = {
  userId: 'demo-user',
  displayName: 'Demo User',
  groups: ['compliance', 'clinical-safety', 'household', 'device-ops', 'code-review'],
};

@customElement('agency-example-workbench')
export class WorkbenchPage extends LitElement {
  static override styles = css`
    :host { display: block; height: 100%; }
    agency-work-item-workbench { display: block; height: 100%; }
  `;

  override render() {
    return html`
      <agency-work-item-workbench endpoint="" .identity=${IDENTITY}></agency-work-item-workbench>
    `;
  }
}
