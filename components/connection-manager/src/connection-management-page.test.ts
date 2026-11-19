import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { ServiceConnection, WebAuthnCredential } from '@casehubio/mosaic-core';
import './connection-management-page.js';

type PageEl = HTMLElement & {
  connections: readonly ServiceConnection[];
  credentials: readonly WebAuthnCredential[];
  providers: readonly string[];
  updateComplete: Promise<boolean>;
};

const CONNECTIONS: ServiceConnection[] = [
  { provider: 'google', status: 'CONNECTED', grantedScopes: ['email'], missingScopes: [], connectedAt: '2026-01-01T00:00:00Z' },
  { provider: 'github', status: 'PARTIAL', grantedScopes: ['repo'], missingScopes: ['workflow'], connectedAt: '2026-02-01T00:00:00Z' },
];

const CREDENTIALS: WebAuthnCredential[] = [
  { credentialId: 'c1', displayName: 'MacBook Touch ID', transports: ['internal'], discoverable: true, createdAt: '2026-01-01T00:00:00Z', lastUsedAt: '2026-11-01T00:00:00Z' },
];

describe('mosaic-connection-management', () => {
  let el: PageEl;

  beforeEach(async () => {
    el = document.createElement('mosaic-connection-management') as PageEl;
    el.connections = CONNECTIONS;
    el.credentials = CREDENTIALS;
    el.providers = ['google', 'github'];
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('has role="region" and aria-label', () => {
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Connection management');
  });

  it('renders provider-status-row for each connection', () => {
    const rows = el.shadowRoot!.querySelectorAll('mosaic-provider-status-row');
    expect(rows.length).toBe(2);
  });

  it('renders passkey-row for each credential', () => {
    const rows = el.shadowRoot!.querySelectorAll('mosaic-passkey-row');
    expect(rows.length).toBe(1);
  });

  it('renders passkey-register button', () => {
    const btn = el.shadowRoot!.querySelector('mosaic-passkey-register');
    expect(btn).not.toBeNull();
  });

  it('renders empty state when no connections', async () => {
    el.connections = [];
    await el.updateComplete;
    const empty = el.shadowRoot!.querySelector('.empty');
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toContain('No service connections');
  });

  it('renders empty state for passkeys when no credentials', async () => {
    el.credentials = [];
    await el.updateComplete;
    const empties = el.shadowRoot!.querySelectorAll('.empty');
    expect(empties.length).toBeGreaterThanOrEqual(1);
    const passkeyEmpty = Array.from(empties).find(e => e.textContent!.includes('No passkeys'));
    expect(passkeyEmpty).not.toBeUndefined();
  });
});
