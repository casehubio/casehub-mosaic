import { describe, it, expect, afterEach } from 'vitest';
import type { DeliberationPatternCategory } from '@casehubio/mosaic-core';
import './negotiation-view.js';

function fixture(): DeliberationPatternCategory {
  return {
    category: 'deliberation',
    type: 'negotiation',
    name: 'contract-terms',
    description: 'Agents negotiate contract terms through proposals and counter-proposals',
    maxRounds: 5,
    aggregation: { type: 'majority-vote' },
    termination: [{ type: 'all-agreed' }, { type: 'max-iterations' }],
    failurePolicy: { onRoutingFailure: 'FAIL', onDeadlock: 'ESCALATE' },
    agents: [
      { type: 'worker', name: 'buyer-agent', description: 'Represents buyer interests', capabilities: ['negotiation'] },
      { type: 'worker', name: 'seller-agent', description: 'Represents seller interests', capabilities: ['negotiation'] },
    ],
  };
}

describe('agency-deliberation-negotiation-view', () => {
  let el: HTMLElement;

  afterEach(() => el?.remove());

  async function create(spec: any) {
    el = document.createElement('agency-deliberation-negotiation-view');
    (el as any).spec = spec;
    document.body.appendChild(el);
    await (el as any).updateComplete;
  }

  it('has role="region" and aria-label', async () => {
    await create(fixture());
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('deliberation view');
  });

  it('renders category and type badges', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-label')?.textContent).toBe('PATTERN');
    expect(el.shadowRoot!.querySelector('.type-badge')?.textContent).toBe('negotiation');
  });

  it('renders name', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelector('.header-name')?.textContent).toBe('contract-terms');
  });

  it('renders agent cards', async () => {
    await create(fixture());
    expect(el.shadowRoot!.querySelectorAll('agent-card').length).toBe(2);
  });

  it('renders negotiation rounds', async () => {
    await create(fixture());
    const rounds = el.shadowRoot!.querySelectorAll('.round-entry');
    expect(rounds.length).toBeGreaterThan(0);
  });

  it('renders max rounds', async () => {
    await create(fixture());
    expect(el.shadowRoot!.textContent).toContain('5');
  });

  it('renders empty state when no spec', async () => {
    await create(undefined);
    expect(el.shadowRoot!.querySelector('.empty-state')).toBeTruthy();
  });
});
