import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './scope-list.js';

type ScopeListEl = HTMLElement & {
  grantedScopes: readonly string[];
  missingScopes: readonly string[];
  expanded: boolean;
  updateComplete: Promise<boolean>;
};

describe('mosaic-scope-list', () => {
  let el: ScopeListEl;

  beforeEach(async () => {
    el = document.createElement('mosaic-scope-list') as ScopeListEl;
    el.grantedScopes = ['email', 'profile'];
    el.missingScopes = ['calendar'];
    el.expanded = true;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => { el.remove(); });

  it('has role="list"', () => {
    const list = el.shadowRoot!.querySelector('[role="list"]');
    expect(list).not.toBeNull();
  });

  it('renders granted scopes', () => {
    expect(el.shadowRoot!.textContent).toContain('email');
    expect(el.shadowRoot!.textContent).toContain('profile');
  });

  it('renders missing scopes with warning styling', () => {
    const missing = el.shadowRoot!.querySelectorAll('.scope-missing');
    expect(missing.length).toBe(1);
  });

  it('supports aria-expanded toggle', async () => {
    el.expanded = false;
    await el.updateComplete;
    const toggle = el.shadowRoot!.querySelector('[aria-expanded]');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');

    el.expanded = true;
    await el.updateComplete;
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
  });
});
