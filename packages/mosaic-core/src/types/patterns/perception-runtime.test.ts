import { describe, it, expect } from 'vitest';
import {
  buildLineageIndex,
  toTimePositionedStep,
  computeEffectiveTimeRange,
  type SummarisationSnapshot,
  type SummarisedEvent,
} from './perception-runtime.js';

describe('buildLineageIndex', () => {
  it('builds bidirectional upward/downward lookup from sourceRefs', () => {
    const events: SummarisedEvent[] = [
      {
        id: 'l2-1', from: 100, to: 200, label: 'Episode A',
        classification: 'normal', payload: {},
        sourceRefs: ['l1-1', 'l1-2'], lineageRefs: ['l3-1'],
      },
    ];
    const index = buildLineageIndex([], events, []);
    expect(index.upward.get('l1-1')).toEqual(['l2-1']);
    expect(index.upward.get('l1-2')).toEqual(['l2-1']);
    expect(index.downward.get('l2-1')).toEqual(['l1-1', 'l1-2']);
  });

  it('handles multiple upward targets', () => {
    const events: SummarisedEvent[] = [
      {
        id: 'l2-1', from: 100, to: 200, label: 'A',
        classification: 'normal', payload: {},
        sourceRefs: ['l1-1'], lineageRefs: [],
      },
      {
        id: 'l2-2', from: 200, to: 300, label: 'B',
        classification: 'normal', payload: {},
        sourceRefs: ['l1-1'], lineageRefs: [],
      },
    ];
    const index = buildLineageIndex([], events, []);
    expect(index.upward.get('l1-1')).toEqual(['l2-1', 'l2-2']);
  });

  it('returns empty maps for empty input', () => {
    const index = buildLineageIndex([], [], []);
    expect(index.upward.size).toBe(0);
    expect(index.downward.size).toBe(0);
  });
});

describe('toTimePositionedStep', () => {
  it('converts ISO string timestamps to epoch-ms numbers', () => {
    const step = {
      caseId: 'case-1', stepName: 'step-1',
      signals: [], from: '2026-01-01T00:00:00Z', to: '2026-01-01T01:00:00Z',
    };
    const positioned = toTimePositionedStep(step);
    expect(positioned.from).toBe(new Date('2026-01-01T00:00:00Z').getTime());
    expect(positioned.to).toBe(new Date('2026-01-01T01:00:00Z').getTime());
    expect(typeof positioned.from).toBe('number');
  });
});

describe('computeEffectiveTimeRange', () => {
  it('returns snapshot timeRange when events fall within it', () => {
    const snapshot: SummarisationSnapshot = {
      snapshotId: 's1', caseExecutionId: 'c1', pipelineName: 'p1',
      timeRange: { from: 0, to: 1000 },
      rawEvents: [{ id: 'e1', timestamp: 500, classification: 'a', payload: {}, lineageRefs: [] }],
      summarisedEvents: [], phaseSummaries: [], steps: [],
    };
    const range = computeEffectiveTimeRange(snapshot);
    expect(range).toEqual({ from: 0, to: 1000 });
  });

  it('expands range when L4 steps extend beyond snapshot timeRange', () => {
    const snapshot: SummarisationSnapshot = {
      snapshotId: 's1', caseExecutionId: 'c1', pipelineName: 'p1',
      timeRange: { from: 100, to: 500 },
      rawEvents: [], summarisedEvents: [], phaseSummaries: [],
      steps: [{ caseId: 'c1', stepName: 's', signals: [], from: 50, to: 600 }],
    };
    const range = computeEffectiveTimeRange(snapshot);
    expect(range).toEqual({ from: 50, to: 600 });
  });

  it('returns snapshot timeRange for empty events', () => {
    const snapshot: SummarisationSnapshot = {
      snapshotId: 's1', caseExecutionId: 'c1', pipelineName: 'p1',
      timeRange: { from: 0, to: 1000 },
      rawEvents: [], summarisedEvents: [], phaseSummaries: [], steps: [],
    };
    const range = computeEffectiveTimeRange(snapshot);
    expect(range).toEqual({ from: 0, to: 1000 });
  });
});
