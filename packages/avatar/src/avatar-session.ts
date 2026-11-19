import type { ConversationTurn, VisemeFrame, PlaybackItem } from './types.js';

export interface AvatarSessionConfig {
  avatarUrl: string;
  cameraView: string;
  defaultVoice: string;
  defaultSpeed: number;
  minPlaybackRate?: number;
  voices: Array<{ id: string; engine: string; label: string }>;
  llms: Array<{ id: string; label: string }>;
}

export class AvatarSession extends EventTarget {
  config: AvatarSessionConfig | null = null;
  turns: ConversationTurn[] = [];
  connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  private _wsUrl: string;
  private _configUrl: string;
  private _ws: WebSocket | null = null;
  private _shouldReconnect = true;
  private _reconnectMs: number;
  private _currentVoice = '';
  private _currentLlm = '';
  private _speed = 0.9;
  private _pendingVisemes: VisemeFrame[] | null = null;
  private _audioCtx: AudioContext | null = null;

  constructor(opts: { wsUrl?: string; configUrl?: string; reconnectMs?: number }) {
    super();
    this._wsUrl = opts.wsUrl ?? '/ws/avatar';
    this._configUrl = opts.configUrl ?? '/api/avatar/config';
    this._reconnectMs = opts.reconnectMs ?? 2000;
  }

  get currentVoice() { return this._currentVoice; }
  get currentLlm() { return this._currentLlm; }
  get speed() { return this._speed; }

  async connect(): Promise<void> {
    await this._fetchConfig();
    this._connectWs();
  }

  disconnect(): void {
    this._shouldReconnect = false;
    this._ws?.close();
    this._ws = null;
    this.connectionState = 'disconnected';
  }

  sendText(text: string): void {
    this._send(JSON.stringify({
      type: 'text', text,
      llmModel: this._currentLlm,
      ttsModel: this._currentVoice,
    }));
  }

  sendStart(opts: { sampleRate: number }): void {
    this._send(JSON.stringify({
      type: 'start', ...opts,
      llmModel: this._currentLlm,
      ttsModel: this._currentVoice,
    }));
  }

  sendStop(): void {
    this._send(JSON.stringify({ type: 'stop' }));
  }

  sendAudio(buffer: ArrayBuffer): void {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(buffer);
    }
  }

  setVoice(voiceId: string): void {
    this._currentVoice = voiceId;
    this.dispatchEvent(new CustomEvent('avatar:config-changed', { detail: { voice: voiceId } }));
  }

  setLlm(llmId: string): void {
    this._currentLlm = llmId;
    this.dispatchEvent(new CustomEvent('avatar:config-changed', { detail: { llm: llmId } }));
  }

  setSpeed(speed: number): void {
    this._speed = speed;
    this.dispatchEvent(new CustomEvent('avatar:config-changed', { detail: { speed } }));
  }

  private async _fetchConfig(): Promise<void> {
    try {
      const resp = await fetch(this._configUrl);
      if (resp.ok) {
        this.config = await resp.json() as AvatarSessionConfig;
        this._currentVoice = this.config.defaultVoice ?? '';
        this._speed = this.config.defaultSpeed ?? 0.9;
        if (this.config.llms?.length > 0) {
          this._currentLlm = this.config.llms[0]!.id;
        }
        this.dispatchEvent(new CustomEvent('avatar:config-loaded', { detail: this.config }));
      }
    } catch { /* config fetch optional — component works with defaults */ }
  }

  private _connectWs(): void {
    const proto = globalThis.location?.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = globalThis.location?.host ?? 'localhost';
    const url = this._wsUrl.startsWith('ws') ? this._wsUrl : `${proto}//${host}${this._wsUrl}`;
    this._ws = new WebSocket(url);
    this.connectionState = 'connecting';
    this.dispatchEvent(new CustomEvent('avatar:status', { detail: { state: 'connecting' } }));

    this._ws.onopen = () => {
      this.connectionState = 'connected';
      this.dispatchEvent(new CustomEvent('avatar:status', { detail: { state: 'connected' } }));
    };

    this._ws.onmessage = (evt: MessageEvent) => {
      if (typeof evt.data === 'string') {
        this._handleTextMessage(JSON.parse(evt.data));
      } else {
        this._handleBinaryMessage(evt.data as Blob);
      }
    };

    this._ws.onclose = () => {
      this.connectionState = 'disconnected';
      this.dispatchEvent(new CustomEvent('avatar:status', { detail: { state: 'disconnected' } }));
      if (this._shouldReconnect) {
        setTimeout(() => this._connectWs(), this._reconnectMs);
      }
    };

    this._ws.onerror = () => {
      this.connectionState = 'disconnected';
      this.dispatchEvent(new CustomEvent('avatar:status', { detail: { state: 'disconnected' } }));
    };
  }

  private _handleTextMessage(msg: { type: string; [key: string]: unknown }): void {
    switch (msg.type) {
      case 'partial': {
        const last = this.turns[this.turns.length - 1];
        if (last && last.role === 'user' && last.status === 'partial') {
          this.turns = [...this.turns.slice(0, -1), { role: 'user', text: msg.text as string, status: 'partial' }];
        } else {
          this.turns = [...this.turns, { role: 'user', text: msg.text as string, status: 'partial' }];
        }
        this.dispatchEvent(new CustomEvent('avatar:turn', { detail: this.turns }));
        break;
      }
      case 'transcript': {
        const last = this.turns[this.turns.length - 1];
        if (last && last.role === 'user' && last.status === 'partial') {
          this.turns = [...this.turns.slice(0, -1), { role: 'user', text: msg.text as string, status: 'final' }];
        } else {
          this.turns = [...this.turns, { role: 'user', text: msg.text as string, status: 'final' }];
        }
        this.dispatchEvent(new CustomEvent('avatar:turn', { detail: this.turns }));
        break;
      }
      case 'response':
        this.turns = [...this.turns, { role: 'avatar', text: msg.text as string, status: 'final' }];
        this.dispatchEvent(new CustomEvent('avatar:turn', { detail: this.turns }));
        break;
      case 'phonemes':
        this._pendingVisemes = (msg.data as VisemeFrame[]) ?? null;
        break;
      case 'timing':
        this.dispatchEvent(new CustomEvent('avatar:timing', { detail: msg }));
        break;
      case 'error':
        this.dispatchEvent(new CustomEvent('avatar:error', { detail: { message: msg.message } }));
        break;
    }
  }

  private async _handleBinaryMessage(data: Blob | ArrayBuffer): Promise<void> {
    const myVisemes = this._pendingVisemes;
    this._pendingVisemes = null;

    if (!this._audioCtx) this._audioCtx = new AudioContext();
    try {
      const arrayBuf = data instanceof Blob ? await data.arrayBuffer() : data;
      const audioBuf = await this._audioCtx.decodeAudioData(arrayBuf.slice(0));
      const item: PlaybackItem = { audio: audioBuf, timeline: myVisemes && myVisemes.length > 0 ? myVisemes : null };
      this.dispatchEvent(new CustomEvent('avatar:audio', { detail: item }));
    } catch (e) {
      console.error('[AvatarSession] audio decode error:', e);
    }
  }

  private _send(data: string): void {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(data);
    }
  }
}
