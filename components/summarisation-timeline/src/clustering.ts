import type { RawEvent, TimeRange } from '@casehubio/mosaic-core';

export interface EventCluster {
  centroidTimestamp: number;
  events: readonly RawEvent[];
  count: number;
  dominantClassification: string;
  classificationBreakdown: ReadonlyMap<string, number>;
}

export function clusterEvents(
  events: readonly RawEvent[],
  visibleRange: TimeRange,
  containerWidth: number,
  minPixelSeparation: number,
): EventCluster[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const duration = visibleRange.to - visibleRange.from;
  if (duration <= 0) return [];

  const msPerPixel = duration / containerWidth;
  const minMsSeparation = msPerPixel * minPixelSeparation;

  const clusters: EventCluster[] = [];
  let currentGroup: RawEvent[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i]!;
    const prev = sorted[i - 1]!;
    const gap = curr.timestamp - prev.timestamp;
    if (gap < minMsSeparation) {
      currentGroup.push(curr);
    } else {
      clusters.push(buildCluster(currentGroup));
      currentGroup = [curr];
    }
  }
  clusters.push(buildCluster(currentGroup));

  return clusters;
}

function buildCluster(events: RawEvent[]): EventCluster {
  const breakdown = new Map<string, number>();
  let sum = 0;
  for (const e of events) {
    sum += e.timestamp;
    breakdown.set(e.classification, (breakdown.get(e.classification) ?? 0) + 1);
  }

  let dominant = events[0]!.classification;
  let maxCount = 0;
  for (const [cls, count] of breakdown) {
    if (count > maxCount) {
      maxCount = count;
      dominant = cls;
    }
  }

  return {
    centroidTimestamp: sum / events.length,
    events,
    count: events.length,
    dominantClassification: dominant,
    classificationBreakdown: breakdown,
  };
}
