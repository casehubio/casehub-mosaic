import { describe, it, expect } from 'vitest';
import type { SummarisationSnapshot } from '@casehubio/mosaic-core';

const SAMPLE_SNAPSHOT: SummarisationSnapshot = {
  snapshotId: 'snap-1',
  caseExecutionId: 'exec-1',
  pipelineName: 'clinical-pipeline',
  timeRange: { from: 0, to: 10000 },
  rawEvents: [
    { id: 'l1-1', timestamp: 1000, classification: 'normal', payload: {}, lineageRefs: ['l2-1'] },
    { id: 'l1-2', timestamp: 2000, classification: 'abnormal', payload: {}, lineageRefs: ['l2-1'] },
  ],
  summarisedEvents: [
    { id: 'l2-1', from: 1000, to: 3000, label: 'Burst Episode', classification: 'alert', payload: {}, sourceRefs: ['l1-1', 'l1-2'], lineageRefs: ['l3-1'] },
  ],
  phaseSummaries: [
    { id: 'l3-1', from: 0, to: 5000, label: 'Observation', classification: 'stable', payload: {}, sourceRefs: ['l2-1'] },
  ],
  steps: [
    { caseId: 'c1', stepName: 'Triage', signals: [], from: 0, to: 5000 },
  ],
};

describe('SummarisationTimeline (shell)', () => {
  it('can be instantiated', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    expect(el).toBeDefined();
  });

  it('accepts inline data via property', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    el.data = SAMPLE_SNAPSHOT;
    expect(el.data.pipelineName).toBe('clinical-pipeline');
    expect(el.data.rawEvents).toHaveLength(2);
  });

  it('accepts endpoint property', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    el.endpoint = '/api/snapshots/1';
    expect(el.endpoint).toBe('/api/snapshots/1');
  });

  it('accepts classificationColours override', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    el.classificationColours = { normal: '#00ff00', abnormal: '#ff0000' };
    expect(el.classificationColours.normal).toBe('#00ff00');
  });

  it('accepts timestampFormat attribute', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    el.timestampFormat = 'utc';
    expect(el.timestampFormat).toBe('utc');
  });

  it('has correct tag name', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    expect(el.tagName.toLowerCase()).toBe('agency-summarisation-timeline');
  });

  it('exports SummarisationTimelineProps type via index', async () => {
    const mod = await import('./index.js');
    expect(mod.SummarisationTimeline).toBeDefined();
  });

  it('provides loading state from DataSourceMixin', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    expect(el.loading).toBeDefined();
    expect(typeof el.loading).toBe('boolean');
  });

  it('provides error state from DataSourceMixin', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    expect(el.error).toBeDefined();
    expect(typeof el.error).toBe('string');
  });

  it('resolveEndpoint returns undefined when inline data is set', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    el.data = SAMPLE_SNAPSHOT;
    expect(el.resolveEndpoint()).toBeUndefined();
  });

  it('resolveEndpoint returns endpoint when no inline data', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    el.endpoint = '/api/snapshots/1';
    expect(el.resolveEndpoint()).toBe('/api/snapshots/1');
  });

  it('accepts narrativeEndpoint property', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    el.narrativeEndpoint = '/api/narrative/1';
    expect(el.narrativeEndpoint).toBe('/api/narrative/1');
  });

  it('uses snapshot steps when no narrativeEndpoint is set', async () => {
    const { SummarisationTimeline } = await import('./summarisation-timeline.js');
    const el = new SummarisationTimeline();
    el.data = SAMPLE_SNAPSHOT;
    expect(el.data.steps).toHaveLength(1);
  });
});
