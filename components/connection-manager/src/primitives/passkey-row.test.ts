import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WebAuthnCredential } from '@casehubio/mosaic-core';
import './passkey-row.js';

type PasskeyRowEl = HTMLElement & {
  credential: WebAuthnCredential | null;
  loading: boolean;
  error: string | null;
  updateComplete: Promise<boolean>;
};

const credential: WebAuthnCredential = {
  credentialId: 'cred-abc',
  displayName: 'MacBook Pro Touch ID',
  transports: ['internal'],
  discoverable: true,
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: null,
};

describe('mosaic-passkey-row', () => {
  let el: PasskeyRowEl;

  beforeEach(async () => {
    el = document.createElement('mosaic-passkey-row') as PasskeyRowEl;
    el.credential = credential;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('has role="listitem" and aria-label with device name', () => {
    expect(el.getAttribute('role')).toBe('listitem');
    expect(el.getAttribute('aria-label')).toContain('MacBook Pro Touch ID');
  });

  it('renders device display name', () => {
    expect(el.shadowRoot!.textContent).toContain('MacBook Pro Touch ID');
  });

  it('renders transport indicators', () => {
    expect(el.shadowRoot!.textContent).toContain('Built-in');
  });

  it('renders "Never" for null lastUsedAt', () => {
    expect(el.shadowRoot!.textContent).toContain('Never');
  });

  it('renders relative time for non-null lastUsedAt', async () => {
    el.credential = { ...credential, lastUsedAt: new Date(Date.now() - 3600_000).toISOString() };
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('1h ago');
  });

  it('emits passkey.revoke with credentialId on Revoke click', () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    el.shadowRoot!.querySelector<HTMLButtonElement>('.revoke-btn')!.click();
    expect(handler).toHaveBeenCalledOnce();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('passkey.revoke');
    expect(detail.payload.credentialId).toBe('cred-abc');
  });
});
