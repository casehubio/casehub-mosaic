import { describe, it, expect } from 'vitest';
import type { PhaseSummary } from '@casehubio/mosaic-core';

function makePhase(id: string, from: number, to: number, label: string): PhaseSummary {
  return { id, from, to, label, classification: 'stable', payload: {}, sourceRefs: ['l2-1'], windowPolicy: { maxCount: 5 } };
}

describe('SummarisationLaneL3', () => {
  it('can be instantiated', async () => {
    const { SummarisationLaneL3 } = await import('./lane-l3.js');
    const el = new SummarisationLaneL3();
    expect(el).toBeDefined();
  });

  it('accepts phaseSummaries via property', async () => {
    const { SummarisationLaneL3 } = await import('./lane-l3.js');
    const el = new SummarisationLaneL3();
    el.phaseSummaries = [makePhase('l3-1', 0, 500, 'Observation Phase')];
    expect(el.phaseSummaries).toHaveLength(1);
    expect(el.phaseSummaries[0]!.label).toBe('Observation Phase');
  });

  it('accepts highlight state', async () => {
    const { SummarisationLaneL3 } = await import('./lane-l3.js');
    const el = new SummarisationLaneL3();
    el.hoveredEventId = 'l3-1';
    el.highlightedIds = ['l3-1'];
    expect(el.hoveredEventId).toBe('l3-1');
  });
});
