import { describe, it, expect } from 'vitest';
import { clusterEvents } from './clustering.js';
import type { RawEvent } from '@casehubio/mosaic-core';

function makeEvent(id: string, timestamp: number, classification = 'normal'): RawEvent {
  return { id, timestamp, classification, payload: {}, lineageRefs: [] };
}

describe('clusterEvents', () => {
  it('returns individual events when spacing exceeds threshold', () => {
    const events = [makeEvent('e1', 100), makeEvent('e2', 200)];
    const clusters = clusterEvents(events, { from: 0, to: 1000 }, 500, 6);
    expect(clusters).toHaveLength(2);
    expect(clusters[0]!.events).toHaveLength(1);
    expect(clusters[1]!.events).toHaveLength(1);
  });

  it('merges events closer than threshold into a cluster', () => {
    const events = [makeEvent('e1', 100), makeEvent('e2', 101), makeEvent('e3', 102)];
    const clusters = clusterEvents(events, { from: 0, to: 200 }, 500, 6);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.events).toHaveLength(3);
    expect(clusters[0]!.count).toBe(3);
  });

  it('reports dominant classification by plurality', () => {
    const events = [
      makeEvent('e1', 100, 'normal'),
      makeEvent('e2', 101, 'abnormal'),
      makeEvent('e3', 102, 'normal'),
    ];
    const clusters = clusterEvents(events, { from: 0, to: 200 }, 500, 6);
    expect(clusters[0]!.dominantClassification).toBe('normal');
  });

  it('breaks classification ties by temporal order (first event)', () => {
    const events = [
      makeEvent('e1', 100, 'a'),
      makeEvent('e2', 101, 'b'),
    ];
    const clusters = clusterEvents(events, { from: 0, to: 200 }, 500, 6);
    expect(clusters[0]!.dominantClassification).toBe('a');
  });

  it('returns empty array for empty input', () => {
    const clusters = clusterEvents([], { from: 0, to: 1000 }, 500, 6);
    expect(clusters).toHaveLength(0);
  });

  it('preserves event order within cluster', () => {
    const events = [makeEvent('e1', 100), makeEvent('e2', 101)];
    const clusters = clusterEvents(events, { from: 0, to: 200 }, 500, 6);
    expect(clusters[0]!.events[0]!.id).toBe('e1');
    expect(clusters[0]!.events[1]!.id).toBe('e2');
  });

  it('assigns stable key to each cluster', () => {
    const events = [makeEvent('e1', 100), makeEvent('e2', 200)];
    const clusters = clusterEvents(events, { from: 0, to: 1000 }, 500, 6);
    expect(clusters[0]!.key).toBeDefined();
    expect(typeof clusters[0]!.key).toBe('string');
    expect(clusters[0]!.key).not.toBe(clusters[1]!.key);
  });

  it('preserves cluster keys when zoom does not cross threshold', () => {
    const events = [makeEvent('e1', 100), makeEvent('e2', 101), makeEvent('e3', 200)];
    const first = clusterEvents(events, { from: 0, to: 1000 }, 500, 6);
    const second = clusterEvents(events, { from: 0, to: 1050 }, 500, 6, first);
    expect(second[0]!.key).toBe(first[0]!.key);
  });

  it('resists splitting until gap exceeds splitThreshold (1.5x)', () => {
    // containerWidth=600, range=600: msPerPixel=1, minMsSep=6, splitThreshold=9
    const events = [makeEvent('e1', 100), makeEvent('e2', 107)];
    const first = clusterEvents(events, { from: 0, to: 600 }, 600, 6);
    expect(first).toHaveLength(2);
    // Zoom in: range=500, msPerPixel=0.833, minMsSep=5, splitThreshold=7.5
    // Gap=7 < splitThreshold=7.5 and they were split — hysteresis preserves split
    const second = clusterEvents(events, { from: 0, to: 500 }, 600, 6, first);
    expect(second).toHaveLength(2);
  });

  it('resists splitting when gap is within hysteresis dead zone', () => {
    // containerWidth=600, range=1200: msPerPixel=2, minMsSep=12
    const events = [makeEvent('e1', 100), makeEvent('e2', 108)];
    const first = clusterEvents(events, { from: 0, to: 1200 }, 600, 6);
    expect(first).toHaveLength(1);
    // Zoom out: range=600, msPerPixel=1, minMsSep=6, splitThreshold=9
    // Gap=8 > 6 so base would split, but they were merged and gap < splitThreshold=9
    const second = clusterEvents(events, { from: 0, to: 600 }, 600, 6, first);
    expect(second).toHaveLength(1);
  });

  it('splits when gap genuinely exceeds splitThreshold', () => {
    const events = [makeEvent('e1', 100), makeEvent('e2', 120)];
    // containerWidth=600, range=600: msPerPixel=1, splitThreshold=9
    const first = clusterEvents(events, { from: 0, to: 600 }, 600, 6);
    expect(first).toHaveLength(2);
    // Zoom in: range=300, msPerPixel=0.5, splitThreshold=4.5
    // gap=20 > 4.5, still split
    const second = clusterEvents(events, { from: 0, to: 300 }, 600, 6, first);
    expect(second).toHaveLength(2);
  });

  it('works without previousClusters (backward compatible)', () => {
    const events = [makeEvent('e1', 100), makeEvent('e2', 200)];
    const clusters = clusterEvents(events, { from: 0, to: 1000 }, 500, 6);
    expect(clusters).toHaveLength(2);
    expect(clusters[0]!.key).toBeDefined();
  });
});
