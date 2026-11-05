import type { RawEvent, TimeRange } from '@casehubio/mosaic-core';

let nextKey = 0;
function genKey(): string { return `c${nextKey++}`; }

export interface EventCluster {
  key: string;
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
  previousClusters?: readonly EventCluster[],
): EventCluster[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const duration = visibleRange.to - visibleRange.from;
  if (duration <= 0) return [];

  const msPerPixel = duration / containerWidth;
  const minMsSeparation = msPerPixel * minPixelSeparation;
  const splitThreshold = minMsSeparation * 1.5;

  const baseClusters = buildBaseClusters(sorted, minMsSeparation);

  if (!previousClusters || previousClusters.length === 0) {
    return baseClusters;
  }

  return applyHysteresis(baseClusters, previousClusters, splitThreshold);
}

function buildBaseClusters(sorted: RawEvent[], minMsSeparation: number): EventCluster[] {
  const clusters: EventCluster[] = [];
  let currentGroup: RawEvent[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i]!;
    const prev = sorted[i - 1]!;
    if (curr.timestamp - prev.timestamp < minMsSeparation) {
      currentGroup.push(curr);
    } else {
      clusters.push(buildCluster(currentGroup));
      currentGroup = [curr];
    }
  }
  clusters.push(buildCluster(currentGroup));
  return clusters;
}

function applyHysteresis(
  baseClusters: EventCluster[],
  previousClusters: readonly EventCluster[],
  splitThreshold: number,
): EventCluster[] {
  const prevEventSets = previousClusters.map(c => new Set(c.events.map(e => e.id)));
  const result: EventCluster[] = [];
  let i = 0;

  while (i < baseClusters.length) {
    const base = baseClusters[i]!;
    const matchingPrev = findMatchingPrevCluster(base, prevEventSets, previousClusters);

    if (matchingPrev) {
      if (baseClusters.length > previousClusters.length) {
        const nextBase = baseClusters[i + 1];
        if (nextBase) {
          const lastTs = base.events[base.events.length - 1]!.timestamp;
          const nextTs = nextBase.events[0]!.timestamp;
          const gap = nextTs - lastTs;
          if (gap < splitThreshold && sharesCluster(base, nextBase, prevEventSets)) {
            const merged = buildCluster([...base.events, ...nextBase.events]);
            result.push({ ...merged, key: matchingPrev.key });
            i += 2;
            continue;
          }
        }
      }

      if (baseClusters.length < previousClusters.length) {
        const prevParts = findPreviousParts(base, prevEventSets, previousClusters);
        if (prevParts.length > 1) {
          const maxGap = computeMaxGap(prevParts);
          if (maxGap > splitThreshold) {
            for (const part of prevParts) {
              const partEvents = [...base.events].filter(e => part.eventIds.has(e.id));
              if (partEvents.length > 0) {
                result.push({ ...buildCluster(partEvents), key: part.key });
              }
            }
            i++;
            continue;
          }
        }
      }

      result.push({ ...base, key: matchingPrev.key });
    } else {
      result.push(base);
    }
    i++;
  }

  return result;
}

function findMatchingPrevCluster(
  base: EventCluster,
  prevEventSets: Set<string>[],
  previousClusters: readonly EventCluster[],
): EventCluster | undefined {
  const baseIds = new Set(base.events.map(e => e.id));
  let bestMatch: EventCluster | undefined;
  let bestOverlap = 0;
  for (let j = 0; j < prevEventSets.length; j++) {
    let overlap = 0;
    for (const id of baseIds) {
      if (prevEventSets[j]!.has(id)) overlap++;
    }
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestMatch = previousClusters[j];
    }
  }
  return bestOverlap > 0 ? bestMatch : undefined;
}

function sharesCluster(
  a: EventCluster, b: EventCluster,
  prevEventSets: Set<string>[],
): boolean {
  const aIds = new Set(a.events.map(e => e.id));
  const bIds = new Set(b.events.map(e => e.id));
  for (const prevSet of prevEventSets) {
    const hasA = [...aIds].some(id => prevSet.has(id));
    const hasB = [...bIds].some(id => prevSet.has(id));
    if (hasA && hasB) return true;
  }
  return false;
}

interface PrevPart { key: string; eventIds: Set<string>; centroid: number }

function findPreviousParts(
  base: EventCluster,
  prevEventSets: Set<string>[],
  previousClusters: readonly EventCluster[],
): PrevPart[] {
  const baseIds = new Set(base.events.map(e => e.id));
  const parts: PrevPart[] = [];
  for (let j = 0; j < prevEventSets.length; j++) {
    const overlap = [...baseIds].filter(id => prevEventSets[j]!.has(id));
    if (overlap.length > 0) {
      parts.push({
        key: previousClusters[j]!.key,
        eventIds: new Set(overlap),
        centroid: previousClusters[j]!.centroidTimestamp,
      });
    }
  }
  return parts;
}

function computeMaxGap(parts: PrevPart[]): number {
  if (parts.length < 2) return 0;
  const sorted = [...parts].sort((a, b) => a.centroid - b.centroid);
  let maxGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    maxGap = Math.max(maxGap, sorted[i]!.centroid - sorted[i - 1]!.centroid);
  }
  return maxGap;
}

function buildCluster(events: readonly RawEvent[]): EventCluster {
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
    key: genKey(),
    centroidTimestamp: sum / events.length,
    events,
    count: events.length,
    dominantClassification: dominant,
    classificationBreakdown: breakdown,
  };
}
