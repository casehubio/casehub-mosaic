import { describe, it, expect } from 'vitest';
import type {
  SummarisationSnapshot, RawEvent, SummarisedEvent, PhaseSummary,
} from '@casehubio/mosaic-core';
import { buildLineageIndex } from '@casehubio/mosaic-core';
import { clusterEvents } from './clustering.js';
import { timestampToPixel, rangeToPixels, isPointVisible, isRangeVisible, classificationColour } from './styles.js';
import { computeAnchorPoint, computeBezierPath, computeLineagePaths } from './lineage-overlay.js';

const SAMPLE: SummarisationSnapshot = {
  snapshotId: 's1', caseExecutionId: 'c1', pipelineName: 'test',
  timeRange: { from: 0, to: 60000 },
  rawEvents: Array.from({ length: 50 }, (_, i) => ({
    id: `l1-${i}`, timestamp: i * 1200,
    classification: i % 3 === 0 ? 'abnormal' : 'normal',
    payload: {}, lineageRefs: [`l2-${Math.floor(i / 5)}`],
  })),
  summarisedEvents: Array.from({ length: 10 }, (_, i) => ({
    id: `l2-${i}`, from: i * 6000, to: (i + 1) * 6000 - 500,
    label: `Episode ${i + 1}`,
    classification: i % 4 === 0 ? 'alert' : 'normal',
    payload: { count: 5 },
    sourceRefs: Array.from({ length: 5 }, (_, j) => `l1-${i * 5 + j}`),
    lineageRefs: [i < 4 ? 'l3-0' : i < 7 ? 'l3-1' : 'l3-2'],
  })),
  phaseSummaries: [
    { id: 'l3-0', from: 0, to: 19000, label: 'Observation', classification: 'stable',
      payload: {}, sourceRefs: ['l2-0', 'l2-1', 'l2-2', 'l2-3'] },
    { id: 'l3-1', from: 24000, to: 41000, label: 'Deterioration', classification: 'critical',
      payload: {}, sourceRefs: ['l2-4', 'l2-5', 'l2-6'] },
    { id: 'l3-2', from: 42000, to: 59000, label: 'Recovery', classification: 'improving',
      payload: {}, sourceRefs: ['l2-7', 'l2-8', 'l2-9'] },
  ],
  steps: [
    { caseId: 'c1', stepName: 'Triage', signals: [], from: 0, to: 20000 },
    { caseId: 'c1', stepName: 'Escalation', signals: [], from: 20000, to: 40000 },
    { caseId: 'c1', stepName: 'Recovery', signals: [], from: 40000, to: 60000 },
  ],
};

describe('Regression: visible-range filtering', () => {
  it('isPointVisible excludes events outside visible range', () => {
    const vr = { from: 20000, to: 40000 };
    expect(isPointVisible(30000, vr)).toBe(true);
    expect(isPointVisible(10000, vr)).toBe(false);
    expect(isPointVisible(50000, vr)).toBe(false);
    expect(isPointVisible(20000, vr)).toBe(true);
    expect(isPointVisible(40000, vr)).toBe(true);
  });

  it('isRangeVisible detects overlap with visible range', () => {
    const vr = { from: 20000, to: 40000 };
    expect(isRangeVisible(25000, 35000, vr)).toBe(true);
    expect(isRangeVisible(10000, 25000, vr)).toBe(true);
    expect(isRangeVisible(35000, 50000, vr)).toBe(true);
    expect(isRangeVisible(0, 10000, vr)).toBe(false);
    expect(isRangeVisible(50000, 60000, vr)).toBe(false);
  });

  it('filtering L1 events by visible range reduces rendered count', () => {
    const vr = { from: 20000, to: 40000 };
    const visible = SAMPLE.rawEvents.filter((e: RawEvent) => isPointVisible(e.timestamp, vr));
    expect(visible.length).toBeLessThan(SAMPLE.rawEvents.length);
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.every((e: RawEvent) => e.timestamp >= 20000 && e.timestamp <= 40000)).toBe(true);
  });

  it('filtering L2 events by visible range excludes non-overlapping episodes', () => {
    const vr = { from: 30000, to: 50000 };
    const visible = SAMPLE.summarisedEvents.filter(
      (e: SummarisedEvent) => isRangeVisible(e.from, e.to, vr),
    );
    expect(visible.length).toBeLessThan(SAMPLE.summarisedEvents.length);
    expect(visible.every((e: SummarisedEvent) => e.to >= 30000 && e.from <= 50000)).toBe(true);
  });
});

describe('Regression: position clamping', () => {
  it('rangeToPixels computes correct left and width', () => {
    const result = rangeToPixels(10000, 30000, { from: 0, to: 60000 }, 600);
    expect(result.left).toBeCloseTo(100, 0);
    expect(result.width).toBeCloseTo(200, 0);
  });

  it('clamping prevents negative left for events starting before visible range', () => {
    let { left, width } = rangeToPixels(0, 30000, { from: 10000, to: 50000 }, 800);
    if (left < 0) { width += left; left = 0; }
    expect(left).toBe(0);
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThanOrEqual(800);
  });

  it('clamping prevents overflow for events extending past visible range', () => {
    let { left, width } = rangeToPixels(30000, 60000, { from: 10000, to: 50000 }, 800);
    if (left + width > 800) { width = 800 - left; }
    expect(left + width).toBeLessThanOrEqual(800);
  });

  it('clamping handles events fully outside visible range', () => {
    const { left } = rangeToPixels(0, 5000, { from: 20000, to: 40000 }, 800);
    expect(left).toBeLessThan(0);
  });
});

describe('Regression: lineage index completeness', () => {
  it('all L1 events have upward lineage to L2', () => {
    const index = buildLineageIndex(
      SAMPLE.rawEvents, SAMPLE.summarisedEvents, SAMPLE.phaseSummaries,
    );
    for (const event of SAMPLE.rawEvents) {
      const targets = index.upward.get(event.id);
      expect(targets, `L1 event ${event.id} should have upward lineage`).toBeDefined();
      expect(targets!.length).toBeGreaterThan(0);
    }
  });

  it('all L2 episodes have upward lineage to L3', () => {
    const index = buildLineageIndex(
      SAMPLE.rawEvents, SAMPLE.summarisedEvents, SAMPLE.phaseSummaries,
    );
    for (const event of SAMPLE.summarisedEvents) {
      const targets = index.upward.get(event.id);
      expect(targets, `L2 event ${event.id} should have upward lineage`).toBeDefined();
    }
  });

  it('no dangling sourceRefs in phase summaries', () => {
    const l2Ids = new Set(SAMPLE.summarisedEvents.map((e: SummarisedEvent) => e.id));
    for (const phase of SAMPLE.phaseSummaries) {
      for (const ref of phase.sourceRefs) {
        expect(l2Ids.has(ref), `Phase ${phase.id} sourceRef ${ref} should exist in L2`).toBe(true);
      }
    }
  });

  it('every L2 episode is referenced by exactly one L3 phase', () => {
    const covered = new Set<string>();
    for (const phase of SAMPLE.phaseSummaries) {
      for (const ref of phase.sourceRefs) {
        expect(covered.has(ref), `L2 ${ref} should not be in multiple phases`).toBe(false);
        covered.add(ref);
      }
    }
    for (const ep of SAMPLE.summarisedEvents) {
      expect(covered.has(ep.id), `L2 ${ep.id} should be covered by a phase`).toBe(true);
    }
  });
});

describe('Regression: multi-source lineage highlighting', () => {
  it('hovering L3 phase highlights all connected L2 episodes', () => {
    const index = buildLineageIndex(
      SAMPLE.rawEvents, SAMPLE.summarisedEvents, SAMPLE.phaseSummaries,
    );
    const recoveryPhase = SAMPLE.phaseSummaries[2]!;
    const highlightedIds = [...recoveryPhase.sourceRefs, recoveryPhase.id];

    const highlighted = new Set<string>();
    for (const id of highlightedIds) {
      const upIds = index.upward.get(id) ?? [];
      const downIds = index.downward.get(id) ?? [];
      for (const targetId of upIds) highlighted.add(`${id}->${targetId}`);
      for (const sourceId of downIds) highlighted.add(`${sourceId}->${id}`);
    }

    expect(highlighted.has('l2-7->l3-2')).toBe(true);
    expect(highlighted.has('l2-8->l3-2')).toBe(true);
    expect(highlighted.has('l2-9->l3-2')).toBe(true);
    expect(highlighted.size).toBeGreaterThanOrEqual(3);
  });

  it('single-event hover only highlights that events lineage', () => {
    const index = buildLineageIndex(
      SAMPLE.rawEvents, SAMPLE.summarisedEvents, SAMPLE.phaseSummaries,
    );
    const highlightedIds = ['l1-0'];

    const highlighted = new Set<string>();
    for (const id of highlightedIds) {
      const upIds = index.upward.get(id) ?? [];
      for (const targetId of upIds) highlighted.add(`${id}->${targetId}`);
    }

    expect(highlighted.has('l1-0->l2-0')).toBe(true);
    expect(highlighted.size).toBe(1);
  });
});

describe('Regression: classification colour palette', () => {
  it('returns custom colour when provided', () => {
    const colour = classificationColour('abnormal', { abnormal: '#ff0000' }, 0);
    expect(colour).toBe('#ff0000');
  });

  it('returns palette colour when no custom mapping', () => {
    const colour = classificationColour('unknown', undefined, 0);
    expect(colour).toContain('oklch');
  });

  it('cycles through palette for multiple classifications', () => {
    const c0 = classificationColour('a', undefined, 0);
    const c1 = classificationColour('b', undefined, 1);
    const c6 = classificationColour('g', undefined, 6);
    expect(c0).not.toBe(c1);
    expect(c6).toBe(c0);
  });
});

describe('Regression: custom element registration', () => {
  it('all lane custom elements are defined after import', async () => {
    await import('./lane-l1.js');
    await import('./lane-l2.js');
    await import('./lane-l3.js');
    await import('./lane-l4.js');
    await import('./minimap.js');
    await import('./summarisation-timeline.js');

    expect(customElements.get('summarisation-lane-l1')).toBeDefined();
    expect(customElements.get('summarisation-lane-l2')).toBeDefined();
    expect(customElements.get('summarisation-lane-l3')).toBeDefined();
    expect(customElements.get('summarisation-lane-l4')).toBeDefined();
    expect(customElements.get('summarisation-minimap')).toBeDefined();
    expect(customElements.get('agency-summarisation-timeline')).toBeDefined();
  });
});

describe('Regression: anchor point computation', () => {
  const svgRect = { left: 0, top: 0 } as DOMRect;

  it('L1 dot anchor is element centre', () => {
    const rect = { left: 100, top: 50, width: 8, height: 8 } as DOMRect;
    const p = computeAnchorPoint(rect, svgRect, 'l1', 'outgoing');
    expect(p.x).toBe(104);
    expect(p.y).toBe(54);
  });

  it('L2 outgoing anchor is bottom-centre', () => {
    const rect = { left: 50, top: 80, width: 100, height: 30 } as DOMRect;
    const p = computeAnchorPoint(rect, svgRect, 'l2', 'outgoing');
    expect(p.x).toBe(100);
    expect(p.y).toBe(110);
  });

  it('L2 incoming anchor is top-centre', () => {
    const rect = { left: 50, top: 80, width: 100, height: 30 } as DOMRect;
    const p = computeAnchorPoint(rect, svgRect, 'l2', 'incoming');
    expect(p.x).toBe(100);
    expect(p.y).toBe(80);
  });

  it('bezier path is valid SVG', () => {
    const path = computeBezierPath({ x: 100, y: 50 }, { x: 200, y: 150 });
    expect(path).toMatch(/^M \d+ \d+ C /);
  });
});

describe('Regression: L4 steps span full timeline', () => {
  it('steps cover the entire time range without gaps', () => {
    const sorted = [...SAMPLE.steps].sort((a, b) => a.from - b.from);
    expect(sorted[0]!.from).toBe(SAMPLE.timeRange.from);
    expect(sorted[sorted.length - 1]!.to).toBe(SAMPLE.timeRange.to);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.from).toBe(sorted[i - 1]!.to);
    }
  });
});
