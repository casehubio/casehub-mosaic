import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ConversationTurn } from './types.js';

@customElement('casehub-transcript')
export class CasehubTranscript extends LitElement {
  @property({ type: Array }) turns: ConversationTurn[] = [];
  @property({ attribute: false }) session: EventTarget | null = null;

  private _turnHandler = ((e: CustomEvent) => {
    this.turns = e.detail;
  }) as EventListener;

  static override readonly styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--pages-space-3, 12px);
      padding: var(--pages-space-4, 16px);
      overflow-y: auto;
      flex: 1;
    }
    .turn {
      max-width: 70%;
      padding: var(--pages-space-3, 12px) var(--pages-space-4, 16px);
      border-radius: 12px;
      font-size: 0.95rem;
      line-height: 1.4;
    }
    .turn.user {
      align-self: flex-end;
      background: var(--pages-primary, #2d5aa0);
      color: var(--pages-on-primary, #fff);
    }
    .turn.avatar {
      align-self: flex-start;
      background: var(--pages-surface-variant, #333);
      color: var(--pages-on-surface, #e0e0e0);
    }
    .turn.partial {
      opacity: 0.7;
      font-style: italic;
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'log');
    this.setAttribute('aria-live', 'polite');
    this.setAttribute('aria-label', 'Conversation transcript');
    this.session?.addEventListener('avatar:turn', this._turnHandler);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.session?.removeEventListener('avatar:turn', this._turnHandler);
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('session')) {
      const prev = changed.get('session') as EventTarget | null;
      prev?.removeEventListener('avatar:turn', this._turnHandler);
      this.session?.addEventListener('avatar:turn', this._turnHandler);
    }
    this.scrollTop = this.scrollHeight;
  }

  protected override render() {
    return html`${this.turns.map(
      (turn) => html`
        <div class="turn ${turn.role} ${turn.status === 'partial' ? 'partial' : ''}"
             aria-label="${turn.role === 'user' ? 'You said' : 'Avatar said'}: ${turn.text}">
          ${turn.text}
        </div>
      `
    )}`;
  }
}
