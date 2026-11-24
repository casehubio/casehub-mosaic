import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import './casehub-diagram-toolbar.js';

type ToolbarEl = HTMLElement & {
  dirty: boolean;
  saving: boolean;
  hasBackend: boolean;
  runtimeAvailable: boolean;
  mode: 'design' | 'runtime';
  staleSeconds: number;
  diagramType: string;
  updateComplete: Promise<boolean>;
};

describe('casehub-diagram-toolbar', () => {
  let el: ToolbarEl;

  beforeEach(async () => {
    el = document.createElement('casehub-diagram-toolbar') as ToolbarEl;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('shows save button when hasBackend is true', async () => {
    el.hasBackend = true;
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('button');
    expect(btn).not.toBeNull();
  });

  it('hides save button when hasBackend is false', () => {
    const btns = Array.from(el.shadowRoot!.querySelectorAll('button'));
    expect(btns.some(b => b.textContent!.trim() === 'Save')).toBe(false);
  });

  it('emits toolbar-save on save button click', async () => {
    el.hasBackend = true;
    el.dirty = true;
    await el.updateComplete;
    const handler = vi.fn();
    el.addEventListener('toolbar-save', handler);
    el.shadowRoot!.querySelector('button')!.click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('disables save button when not dirty', async () => {
    el.hasBackend = true;
    el.dirty = false;
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows dirty indicator when dirty is true', async () => {
    el.hasBackend = true;
    el.dirty = true;
    await el.updateComplete;
    const dot = el.shadowRoot!.querySelector('.dirty-dot');
    expect(dot).not.toBeNull();
  });

  it('hides dirty indicator when dirty is false', async () => {
    el.hasBackend = true;
    el.dirty = false;
    await el.updateComplete;
    const dot = el.shadowRoot!.querySelector('.dirty-dot');
    expect(dot).toBeNull();
  });

  it('disables save button while saving', async () => {
    el.hasBackend = true;
    el.dirty = true;
    el.saving = true;
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('shows Saving text while saving', async () => {
    el.hasBackend = true;
    el.dirty = true;
    el.saving = true;
    await el.updateComplete;
    const btn = el.shadowRoot!.querySelector('button')!;
    expect(btn.textContent!.trim()).toContain('Saving');
  });
});

describe('mode toggle', () => {
  let el: ToolbarEl;

  beforeEach(async () => {
    el = document.createElement('casehub-diagram-toolbar') as ToolbarEl;
    el.hasBackend = true;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('hides toggle when runtimeAvailable is false', () => {
    expect(el.shadowRoot!.querySelector('.mode-toggle')).toBeNull();
  });

  it('shows toggle when runtimeAvailable is true', async () => {
    el.runtimeAvailable = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.mode-toggle')).not.toBeNull();
  });

  it('emits toolbar-mode-change on toggle click', async () => {
    el.runtimeAvailable = true;
    await el.updateComplete;
    const events: CustomEvent[] = [];
    el.addEventListener('toolbar-mode-change', (e) => events.push(e as CustomEvent));
    el.shadowRoot!.querySelector<HTMLButtonElement>('.mode-toggle')!.click();
    expect(events).toHaveLength(1);
    expect(events[0]!.detail.mode).toBe('runtime');
  });

  it('toggles between design and runtime', async () => {
    el.runtimeAvailable = true;
    await el.updateComplete;
    const events: CustomEvent[] = [];
    el.addEventListener('toolbar-mode-change', (e) => events.push(e as CustomEvent));
    const btn = el.shadowRoot!.querySelector<HTMLButtonElement>('.mode-toggle')!;
    btn.click();
    expect(events[0]!.detail.mode).toBe('runtime');
    el.mode = 'runtime';
    await el.updateComplete;
    btn.click();
    expect(events[1]!.detail.mode).toBe('design');
  });

  it('shows staleness badge when staleSeconds > 0', async () => {
    el.runtimeAvailable = true;
    el.staleSeconds = 45;
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.stale-badge');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('45s');
  });

  it('hides staleness badge when staleSeconds is 0', async () => {
    el.runtimeAvailable = true;
    el.staleSeconds = 0;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.stale-badge')).toBeNull();
  });
});

describe('diagram type badge', () => {
  let el: ToolbarEl;

  beforeEach(async () => {
    el = document.createElement('casehub-diagram-toolbar') as ToolbarEl;
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el.remove();
  });

  it('renders badge with correct text for known type', async () => {
    el.diagramType = 'choreography';
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.diagram-type-badge');
    expect(badge).not.toBeNull();
    expect(badge!.textContent!.trim()).toBe('choreography');
  });

  it('hides badge when diagramType is empty', async () => {
    el.diagramType = '';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.diagram-type-badge')).toBeNull();
  });

  it('hides badge when diagramType is unknown', async () => {
    el.diagramType = 'unknown';
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.diagram-type-badge')).toBeNull();
  });

  it('renders badge for any string type (open set)', async () => {
    el.diagramType = 'avatar-conf';
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.diagram-type-badge');
    expect(badge).not.toBeNull();
    expect(badge!.textContent!.trim()).toBe('avatar-conf');
  });

  it('has correct ARIA attributes', async () => {
    el.diagramType = 'htn';
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.diagram-type-badge')!;
    expect(badge.getAttribute('role')).toBe('status');
    expect(badge.getAttribute('aria-label')).toBe('Document type: htn');
  });

  it('applies semantic variant class for known type', async () => {
    el.diagramType = 'choreography';
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.diagram-type-badge')!;
    expect(badge.classList.contains('info')).toBe(true);
  });

  it('applies neutral variant for unregistered type', async () => {
    el.diagramType = 'custom-type';
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.diagram-type-badge')!;
    expect(badge.classList.contains('neutral')).toBe(true);
  });

  it('does not use inline background style', async () => {
    el.diagramType = 'htn';
    await el.updateComplete;
    const badge = el.shadowRoot!.querySelector('.diagram-type-badge')!;
    expect(badge.getAttribute('style')).toBeNull();
  });
});
