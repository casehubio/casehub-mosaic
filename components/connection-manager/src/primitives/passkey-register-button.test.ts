import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './passkey-register-button.js';

type PasskeyRegisterEl = HTMLElement & {
  registrationOptions: PublicKeyCredentialCreationOptions | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  updateComplete: Promise<boolean>;
};

describe('mosaic-passkey-register', () => {
  let el: PasskeyRegisterEl;

  beforeEach(async () => {
    el = document.createElement('mosaic-passkey-register') as PasskeyRegisterEl;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('has aria-label "Register a passkey"', () => {
    const btn = el.shadowRoot!.querySelector('button');
    expect(btn!.getAttribute('aria-label')).toBe('Register a passkey');
  });

  it('emits passkey.register-request when clicked without registrationOptions', () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    el.shadowRoot!.querySelector('button')!.click();
    expect(handler).toHaveBeenCalledOnce();
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.topic).toBe('passkey.register-request');
  });

  it('shows loading spinner when loading=true', async () => {
    el.loading = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.spinner')).not.toBeNull();
  });

  it('shows error message when error is set', async () => {
    el.error = 'Registration failed';
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Registration failed');
    expect(el.shadowRoot!.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('button is disabled when disabled=true', async () => {
    el.disabled = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('button')!.disabled).toBe(true);
  });

  it('button is disabled when loading=true', async () => {
    el.loading = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('button')!.disabled).toBe(true);
  });
});
