import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function mockSession(overrides: Record<string, unknown> = {}) {
  return {
    config: {
      defaultVoice: 'kokoro:af_heart',
      defaultSpeed: 0.9,
      minPlaybackRate: 0.6,
      voices: [
        { id: 'kokoro:af_heart', engine: 'kokoro', label: 'Heart' },
        { id: 'kokoro:am_adam', engine: 'kokoro', label: 'Adam' },
        { id: 'qwen3:ryan', engine: 'qwen3', label: 'Ryan' },
      ],
      llms: [
        { id: 'claude-haiku-4-5', label: 'Haiku 4.5' },
        { id: 'claude-sonnet-4', label: 'Sonnet 4' },
      ],
    },
    currentVoice: 'kokoro:af_heart',
    currentLlm: 'claude-haiku-4-5',
    speed: 0.9,
    setVoice: vi.fn(),
    setLlm: vi.fn(),
    setSpeed: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    ...overrides,
  };
}

describe('casehub-avatar-controls', () => {
  beforeEach(async () => {
    await import('./casehub-avatar-controls.js');
  });

  afterEach(() => { document.body.innerHTML = ''; });

  async function createElement(session: any) {
    const el = document.createElement('casehub-avatar-controls') as any;
    el.session = session;
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }

  it('has ARIA attributes', async () => {
    const el = await createElement(mockSession());
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-label')).toBe('Avatar controls');
  });

  it('renders voice options from config', async () => {
    const el = await createElement(mockSession());
    const voiceSelect = el.shadowRoot!.querySelector('[data-control="voice"]') as HTMLSelectElement;
    expect(voiceSelect).not.toBeNull();
    const options = voiceSelect!.querySelectorAll('option');
    expect(options.length).toBe(3);
  });

  it('groups voices by engine', async () => {
    const el = await createElement(mockSession());
    const voiceSelect = el.shadowRoot!.querySelector('[data-control="voice"]') as HTMLSelectElement;
    const groups = voiceSelect!.querySelectorAll('optgroup');
    expect(groups.length).toBe(2);
    expect(groups[0]!.getAttribute('label')).toBe('kokoro');
    expect(groups[1]!.getAttribute('label')).toBe('qwen3');
  });

  it('renders LLM options from config', async () => {
    const el = await createElement(mockSession());
    const llmSelect = el.shadowRoot!.querySelector('[data-control="llm"]') as HTMLSelectElement;
    expect(llmSelect).not.toBeNull();
    const options = llmSelect!.querySelectorAll('option');
    expect(options.length).toBe(2);
  });

  it('calls session.setVoice on voice change', async () => {
    const session = mockSession();
    const el = await createElement(session);
    const voiceSelect = el.shadowRoot!.querySelector('[data-control="voice"]') as HTMLSelectElement;
    voiceSelect!.value = 'qwen3:ryan';
    voiceSelect!.dispatchEvent(new Event('change'));
    expect(session.setVoice).toHaveBeenCalledWith('qwen3:ryan');
  });

  it('calls session.setLlm on LLM change', async () => {
    const session = mockSession();
    const el = await createElement(session);
    const llmSelect = el.shadowRoot!.querySelector('[data-control="llm"]') as HTMLSelectElement;
    llmSelect!.value = 'claude-sonnet-4';
    llmSelect!.dispatchEvent(new Event('change'));
    expect(session.setLlm).toHaveBeenCalledWith('claude-sonnet-4');
  });

  it('renders nothing when no config', async () => {
    const session = mockSession({ config: null });
    const el = await createElement(session);
    const selects = el.shadowRoot!.querySelectorAll('select');
    expect(selects.length).toBe(0);
  });

  it('hides LLM selector when no LLMs in config', async () => {
    const session = mockSession();
    session.config.llms = [];
    const el = await createElement(session);
    const llmSelect = el.shadowRoot!.querySelector('[data-control="llm"]');
    expect(llmSelect).toBeNull();
  });
});
