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
});
