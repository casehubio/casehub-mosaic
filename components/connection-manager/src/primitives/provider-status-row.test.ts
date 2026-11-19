import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ServiceConnection } from '@casehubio/mosaic-core';
import './provider-status-row.js';

type ProviderStatusRowEl = HTMLElement & {
  connection: ServiceConnection;
  loading: boolean;
  error: string | null;
  updateComplete: Promise<boolean>;
};

const connected: ServiceConnection = {
  provider: 'google',
  status: 'CONNECTED',
  grantedScopes: ['email', 'profile'],
  missingScopes: [],
  connectedAt: '2026-01-01T00:00:00Z',
};

const partial: ServiceConnection = {
  provider: 'github',
  status: 'PARTIAL',
  grantedScopes: ['read:user'],
  missingScopes: ['repo', 'workflow'],
  connectedAt: '2026-01-01T00:00:00Z',
};

const disconnected: ServiceConnection = {
  provider: 'slack',
  status: 'DISCONNECTED',
  grantedScopes: [],
  missingScopes: [],
  connectedAt: null,
};

describe('mosaic-provider-status-row', () => {
  let el: ProviderStatusRowEl;

  beforeEach(async () => {
    el = document.createElement('mosaic-provider-status-row') as ProviderStatusRowEl;
    el.connection = connected;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('has aria-label with provider name and status', () => {
    expect(el.getAttribute('aria-label')).toBe('Google — Connected');
  });

  it('renders status badge with correct text for CONNECTED', () => {
    const badge = el.shadowRoot!.querySelector('.status-badge');
    expect(badge).not.toBeNull();
    expect(badge!.textContent!.trim()).toBe('Connected');
  });

  it('renders status badge for PARTIAL', async () => {
    el.connection = partial;
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.status-badge');
    expect(badge!.textContent!.trim()).toBe('Partial');
  });

  it('renders status badge for DISCONNECTED', async () => {
    el.connection = disconnected;
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.status-badge');
    expect(badge!.textContent!.trim()).toBe('Disconnected');
  });

  it('shows Disconnect button for CONNECTED status', () => {
    const btn = el.shadowRoot!.querySelector('.action-btn');
    expect(btn!.textContent!.trim()).toBe('Disconnect');
  });

  it('shows Grant Access button for PARTIAL status', async () => {
    el.connection = partial;
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('.action-btn');
    expect(btn!.textContent!.trim()).toBe('Grant Access');
  });

  it('shows Connect button for DISCONNECTED status', async () => {
    el.connection = disconnected;
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('.action-btn');
    expect(btn!.textContent!.trim()).toBe('Connect');
  });

  it('emits connection.disconnect on Disconnect click', () => {
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    expect(handler).toHaveBeenCalledOnce();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('connection.disconnect');
    expect(detail.payload.provider).toBe('google');
  });

  it('emits connection.consent with missingScopes for PARTIAL', async () => {
    el.connection = partial;
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    expect(handler).toHaveBeenCalledOnce();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('connection.consent');
    expect(detail.payload.provider).toBe('github');
    expect(detail.payload.missingScopes).toEqual(['repo', 'workflow']);
  });

  it('emits connection.connect for DISCONNECTED', async () => {
    el.connection = disconnected;
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('pages-event', handler);
    el.shadowRoot!.querySelector<HTMLButtonElement>('.action-btn')!.click();
    expect(handler).toHaveBeenCalledOnce();
    const detail = (handler.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.topic).toBe('connection.connect');
    expect(detail.payload.provider).toBe('slack');
  });

  it('renders scope-list with granted and missing scopes', () => {
    const scopeList = el.shadowRoot!.querySelector('mosaic-scope-list');
    expect(scopeList).not.toBeNull();
  });

  it('updates aria-label when connection changes', async () => {
    el.connection = partial;
    await el.updateComplete;
    expect(el.getAttribute('aria-label')).toBe('GitHub — Partial');
  });

  it('shows loading overlay when loading=true', async () => {
    el.loading = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.loading-overlay')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.action-btn')!.hasAttribute('disabled')).toBe(true);
  });

  it('shows error message when error is set', async () => {
    el.error = 'Failed to disconnect';
    await el.updateComplete;
    const errorEl = el.shadowRoot!.querySelector('.error-msg');
    expect(errorEl).not.toBeNull();
    expect(errorEl!.textContent).toContain('Failed to disconnect');
  });
});
