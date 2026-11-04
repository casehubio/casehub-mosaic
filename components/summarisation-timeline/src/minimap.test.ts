import { describe, it, expect } from 'vitest';

describe('SummarisationMinimap', () => {
  it('can be instantiated', async () => {
    const { SummarisationMinimap } = await import('./minimap.js');
    const el = new SummarisationMinimap();
    expect(el).toBeDefined();
  });

  it('accepts effectiveRange and visibleRange', async () => {
    const { SummarisationMinimap } = await import('./minimap.js');
    const el = new SummarisationMinimap();
    el.effectiveRange = { from: 0, to: 1000 };
    el.visibleRange = { from: 200, to: 600 };
    expect(el.effectiveRange.to).toBe(1000);
    expect(el.visibleRange.from).toBe(200);
  });

  it('accepts eventTimestamps for density display', async () => {
    const { SummarisationMinimap } = await import('./minimap.js');
    const el = new SummarisationMinimap();
    el.eventTimestamps = [100, 200, 300, 400, 500];
    expect(el.eventTimestamps).toHaveLength(5);
  });
});
