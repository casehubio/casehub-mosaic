import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './connect-button.js';

type ConnectButtonEl = HTMLElement & {
  provider: string;
  mode: 'connect' | 'signin';
  authorizationUrl: string | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  updateComplete: Promise<boolean>;
};

describe('mosaic-connect-button', () => {
  let el: ConnectButtonEl;

  beforeEach(async () => {
    el = document.createElement('mosaic-connect-button') as ConnectButtonEl;
    el.provider = 'google';
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('has role="button" and aria-label', () => {
    const btn = el.shadowRoot!.querySelector('button');
    expect(btn).not.toBeNull();
    expect(btn!.getAttribute('aria-label')).toContain('Google');
  });

  it('renders provider brand from registry', () => {
    expect(el.shadowRoot!.innerHTML).toContain('<svg');
    expect(el.shadowRoot!.textContent).toContain('Google');
  });

  it('renders "Connect with" in connect mode', () => {
    expect(el.shadowRoot!.textContent).toContain('Connect with');
  });

  it('renders "Sign in with" in signin mode', async () => {
    el.mode = 'signin';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Sign in with');
  });

  it('emits connection.connect when clicked without authorizationUrl', () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    el.shadowRoot!.querySelector('button')!.click();
    expect(handler).toHaveBeenCalledOnce();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('connection.connect');
    expect(detail.payload.provider).toBe('google');
  });

  it('shows loading spinner when loading=true', async () => {
    el.loading = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.spinner')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('button')!.disabled).toBe(true);
  });

  it('shows error message when error is set', async () => {
    el.error = 'Connection failed';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Connection failed');
    expect(el.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('renders with unknown provider using fallback style', async () => {
    el.provider = 'unknown-provider';
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('button');
    expect(btn!.getAttribute('aria-label')).toContain('unknown-provider');
    expect(el.shadowRoot!.textContent).toContain('Connect with unknown-provider');
  });

  it('disabled prop prevents click', async () => {
    el.disabled = true;
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    el.shadowRoot!.querySelector('button')!.click();
    expect(handler).not.toHaveBeenCalled();
  });
});
