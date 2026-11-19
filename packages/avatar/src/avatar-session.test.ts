import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

class MockWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  sent: (string | ArrayBuffer)[] = [];
  onopen: ((ev: Event) => void) | null = null;
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onclose: ((ev: CloseEvent) => void) | null = null;
  onerror: ((ev: Event) => void) | null = null;
  send(data: string | ArrayBuffer) { this.sent.push(data); }
  close() { this.readyState = MockWebSocket.CLOSED; }
}

let mockWs: MockWebSocket;

describe('AvatarSession', () => {
  beforeEach(() => {
    const WsMock = class extends MockWebSocket {
      constructor(_url: string) { super(); mockWs = this; }
    };
    (WsMock as any).OPEN = 1;
    (WsMock as any).CLOSED = 3;
    vi.stubGlobal('WebSocket', WsMock);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        avatarUrl: 'test.glb',
        cameraView: 'head',
        defaultVoice: 'kokoro:af_heart',
        defaultSpeed: 0.9,
        minPlaybackRate: 0.6,
        voices: [{ id: 'kokoro:af_heart', engine: 'kokoro', label: 'Heart' }],
        llms: [{ id: 'claude-haiku-4-5', label: 'Haiku 4.5' }],
      }),
    }));
    vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:8080' });
  });

  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

  it('fetches config on connect', async () => {
    const { AvatarSession } = await import('./avatar-session.js');
    const session = new AvatarSession({ wsUrl: '/ws/avatar' });
    await session.connect();
    expect(fetch).toHaveBeenCalledWith('/api/avatar/config');
    expect(session.config).not.toBeNull();
    expect(session.config!.avatarUrl).toBe('test.glb');
  });

  it('dispatches avatar:turn on transcript message', async () => {
    const { AvatarSession } = await import('./avatar-session.js');
    const session = new AvatarSession({ wsUrl: '/ws/avatar' });
    await session.connect();
    mockWs.onopen!({} as Event);

    const handler = vi.fn();
    session.addEventListener('avatar:turn', handler);

    mockWs.onmessage!({ data: JSON.stringify({ type: 'transcript', text: 'hello' }) } as MessageEvent);

    expect(handler).toHaveBeenCalled();
    expect(session.turns).toHaveLength(1);
    expect(session.turns[0]!.text).toBe('hello');
    expect(session.turns[0]!.role).toBe('user');
    expect(session.turns[0]!.status).toBe('final');
  });

  it('dispatches avatar:turn on response message', async () => {
    const { AvatarSession } = await import('./avatar-session.js');
    const session = new AvatarSession({ wsUrl: '/ws/avatar' });
    await session.connect();
    mockWs.onopen!({} as Event);

    const handler = vi.fn();
    session.addEventListener('avatar:turn', handler);

    mockWs.onmessage!({ data: JSON.stringify({ type: 'response', text: 'hi there' }) } as MessageEvent);

    expect(session.turns).toHaveLength(1);
    expect(session.turns[0]!.role).toBe('avatar');
  });

  it('replaces partial with final transcript', async () => {
    const { AvatarSession } = await import('./avatar-session.js');
    const session = new AvatarSession({ wsUrl: '/ws/avatar' });
    await session.connect();
    mockWs.onopen!({} as Event);

    mockWs.onmessage!({ data: JSON.stringify({ type: 'partial', text: 'hel' }) } as MessageEvent);
    expect(session.turns).toHaveLength(1);
    expect(session.turns[0]!.status).toBe('partial');

    mockWs.onmessage!({ data: JSON.stringify({ type: 'transcript', text: 'hello' }) } as MessageEvent);
    expect(session.turns).toHaveLength(1);
    expect(session.turns[0]!.text).toBe('hello');
    expect(session.turns[0]!.status).toBe('final');
  });

  it('sends text with current voice and LLM', async () => {
    const { AvatarSession } = await import('./avatar-session.js');
    const session = new AvatarSession({ wsUrl: '/ws/avatar' });
    await session.connect();
    mockWs.onopen!({} as Event);

    session.sendText('hi');

    const sent = JSON.parse(mockWs.sent[0] as string);
    expect(sent.type).toBe('text');
    expect(sent.text).toBe('hi');
    expect(sent.ttsModel).toBe('kokoro:af_heart');
    expect(sent.llmModel).toBe('claude-haiku-4-5');
  });

  it('updates connectionState on open/close', async () => {
    const { AvatarSession } = await import('./avatar-session.js');
    const session = new AvatarSession({ wsUrl: '/ws/avatar', reconnectMs: 100000 });
    await session.connect();

    const statusHandler = vi.fn();
    session.addEventListener('avatar:status', statusHandler);

    mockWs.onopen!({} as Event);
    expect(session.connectionState).toBe('connected');

    mockWs.onclose!({ code: 1000, reason: '', wasClean: true } as CloseEvent);
    expect(session.connectionState).toBe('disconnected');
    expect(statusHandler).toHaveBeenCalledTimes(2);
  });

  it('setVoice updates current voice and dispatches event', async () => {
    const { AvatarSession } = await import('./avatar-session.js');
    const session = new AvatarSession({ wsUrl: '/ws/avatar' });
    await session.connect();

    const handler = vi.fn();
    session.addEventListener('avatar:config-changed', handler);

    session.setVoice('qwen3:ryan');
    expect(session.currentVoice).toBe('qwen3:ryan');
    expect(handler).toHaveBeenCalled();
  });

  it('setLlm updates current LLM', async () => {
    const { AvatarSession } = await import('./avatar-session.js');
    const session = new AvatarSession({ wsUrl: '/ws/avatar' });
    await session.connect();

    session.setLlm('claude-sonnet-4');
    expect(session.currentLlm).toBe('claude-sonnet-4');
  });

  it('disconnect stops reconnection', async () => {
    const { AvatarSession } = await import('./avatar-session.js');
    const session = new AvatarSession({ wsUrl: '/ws/avatar' });
    await session.connect();

    session.disconnect();
    expect(session.connectionState).toBe('disconnected');
  });

  it('dispatches avatar:timing on timing message', async () => {
    const { AvatarSession } = await import('./avatar-session.js');
    const session = new AvatarSession({ wsUrl: '/ws/avatar' });
    await session.connect();
    mockWs.onopen!({} as Event);

    const handler = vi.fn();
    session.addEventListener('avatar:timing', handler);

    mockWs.onmessage!({ data: JSON.stringify({
      type: 'timing', cleanupMs: 10, llmMs: 200, ttsMs: 50, totalMs: 260,
    }) } as MessageEvent);

    expect(handler).toHaveBeenCalled();
  });

  it('dispatches avatar:error on error message', async () => {
    const { AvatarSession } = await import('./avatar-session.js');
    const session = new AvatarSession({ wsUrl: '/ws/avatar' });
    await session.connect();
    mockWs.onopen!({} as Event);

    const handler = vi.fn();
    session.addEventListener('avatar:error', handler);

    mockWs.onmessage!({ data: JSON.stringify({ type: 'error', message: 'oops' }) } as MessageEvent);

    expect(handler).toHaveBeenCalled();
  });
});
