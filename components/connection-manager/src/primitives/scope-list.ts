import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('mosaic-scope-list')
export class ScopeList extends LitElement {
  @property({ attribute: false }) grantedScopes: readonly string[] = [];
  @property({ attribute: false }) missingScopes: readonly string[] = [];
  @property({ type: Boolean }) expanded = false;

  static override styles = css`
    :host { display: block; font-family: var(--pages-font-family, system-ui); font-size: 0.85rem; }
    .toggle { background: none; border: none; cursor: pointer; padding: 0.25rem 0; color: inherit; font-size: inherit; }
    .toggle:hover { text-decoration: underline; }
    .scope-item { padding: 0.125rem 0; display: flex; align-items: center; gap: 0.25rem; }
    .scope-granted { color: var(--pages-success-11, #155724); }
    .scope-missing { color: var(--pages-warning-11, #856404); }
    .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
    .dot-granted { background: var(--pages-success-9, #28a745); }
    .dot-missing { background: var(--pages-warning-9, #ffc107); }
  `;

  override render() {
    const total = this.grantedScopes.length + this.missingScopes.length;
    if (total === 0) return nothing;

    return html`
      <button class="toggle"
        aria-expanded="${this.expanded}"
        @click=${() => { this.expanded = !this.expanded; }}>
        ${this.expanded ? '▾' : '▸'} ${total} scope${total !== 1 ? 's' : ''}
        ${this.missingScopes.length > 0 ? html` (${this.missingScopes.length} missing)` : nothing}
      </button>
      ${this.expanded ? html`
        <div role="list" aria-label="Scopes">
          ${this.grantedScopes.map(s => html`
            <div role="listitem" class="scope-item scope-granted">
              <span class="dot dot-granted"></span> ${s}
            </div>
          `)}
          ${this.missingScopes.map(s => html`
            <div role="listitem" class="scope-item scope-missing">
              <span class="dot dot-missing"></span> ${s}
            </div>
          `)}
        </div>
      ` : nothing}
    `;
  }
}
