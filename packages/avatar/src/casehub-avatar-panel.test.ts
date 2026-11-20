import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

vi.mock('talkinghead', () => ({
  TalkingHead: class {
    showAvatar = vi.fn().mockResolvedValue(undefined);
    speakAudio = vi.fn().mockResolvedValue(undefined);
    get isSpeaking() { return false; }
  },
}));

import './casehub-avatar-panel.js';

class MockWebSocket {
  readyState = 1;
  sent: any[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((evt: any) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send(data: any) { this.sent.push(data); }
  close() { this.readyState = 3; }
  static readonly OPEN = 1;
}

let mockWs: MockWebSocket;

beforeEach(() => {
  mockWs = new MockWebSocket();
  const WsCtor = class extends MockWebSocket {
    constructor(_url: string) { super(); mockWs = this; }
  };
  (WsCtor as any).OPEN = 1;
  (WsCtor as any).CLOSED = 3;
  vi.stubGlobal('WebSocket', WsCtor);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({
      avatarUrl: 'test.glb',
      cameraView: 'head',
      defaultVoice: 'kokoro:af_heart',
      defaultSpeed: 0.9,
      voices: [{ id: 'kokoro:af_heart', engine: 'kokoro', label: 'Heart' }],
      llms: [{ id: 'claude-haiku-4-5', label: 'Haiku 4.5' }],
    }),
  }));
  vi.stubGlobal('location', { protocol: 'http:', host: 'localhost:8080' });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

async function createElement(avatarUrl = './test.glb') {
  const el = document.createElement('casehub-avatar-panel') as any;
  el.avatarUrl = avatarUrl;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise(r => setTimeout(r, 10));
  await el.updateComplete;
  return el;
}

describe('CasehubAvatarPanel', () => {
  it('has correct ARIA attributes', async () => {
    const el = await createElement();
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Avatar conversation');
  });

  it('composes avatar, transcript, speech, and controls components', async () => {
    const el = await createElement();
    const avatar = el.shadowRoot!.querySelector('casehub-avatar');
    const transcript = el.shadowRoot!.querySelector('casehub-transcript');
    const speech = el.shadowRoot!.querySelector('casehub-speech');
    const controls = el.shadowRoot!.querySelector('casehub-avatar-controls');
    expect(avatar).toBeTruthy();
    expect(transcript).toBeTruthy();
    expect(speech).toBeTruthy();
    expect(controls).toBeTruthy();
  });

  it('shows connection status', async () => {
    const el = await createElement();
    const status = el.shadowRoot!.querySelector('.status');
    expect(status).toBeTruthy();
  });

  it('passes avatarUrl to child avatar component', async () => {
    const el = await createElement('./custom.glb');
    const avatar = el.shadowRoot!.querySelector('casehub-avatar') as any;
    expect(avatar.getAttribute('avatar-url')).toBe('./custom.glb');
  });

  it('passes session to child components', async () => {
    const el = await createElement();
    const avatar = el.shadowRoot!.querySelector('casehub-avatar') as any;
    const transcript = el.shadowRoot!.querySelector('casehub-transcript') as any;
    const speech = el.shadowRoot!.querySelector('casehub-speech') as any;
    const controls = el.shadowRoot!.querySelector('casehub-avatar-controls') as any;
    expect(avatar.session).toBeTruthy();
    expect(transcript.session).toBeTruthy();
    expect(speech.session).toBeTruthy();
    expect(controls.session).toBeTruthy();
  });

  it('creates own session when none provided', async () => {
    const el = await createElement();
    expect(el._ownedSession).toBeTruthy();
  });

  it('defaults showAvatar to true', async () => {
    const el = await createElement();
    expect(el.showAvatar).toBe(true);
  });

  it('hides avatar and controls when showAvatar is false', async () => {
    const el = document.createElement('casehub-avatar-panel') as any;
    el.avatarUrl = './test.glb';
    el.showAvatar = false;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 10));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('casehub-avatar')).toBeNull();
    expect(el.shadowRoot!.querySelector('casehub-avatar-controls')).toBeNull();
    expect(el.shadowRoot!.querySelector('casehub-speech')).toBeNull();
    expect(el.shadowRoot!.querySelector('.timing')).toBeNull();
  });

  it('still shows transcript and input when showAvatar is false', async () => {
    const el = document.createElement('casehub-avatar-panel') as any;
    el.avatarUrl = './test.glb';
    el.showAvatar = false;
    document.body.appendChild(el);
    await el.updateComplete;
    await new Promise(r => setTimeout(r, 10));
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('casehub-transcript')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.input-bar')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.input-bar input')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.input-bar button')).toBeTruthy();
  });

  it('reflects showAvatar property', async () => {
    const el = document.createElement('casehub-avatar-panel') as any;
    el.showAvatar = false;
    el.avatarUrl = './test.glb';
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.showAvatar).toBe(false);
    expect(el.shadowRoot!.querySelector('casehub-avatar')).toBeNull();
  });

  it('updates aria-label for text-only mode', async () => {
    const el = document.createElement('casehub-avatar-panel') as any;
    el.showAvatar = false;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toBe('Text conversation');
  });

  it('updates aria-label when showAvatar toggles after render', async () => {
    const el = await createElement();
    expect(el.getAttribute('aria-label')).toBe('Avatar conversation');
    el.showAvatar = false;
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toBe('Text conversation');
  });
});
