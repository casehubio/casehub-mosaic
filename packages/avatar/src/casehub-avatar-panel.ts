import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AvatarSession } from './avatar-session.js';
import './casehub-avatar.js';
import './casehub-transcript.js';
import './casehub-speech.js';
import './casehub-avatar-controls.js';

@customElement('casehub-avatar-panel')
export class CasehubAvatarPanel extends LitElement {
  @property({ type: String, attribute: 'ws-url' }) wsUrl = '/ws/avatar';
  @property({ type: String, attribute: 'avatar-url' }) avatarUrl = '';
  @property({ type: String }) body: 'M' | 'F' = 'F';
  @property({ type: String }) mood = 'neutral';
  @property({ type: Boolean, attribute: 'show-avatar' }) showAvatar = true;
  @property({ attribute: false }) session: AvatarSession | null = null;

  @state() private _statusText = 'Connecting...';
  @state() private _timingText = '';
  @state() private _connected = false;

  private _ownedSession: AvatarSession | null = null;

  private _statusHandler = ((e: CustomEvent) => {
    const s = e.detail.state;
    this._connected = s === 'connected';
    this._statusText = s === 'connected' ? 'Connected'
      : s === 'connecting' ? 'Connecting...'
      : 'Disconnected — reconnecting...';
  }) as EventListener;

  private _timingHandler = ((e: CustomEvent) => {
    const t = e.detail;
    this._timingText = `Cleanup: ${t.cleanupMs}ms | LLM: ${t.llmMs}ms | TTS: ${t.ttsMs}ms | Total: ${t.totalMs}ms`;
  }) as EventListener;

  static override readonly styles = css`
    :host { display: flex; flex-direction: column; height: 100%; background: var(--pages-background); color: var(--pages-on-background); font-family: system-ui, sans-serif; }
    casehub-avatar-controls { border-bottom: 1px solid var(--pages-neutral-3); }
    casehub-avatar { flex: 0 0 300px; border-bottom: 1px solid var(--pages-neutral-3); }
    .status { padding: 0.25rem 1rem; font-size: 0.75rem; color: var(--pages-on-surface-variant); text-align: center; }
    .timing { margin: 0.5rem 1rem; padding: 0.5rem 0.75rem; background: var(--pages-surface-variant); border-radius: 8px; font-size: 0.8rem; font-family: monospace; }
    .timing:empty { display: none; }
    casehub-transcript { flex: 1; overflow-y: auto; }
    .input-bar { display: flex; gap: 0.5rem; padding: 1rem; border-top: 1px solid var(--pages-neutral-3); }
    .input-bar input { flex: 1; padding: 0.75rem; border-radius: 8px; border: 1px solid var(--pages-neutral-5); background: var(--pages-surface); color: var(--pages-on-surface); font-size: 1rem; }
    .input-bar input:focus { outline: none; border-color: var(--pages-primary); }
    .input-bar button { padding: 0.75rem 1.5rem; border-radius: 8px; border: none; background: var(--pages-primary); color: var(--pages-on-primary); font-size: 1rem; cursor: pointer; }
    .input-bar button:disabled { opacity: 0.5; cursor: default; }
  `;

  private get _session(): AvatarSession | null {
    return this.session ?? this._ownedSession;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'region');
    this.setAttribute('aria-label', this.showAvatar ? 'Avatar conversation' : 'Text conversation');
    if (!this.session) {
      this._ownedSession = new AvatarSession({ wsUrl: this.wsUrl });
      this._ownedSession.connect();
    }
    this._session?.addEventListener('avatar:status', this._statusHandler);
    this._session?.addEventListener('avatar:timing', this._timingHandler);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._session?.removeEventListener('avatar:status', this._statusHandler);
    this._session?.removeEventListener('avatar:timing', this._timingHandler);
    if (this._ownedSession) {
      this._ownedSession.disconnect();
      this._ownedSession = null;
    }
  }

  private _onSendText() {
    const input = this.shadowRoot!.querySelector<HTMLInputElement>('#msg');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    this._session?.sendText(text);
    input.value = '';
    this._statusText = 'Processing...';
  }

  private _onInputKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') this._onSendText();
  }

  protected override render() {
    const s = this._session;
    return html`
      ${this.showAvatar ? html`
        <casehub-avatar-controls .session=${s}></casehub-avatar-controls>
        <casehub-avatar
          avatar-url=${this.avatarUrl}
          body=${this.body}
          mood=${this.mood}
          .session=${s}>
        </casehub-avatar>
      ` : nothing}
      <div class="status">${this._statusText}</div>
      ${this.showAvatar ? html`<div class="timing">${this._timingText}</div>` : nothing}
      <casehub-transcript .session=${s}></casehub-transcript>
      <div class="input-bar">
        ${this.showAvatar ? html`<casehub-speech .session=${s}></casehub-speech>` : nothing}
        <input id="msg" type="text" placeholder="Type a message..."
          autocomplete="off" ?disabled=${!this._connected}
          @keydown=${this._onInputKeydown}>
        <button ?disabled=${!this._connected} @click=${this._onSendText}>Send</button>
      </div>
    `;
  }
}
