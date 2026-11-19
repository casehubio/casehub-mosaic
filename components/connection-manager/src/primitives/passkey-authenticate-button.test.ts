import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './passkey-authenticate-button.js';

type PasskeyAuthEl = HTMLElement & {
  challengeOptions: PublicKeyCredentialRequestOptions | null;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  updateComplete: Promise<boolean>;
};

describe('mosaic-passkey-authenticate', () => {
  let el: PasskeyAuthEl;

  beforeEach(async () => {
    el = document.createElement('mosaic-passkey-authenticate') as PasskeyAuthEl;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('has aria-label "Sign in with passkey"', () => {
    const btn = el.shadowRoot!.querySelector('button');
    expect(btn!.getAttribute('aria-label')).toBe('Sign in with passkey');
  });

  it('emits passkey.authenticate-request when clicked without challengeOptions', () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    el.shadowRoot!.querySelector('button')!.click();
    expect(handler).toHaveBeenCalledOnce();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('passkey.authenticate-request');
  });

  it('shows loading spinner when loading=true', async () => {
    el.loading = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.spinner')).not.toBeNull();
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
