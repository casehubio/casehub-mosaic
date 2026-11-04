import { describe, it, expect } from 'vitest';
import type { TimePositionedStep } from '@casehubio/mosaic-core';

function makeStep(name: string, from: number, to: number): TimePositionedStep {
  return {
    caseId: 'c1', stepName: name,
    signals: [{ type: 'CONFIRM', summary: 'Patient stable', confidence: 0.85, keyFacts: ['HR normal'] }],
    from, to,
  };
}

describe('SummarisationLaneL4', () => {
  it('can be instantiated', async () => {
    const { SummarisationLaneL4 } = await import('./lane-l4.js');
    const el = new SummarisationLaneL4();
    expect(el).toBeDefined();
  });

  it('accepts steps and narrative via property', async () => {
    const { SummarisationLaneL4 } = await import('./lane-l4.js');
    const el = new SummarisationLaneL4();
    el.steps = [makeStep('Triage', 100, 400)];
    el.narrative = { explanation: 'Summary text' };
    expect(el.steps).toHaveLength(1);
    expect(el.steps[0]!.stepName).toBe('Triage');
    expect(el.narrative!.explanation).toBe('Summary text');
  });

  it('accepts visibleRange and containerWidth', async () => {
    const { SummarisationLaneL4 } = await import('./lane-l4.js');
    const el = new SummarisationLaneL4();
    el.visibleRange = { from: 0, to: 1000 };
    el.containerWidth = 500;
    expect(el.visibleRange.to).toBe(1000);
  });
});
