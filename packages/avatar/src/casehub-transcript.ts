import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { ConversationTurn } from './types.js';

@customElement('casehub-transcript')
export class CasehubTranscript extends LitElement {
  @property({ type: Array }) turns: ConversationTurn[] = [];
  @property({ attribute: false }) session: EventTarget | null = null;

  private _turnHandler = ((e: CustomEvent) => {
    this.turns = e.detail;
  }) as EventListener;

  private _expiryTimer: ReturnType<typeof setInterval> | null = null;

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
      background: var(--pages-primary);
      color: var(--pages-on-primary);
    }
    .turn.avatar {
      align-self: flex-start;
      background: var(--pages-surface-variant);
      color: var(--pages-on-surface);
    }
    .turn.tool-call {
      align-self: flex-start;
      max-width: 85%;
      background: var(--pages-surface-variant);
      color: var(--pages-on-surface);
      font-family: monospace;
      font-size: 0.85rem;
    }
    .turn.partial {
      opacity: 0.7;
      font-style: italic;
    }
    .tool-name {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .tool-name::before {
      content: '⚙️ ';
    }
    details {
      margin-top: 4px;
    }
    summary {
      cursor: pointer;
      font-size: 0.8rem;
      opacity: 0.7;
    }
    .tool-args {
      margin-top: 4px;
      padding: 6px 8px;
      background: color-mix(in srgb, var(--pages-on-surface) 8%, transparent);
      border-radius: 6px;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 0.8rem;
    }
    .tool-result {
      margin-top: 6px;
      padding: 6px 8px;
      background: color-mix(in srgb, var(--pages-on-surface) 5%, transparent);
      border-radius: 6px;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 0.8rem;
    }
    .tool-result.error {
      background: color-mix(in srgb, var(--pages-error) 15%, transparent);
      color: var(--pages-error);
    }
    .turn.confirmation {
      align-self: flex-start;
      max-width: 85%;
      background: var(--pages-surface-variant);
      color: var(--pages-on-surface);
      border: 1px solid var(--pages-neutral-5);
    }
    .confirmation-action {
      font-weight: 600;
      margin-bottom: 6px;
    }
    .confirmation-consequences {
      font-size: 0.85rem;
      opacity: 0.8;
      margin-bottom: 8px;
    }
    .confirmation-status {
      font-size: 0.8rem;
      font-style: italic;
      opacity: 0.7;
    }
    .confirmation-buttons {
      display: flex;
      gap: 8px;
      margin-top: 8px;
    }
    .confirmation-buttons button {
      padding: 6px 16px;
      border-radius: 6px;
      border: none;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .confirmation-buttons button:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .confirmation-buttons button.confirm {
      background: var(--pages-primary);
      color: var(--pages-on-primary);
    }
    .confirmation-buttons button.decline {
      background: var(--pages-error);
      color: var(--pages-on-error);
    }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'log');
    this.setAttribute('aria-live', 'polite');
    this.setAttribute('aria-label', 'Conversation transcript');
    this.session?.addEventListener('avatar:turn', this._turnHandler);
    this._startExpiryTimer();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.session?.removeEventListener('avatar:turn', this._turnHandler);
    this._stopExpiryTimer();
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('session')) {
      const prev = changed.get('session') as EventTarget | null;
      prev?.removeEventListener('avatar:turn', this._turnHandler);
      this.session?.addEventListener('avatar:turn', this._turnHandler);
    }
    this.scrollTop = this.scrollHeight;
  }

  private _startExpiryTimer() {
    this._expiryTimer = setInterval(() => this._checkExpiry(), 1000);
  }

  private _stopExpiryTimer() {
    if (this._expiryTimer != null) {
      clearInterval(this._expiryTimer);
      this._expiryTimer = null;
    }
  }

  private _checkExpiry() {
    const now = Date.now();
    let changed = false;
    for (const turn of this.turns) {
      if (turn.type === 'confirmation' && turn.confirmationStatus === 'pending' && turn.expiresAt) {
        if (new Date(turn.expiresAt).getTime() <= now) {
          turn.confirmationStatus = 'expired';
          changed = true;
          this.dispatchEvent(new CustomEvent('avatar:confirmation-expired', {
            detail: { confirmationId: turn.confirmationId },
            bubbles: true, composed: true,
          }));
        }
      }
    }
    if (changed) this.requestUpdate();
  }

  private _onConfirmationResponse(confirmationId: string, approved: boolean) {
    this.dispatchEvent(new CustomEvent('avatar:confirmation-response', {
      detail: { confirmationId, approved },
      bubbles: true, composed: true,
    }));
  }

  private _renderConfirmation(turn: ConversationTurn) {
    const pending = turn.confirmationStatus === 'pending';
    const statusLabel = turn.confirmationStatus === 'confirmed' ? 'Confirmed'
      : turn.confirmationStatus === 'declined' ? 'Declined'
      : turn.confirmationStatus === 'expired' ? 'Expired' : '';
    const ariaPrefix = turn.confirmationStatus === 'confirmed' ? 'Confirmation approved'
      : turn.confirmationStatus === 'declined' ? 'Confirmation declined'
      : turn.confirmationStatus === 'expired' ? 'Confirmation expired'
      : 'Confirmation required';
    return html`
      <div class="turn confirmation"
           role="alertdialog"
           aria-label="${ariaPrefix}: ${turn.actionDescription}">
        <div class="confirmation-action">${turn.actionDescription}</div>
        ${turn.consequences ? html`<div class="confirmation-consequences">${turn.consequences}</div>` : nothing}
        ${!pending ? html`<div class="confirmation-status">${statusLabel}</div>` : nothing}
        <div class="confirmation-buttons">
          <button class="confirm" ?disabled=${!pending}
            @click=${() => this._onConfirmationResponse(turn.confirmationId!, true)}>Confirm</button>
          <button class="decline" ?disabled=${!pending}
            @click=${() => this._onConfirmationResponse(turn.confirmationId!, false)}>Decline</button>
        </div>
      </div>
    `;
  }

  private _renderToolCall(turn: ConversationTurn) {
    const hasArgs = turn.toolArgs && Object.keys(turn.toolArgs).length > 0;
    return html`
      <div class="turn tool-call ${turn.status === 'partial' ? 'partial' : ''}"
           aria-label="Tool call: ${turn.toolName}${turn.toolError ? ' (error)' : ''}">
        <div class="tool-name">${turn.toolName}</div>
        ${hasArgs ? html`
          <details>
            <summary>Arguments</summary>
            <div class="tool-args">${JSON.stringify(turn.toolArgs, null, 2)}</div>
          </details>
        ` : nothing}
        ${turn.toolResult != null ? html`
          <div class="tool-result ${turn.toolError ? 'error' : ''}">${turn.toolResult}</div>
        ` : nothing}
      </div>
    `;
  }

  protected override render() {
    return html`${this.turns.map((turn) =>
      turn.type === 'confirmation'
        ? this._renderConfirmation(turn)
        : turn.type === 'tool-call'
          ? this._renderToolCall(turn)
          : html`
            <div class="turn ${turn.role} ${turn.status === 'partial' ? 'partial' : ''}"
                 aria-label="${turn.role === 'user' ? 'You said' : 'Avatar said'}: ${turn.text}">
              ${turn.text}
            </div>
          `
    )}`;
  }
}
