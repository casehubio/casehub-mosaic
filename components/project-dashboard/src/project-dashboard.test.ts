import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ProjectDashboardData, LayerSummary } from './types.js';

vi.mock('@casehubio/pages-data', () => ({
  emitPagesEvent: vi.fn(),
}));

import { overallHealth } from './project-dashboard.js';
import { emitPagesEvent } from '@casehubio/pages-data';

import './project-dashboard.js';

type DashboardEl = HTMLElement & {
  data: ProjectDashboardData | null;
  compact: boolean;
  updateComplete: Promise<boolean>;
};

const AGENTS: LayerSummary = { id: 'agents', label: 'Agents', icon: '🤖', total: 12, completed: 8, health: 'degraded', metrics: [{ label: 'warnings', value: 2 }] };
const PATTERNS: LayerSummary = { id: 'patterns', label: 'Patterns', icon: '🧩', total: 15, completed: 15, health: 'healthy' };
const DESIRED: LayerSummary = { id: 'desired-state', label: 'Desired State', icon: '🎯', total: 7, completed: 4, health: 'incomplete', metrics: [{ label: 'drifted', value: 3 }] };
const DEPLOY: LayerSummary = { id: 'deployment', label: 'Deployment', icon: '🚀', total: 3, completed: 3, health: 'healthy' };

const SAMPLE_DATA: ProjectDashboardData = {
  projectName: 'KYC Pipeline',
  layers: [AGENTS, PATTERNS, DESIRED, DEPLOY],
};

describe('overallHealth', () => {
  it('returns healthy when all layers are healthy', () => {
    expect(overallHealth([PATTERNS, DEPLOY])).toBe('healthy');
  });

  it('returns degraded when any layer is degraded', () => {
    expect(overallHealth([PATTERNS, AGENTS, DEPLOY])).toBe('degraded');
  });

  it('returns incomplete when any layer is incomplete', () => {
    expect(overallHealth([PATTERNS, AGENTS, DESIRED])).toBe('incomplete');
  });

  it('returns healthy for empty layers', () => {
    expect(overallHealth([])).toBe('healthy');
  });
});

describe('agency-project-dashboard', () => {
  let el: DashboardEl;

  beforeEach(() => {
    el = document.createElement('agency-project-dashboard') as DashboardEl;
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
    vi.clearAllMocks();
  });

  it('renders empty state when no data', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No project data');
  });

  it('renders project name in header', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('KYC Pipeline');
  });

  it('renders one card per layer', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const cards = el.shadowRoot!.querySelectorAll('[role="button"]');
    expect(cards).toHaveLength(4);
  });

  it('each card shows icon and label', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const cards = el.shadowRoot!.querySelectorAll('[role="button"]');
    expect(cards[0].textContent).toContain('🤖');
    expect(cards[0].textContent).toContain('Agents');
  });

  it('each card shows progress count', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const cards = el.shadowRoot!.querySelectorAll('[role="button"]');
    expect(cards[0].textContent).toContain('8');
    expect(cards[0].textContent).toContain('12');
  });

  it('progress bar has correct ARIA attributes', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const bar = el.shadowRoot!.querySelector('[role="progressbar"]');
    expect(bar).not.toBeNull();
    expect(bar!.getAttribute('aria-valuenow')).toBe('8');
    expect(bar!.getAttribute('aria-valuemax')).toBe('12');
  });

  it('health badge shows correct text', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const cards = el.shadowRoot!.querySelectorAll('[role="button"]');
    expect(cards[0].textContent).toContain('degraded');
  });

  it('card click emits pages-event with layer id', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const cards = el.shadowRoot!.querySelectorAll('[role="button"]');
    (cards[1] as HTMLElement).click();
    expect(emitPagesEvent).toHaveBeenCalledWith(
      el, 'project.layer-selected',
      { layerId: 'patterns', layerLabel: 'Patterns' },
    );
  });

  it('overall health badge reflects worst layer', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const header = el.shadowRoot!.querySelector('.header');
    expect(header?.textContent).toContain('incomplete');
  });

  it('compact mode hides metrics', async () => {
    el.data = SAMPLE_DATA;
    el.compact = true;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).not.toContain('warnings');
  });

  it('host has role region and aria-label', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Project dashboard');
  });

  it('card aria-label includes count and health', async () => {
    el.data = SAMPLE_DATA;
    await el.updateComplete;
    const cards = el.shadowRoot!.querySelectorAll('[role="button"]');
    expect(cards[0].getAttribute('aria-label')).toBe('Agents: 8 of 12, degraded');
  });
});
