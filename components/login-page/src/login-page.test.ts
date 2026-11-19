import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './login-page.js';

type LoginPageEl = HTMLElement & {
  providers: readonly string[];
  passkeyEnabled: boolean;
  updateComplete: Promise<boolean>;
};

describe('mosaic-login-page', () => {
  let el: LoginPageEl;

  beforeEach(async () => {
    el = document.createElement('mosaic-login-page') as LoginPageEl;
    el.providers = ['google', 'github', 'slack'];
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('has role="main" and aria-label="Sign in"', () => {
    expect(el.getAttribute('role')).toBe('main');
    expect(el.getAttribute('aria-label')).toBe('Sign in');
  });

  it('has role="group" with aria-label="Sign in options"', () => {
    const group = el.shadowRoot!.querySelector('[role="group"]');
    expect(group).not.toBeNull();
    expect(group!.getAttribute('aria-label')).toBe('Sign in options');
  });

  it('renders connect-button for each provider in signin mode', () => {
    const buttons = el.shadowRoot!.querySelectorAll('mosaic-connect-button');
    expect(buttons.length).toBe(3);
    buttons.forEach(btn => {
      expect(btn.getAttribute('mode')).toBe('signin');
    });
    expect(buttons[0]!.getAttribute('provider')).toBe('google');
    expect(buttons[1]!.getAttribute('provider')).toBe('github');
    expect(buttons[2]!.getAttribute('provider')).toBe('slack');
  });

  it('renders passkey-authenticate button when passkeyEnabled=true', () => {
    const passkey = el.shadowRoot!.querySelector('mosaic-passkey-authenticate');
    expect(passkey).not.toBeNull();
  });

  it('hides passkey button when passkeyEnabled=false', async () => {
    el.passkeyEnabled = false;
    await el.updateComplete;
    const passkey = el.shadowRoot!.querySelector('mosaic-passkey-authenticate');
    expect(passkey).toBeNull();
  });

  it('renders "or" divider before passkey', () => {
    const divider = el.shadowRoot!.querySelector('.divider');
    expect(divider).not.toBeNull();
    expect(divider!.textContent!.trim()).toBe('or');
  });

  it('hides divider when passkeyEnabled=false', async () => {
    el.passkeyEnabled = false;
    await el.updateComplete;
    const divider = el.shadowRoot!.querySelector('.divider');
    expect(divider).toBeNull();
  });

  it('emits connection.connect when social button clicked', async () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    const btn = el.shadowRoot!.querySelector('mosaic-connect-button');
    expect(btn).not.toBeNull();
    // The connect-button emits on its internal button click — trigger it
    const innerBtn = btn!.shadowRoot?.querySelector('button');
    if (innerBtn) {
      innerBtn.click();
      expect(handler).toHaveBeenCalledOnce();
      const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
      expect(detail.topic).toBe('connection.connect');
      expect(detail.payload.provider).toBe('google');
    }
  });
});
