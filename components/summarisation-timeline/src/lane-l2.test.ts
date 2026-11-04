import { describe, it, expect } from 'vitest';
import type { SummarisedEvent } from '@casehubio/mosaic-core';

function makeEpisode(id: string, from: number, to: number, label: string): SummarisedEvent {
  return { id, from, to, label, classification: 'alert', payload: {}, sourceRefs: ['l1-1'], lineageRefs: [] };
}

describe('SummarisationLaneL2', () => {
  it('can be instantiated', async () => {
    const { SummarisationLaneL2 } = await import('./lane-l2.js');
    const el = new SummarisationLaneL2();
    expect(el).toBeDefined();
  });

  it('accepts summarisedEvents via property', async () => {
    const { SummarisationLaneL2 } = await import('./lane-l2.js');
    const el = new SummarisationLaneL2();
    el.summarisedEvents = [makeEpisode('l2-1', 100, 300, 'Episode A')];
    expect(el.summarisedEvents).toHaveLength(1);
    expect(el.summarisedEvents[0]!.label).toBe('Episode A');
  });

  it('accepts visibleRange and containerWidth', async () => {
    const { SummarisationLaneL2 } = await import('./lane-l2.js');
    const el = new SummarisationLaneL2();
    el.visibleRange = { from: 0, to: 1000 };
    el.containerWidth = 500;
    expect(el.visibleRange.to).toBe(1000);
  });

  it('accepts highlight state', async () => {
    const { SummarisationLaneL2 } = await import('./lane-l2.js');
    const el = new SummarisationLaneL2();
    el.hoveredEventId = 'l2-1';
    el.highlightedIds = ['l2-1'];
    expect(el.hoveredEventId).toBe('l2-1');
  });
});
