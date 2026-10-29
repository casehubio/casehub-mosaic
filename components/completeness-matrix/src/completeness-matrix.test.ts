import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { CompletenessMatrixData, LayerCompletion } from './types.js';

import './completeness-matrix.js';

type MatrixEl = HTMLElement & {
  data: CompletenessMatrixData | null;
  compact: boolean;
  updateComplete: Promise<boolean>;
};

const AGENTS: LayerCompletion = {
  layerId: 'agents', layerLabel: 'Agents', layerIcon: '🤖',
  signals: { exists: 'done', configured: 'done', tested: 'partial', deployed: 'missing' },
  nextAction: 'Add integration tests',
};

const PATTERNS: LayerCompletion = {
  layerId: 'patterns', layerLabel: 'Patterns', layerIcon: '🧩',
  signals: { exists: 'done', configured: 'done', tested: 'done', deployed: 'done' },
};

const SAMPLE: CompletenessMatrixData = { layers: [AGENTS, PATTERNS] };

describe('agency-completeness-matrix', () => {
  let el: MatrixEl;

  beforeEach(() => {
    el = document.createElement('agency-completeness-matrix') as MatrixEl;
    document.body.appendChild(el);
  });

  afterEach(() => { el.remove(); });

  it('renders empty state when no data', async () => {
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('No completeness data');
  });

  it('renders one row per layer', async () => {
    el.data = SAMPLE;
    await el.updateComplete;
    const rows = el.shadowRoot!.querySelectorAll('.matrix-row');
    expect(rows).toHaveLength(2);
  });

  it('renders signal column headers', async () => {
    el.data = SAMPLE;
    await el.updateComplete;
    const headers = el.shadowRoot!.querySelectorAll('[role="columnheader"]');
    const headerTexts = Array.from(headers).map(h => h.textContent?.trim());
    expect(headerTexts).toContain('exists');
    expect(headerTexts).toContain('deployed');
  });

  it('done signal renders green indicator', async () => {
    el.data = SAMPLE;
    await el.updateComplete;
    const cells = el.shadowRoot!.querySelectorAll('[role="cell"]');
    const doneCell = Array.from(cells).find(c => c.getAttribute('aria-label')?.includes('done'));
    expect(doneCell).not.toBeNull();
    expect(doneCell?.querySelector('.status-done')).not.toBeNull();
  });

  it('missing signal renders indicator', async () => {
    el.data = SAMPLE;
    await el.updateComplete;
    const cells = el.shadowRoot!.querySelectorAll('[role="cell"]');
    const missingCell = Array.from(cells).find(c => c.getAttribute('aria-label')?.includes('missing'));
    expect(missingCell).not.toBeNull();
    expect(missingCell?.querySelector('.status-missing')).not.toBeNull();
  });

  it('partial signal renders indicator', async () => {
    el.data = SAMPLE;
    await el.updateComplete;
    const cells = el.shadowRoot!.querySelectorAll('[role="cell"]');
    const partialCell = Array.from(cells).find(c => c.getAttribute('aria-label')?.includes('partial'));
    expect(partialCell).not.toBeNull();
    expect(partialCell?.querySelector('.status-partial')).not.toBeNull();
  });

  it('shows next action for incomplete layers', async () => {
    el.data = SAMPLE;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Add integration tests');
  });

  it('compact mode hides next action', async () => {
    el.data = SAMPLE;
    el.compact = true;
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).not.toContain('Add integration tests');
  });

  it('host has role region and aria-label', async () => {
    el.data = SAMPLE;
    await el.updateComplete;
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Project completeness');
  });

  it('table has role table', async () => {
    el.data = SAMPLE;
    await el.updateComplete;
    const table = el.shadowRoot!.querySelector('[role="table"]');
    expect(table).not.toBeNull();
  });
});
