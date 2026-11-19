import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AvatarSession, AvatarSessionConfig } from './avatar-session.js';

@customElement('casehub-avatar-controls')
export class CasehubAvatarControls extends LitElement {
  @property({ attribute: false }) session: AvatarSession | null = null;

  @state() private _config: AvatarSessionConfig | null = null;
  @state() private _voice = '';
  @state() private _llm = '';
  @state() private _speed = 0.9;

  private _configHandler = ((e: CustomEvent) => {
    this._config = e.detail;
    this._syncFromSession();
  }) as EventListener;

  private _changeHandler = (() => {
    this._syncFromSession();
  }) as EventListener;

  static override readonly styles = css`
    :host { display: flex; gap: 1rem; padding: 0.5rem 1rem; align-items: center; justify-content: center; flex-wrap: wrap; }
    label { font-size: 0.8rem; color: var(--pages-on-surface-variant, #999); }
    select { padding: 0.3rem 0.5rem; border-radius: 6px; border: 1px solid var(--pages-neutral-5, #555); background: var(--pages-surface, #2a2a3e); color: var(--pages-on-surface, #e0e0e0); font-size: 0.85rem; }
    input[type="range"] { width: 80px; vertical-align: middle; }
  `;

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'group');
    this.setAttribute('aria-label', 'Avatar controls');
    this._bindSession();
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._unbindSession();
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('session')) {
      this._unbindSession();
      this._bindSession();
    }
  }

  private _bindSession() {
    if (!this.session) return;
    this._config = this.session.config;
    this._syncFromSession();
    this.session.addEventListener('avatar:config-loaded', this._configHandler);
    this.session.addEventListener('avatar:config-changed', this._changeHandler);
  }

  private _unbindSession() {
    this.session?.removeEventListener('avatar:config-loaded', this._configHandler);
    this.session?.removeEventListener('avatar:config-changed', this._changeHandler);
  }

  private _syncFromSession() {
    if (!this.session) return;
    this._voice = this.session.currentVoice;
    this._llm = this.session.currentLlm;
    this._speed = this.session.speed;
  }

  private _onVoiceChange(e: Event) { this.session?.setVoice((e.target as HTMLSelectElement).value); }
  private _onLlmChange(e: Event) { this.session?.setLlm((e.target as HTMLSelectElement).value); }
  private _onSpeedChange(e: Event) { this.session?.setSpeed(parseFloat((e.target as HTMLInputElement).value)); }

  private _groupVoicesByEngine() {
    if (!this._config?.voices) return [];
    const groups = new Map<string, Array<{ id: string; label: string }>>();
    for (const v of this._config.voices) {
      if (!groups.has(v.engine)) groups.set(v.engine, []);
      groups.get(v.engine)!.push(v);
    }
    return [...groups.entries()].map(([engine, voices]) => ({ engine, voices }));
  }

  protected override render() {
    if (!this._config) return html``;
    const voiceGroups = this._groupVoicesByEngine();
    return html`
      ${this._config.llms?.length ? html`
        <label>LLM: <select data-control="llm" @change=${this._onLlmChange}>
          ${this._config.llms.map(l => html`<option value=${l.id} ?selected=${this._llm === l.id}>${l.label}</option>`)}
        </select></label>
      ` : ''}
      <label>Voice: <select data-control="voice" @change=${this._onVoiceChange}>
        ${voiceGroups.map(g => html`
          <optgroup label=${g.engine}>
            ${g.voices.map(v => html`<option value=${v.id} ?selected=${this._voice === v.id}>${v.label}</option>`)}
          </optgroup>
        `)}
      </select></label>
      <label>Speed: <input type="range"
        min=${this._config.minPlaybackRate ?? 0.6} max="1.4" step="0.05"
        .value=${String(this._speed)}
        @input=${this._onSpeedChange}>
        <span>${this._speed}x</span></label>
    `;
  }
}
