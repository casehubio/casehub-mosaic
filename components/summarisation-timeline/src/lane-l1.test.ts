import { describe, it, expect } from 'vitest';
import type { RawEvent } from '@casehubio/mosaic-core';

function makeEvent(id: string, ts: number, cls = 'normal'): RawEvent {
  return { id, timestamp: ts, classification: cls, payload: {}, lineageRefs: [] };
}

describe('SummarisationLaneL1', () => {
  it('can be instantiated', async () => {
    const { SummarisationLaneL1 } = await import('./lane-l1.js');
    const el = new SummarisationLaneL1();
    expect(el).toBeDefined();
  });

  it('accepts rawEvents via property', async () => {
    const { SummarisationLaneL1 } = await import('./lane-l1.js');
    const el = new SummarisationLaneL1();
    const events = [makeEvent('e1', 100), makeEvent('e2', 500)];
    el.rawEvents = events;
    expect(el.rawEvents).toHaveLength(2);
  });

  it('accepts visibleRange and containerWidth', async () => {
    const { SummarisationLaneL1 } = await import('./lane-l1.js');
    const el = new SummarisationLaneL1();
    el.visibleRange = { from: 0, to: 1000 };
    el.containerWidth = 500;
    expect(el.visibleRange.to).toBe(1000);
    expect(el.containerWidth).toBe(500);
  });

  it('accepts classificationColours override', async () => {
    const { SummarisationLaneL1 } = await import('./lane-l1.js');
    const el = new SummarisationLaneL1();
    el.classificationColours = { normal: '#00ff00' };
    expect(el.classificationColours.normal).toBe('#00ff00');
  });

  it('accepts highlight state', async () => {
    const { SummarisationLaneL1 } = await import('./lane-l1.js');
    const el = new SummarisationLaneL1();
    el.hoveredEventId = 'e1';
    el.highlightedIds = ['e1', 'l2-1'];
    expect(el.hoveredEventId).toBe('e1');
    expect(el.highlightedIds).toHaveLength(2);
  });
});
