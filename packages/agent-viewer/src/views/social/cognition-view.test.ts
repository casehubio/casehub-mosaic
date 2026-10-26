import { describe, it, expect, afterEach } from 'vitest';
import type { SocialPatternCategory } from '@casehubio/mosaic-core';
import './cognition-view.js';

function fixture(): SocialPatternCategory {
  return {
    category: 'social',
    type: 'cognition',
    name: 'agent-cognition',
    description: 'Full cognitive configuration for autonomous agent',
    cognition: {
      drive: { baseLevel: 0.5, decayRate: 0.1 },
      mood: { volatility: 0.3 },
      retention: { retentionThreshold: 0.6, confidenceWeight: 0.4 },
      mentalModel: { updateFrequency: 'per-turn' },
    },
  };
}

describe('agency-social-cognition-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-social-cognition-view');
    (el as any).spec = spec;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label', async () => {
    await create(fixture());
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('social view');
  });

  it('renders type badge', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('cognition');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('agent-cognition');
  });

  it('renders all 13 section cards', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('.section-card').length).toBe(13);
  });

  it('marks configured sections as active', async () => {
    await create(fixture());
    const active = el.shadowRoot!.querySelectorAll('.section-card.active');
    expect(active.length).toBe(4);
  });

  it('renders ON/OFF status badges', async () => {
    await create(fixture());
    const onBadges = el.shadowRoot!.querySelectorAll('.status-active');
    const offBadges = el.shadowRoot!.querySelectorAll('.status-inactive');
    expect(onBadges.length).toBe(4);
    expect(offBadges.length).toBe(9);
  });

  it('renders config keys for active sections', async () => {
    await create(fixture());
    const tags = el.shadowRoot!.querySelectorAll('.key-tag');
    expect(tags.length).toBeGreaterThan(0);
    const text = Array.from(tags).map(t => t.textContent);
    expect(text).toContain('baseLevel');
    expect(text).toContain('decayRate');
  });

  it('renders summary count', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.summary')?.textContent).toBe('4 of 13 cognitive modules configured');
  });

  it('renders no-cognition message when cognition absent', async () => {
    await create({ category: 'social', type: 'cognition' });
    expect(el.shadowRoot!.querySelector('.no-cognition')).toBeTruthy();
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });
});
