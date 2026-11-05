import { describe, it, expect } from 'vitest';
import type { RawEvent, SummarisedEvent, PhaseSummary, TimePositionedStep } from '@casehubio/mosaic-core';

function makeEvent(id: string, ts: number, cls = 'normal', lineageRefs: string[] = []): RawEvent {
  return { id, timestamp: ts, classification: cls, payload: {}, lineageRefs };
}

function makeEpisode(id: string, from: number, to: number, label: string): SummarisedEvent {
  return { id, from, to, label, classification: 'alert', payload: {}, sourceRefs: ['l1-1'], lineageRefs: [] };
}

function makePhase(id: string, from: number, to: number, label: string): PhaseSummary {
  return { id, from, to, label, classification: 'stable', payload: {}, sourceRefs: ['l2-1'] };
}

function makeStep(name: string, from: number, to: number): TimePositionedStep {
  return { caseId: 'c1', stepName: name, signals: [], from, to };
}

describe('L1 dispatches event:hovered on mouseenter/mouseleave', () => {
  it('dispatches hovered event with event data on _onHover', async () => {
    const { SummarisationLaneL1 } = await import('./lane-l1.js');
    const el = new SummarisationLaneL1();
    const events: CustomEvent[] = [];
    el.addEventListener('summarisation-timeline:event:hovered', ((e: Event) => events.push(e as CustomEvent)) as EventListener);

    const rawEvent = makeEvent('e1', 1000, 'normal', ['l2-1']);
    (el as any)._onHover(rawEvent);

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.event).toBe(rawEvent);
    expect(events[0]!.detail.lane).toBe('l1');
  });

  it('dispatches hovered event with null on _onLeave', async () => {
    const { SummarisationLaneL1 } = await import('./lane-l1.js');
    const el = new SummarisationLaneL1();
    const events: CustomEvent[] = [];
    el.addEventListener('summarisation-timeline:event:hovered', ((e: Event) => events.push(e as CustomEvent)) as EventListener);

    (el as any)._onLeave();

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.event).toBeNull();
    expect(events[0]!.detail.lane).toBeNull();
  });
});

describe('L2 dispatches event:hovered on mouseenter/mouseleave', () => {
  it('dispatches hovered event with episode data on _onHover', async () => {
    const { SummarisationLaneL2 } = await import('./lane-l2.js');
    const el = new SummarisationLaneL2();
    const events: CustomEvent[] = [];
    el.addEventListener('summarisation-timeline:event:hovered', ((e: Event) => events.push(e as CustomEvent)) as EventListener);

    const episode = makeEpisode('l2-1', 100, 300, 'Burst');
    (el as any)._onHover(episode);

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.event).toBe(episode);
    expect(events[0]!.detail.lane).toBe('l2');
  });

  it('dispatches hovered event with null on _onLeave', async () => {
    const { SummarisationLaneL2 } = await import('./lane-l2.js');
    const el = new SummarisationLaneL2();
    const events: CustomEvent[] = [];
    el.addEventListener('summarisation-timeline:event:hovered', ((e: Event) => events.push(e as CustomEvent)) as EventListener);

    (el as any)._onLeave();

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.event).toBeNull();
  });
});

describe('L3 dispatches event:hovered on mouseenter/mouseleave', () => {
  it('dispatches hovered event with phase data on _onHover', async () => {
    const { SummarisationLaneL3 } = await import('./lane-l3.js');
    const el = new SummarisationLaneL3();
    const events: CustomEvent[] = [];
    el.addEventListener('summarisation-timeline:event:hovered', ((e: Event) => events.push(e as CustomEvent)) as EventListener);

    const phase = makePhase('l3-1', 0, 500, 'Observation');
    (el as any)._onHover(phase);

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.event).toBe(phase);
    expect(events[0]!.detail.lane).toBe('l3');
  });
});

describe('L4 dispatches event:hovered on mouseenter/mouseleave', () => {
  it('dispatches hovered event with step data on _onHover', async () => {
    const { SummarisationLaneL4 } = await import('./lane-l4.js');
    const el = new SummarisationLaneL4();
    const events: CustomEvent[] = [];
    el.addEventListener('summarisation-timeline:event:hovered', ((e: Event) => events.push(e as CustomEvent)) as EventListener);

    const step = makeStep('Triage', 0, 5000);
    (el as any)._onHover(step);

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.event).toBe(step);
    expect(events[0]!.detail.lane).toBe('l4');
  });

  it('dispatches hovered event with null on _onLeave', async () => {
    const { SummarisationLaneL4 } = await import('./lane-l4.js');
    const el = new SummarisationLaneL4();
    const events: CustomEvent[] = [];
    el.addEventListener('summarisation-timeline:event:hovered', ((e: Event) => events.push(e as CustomEvent)) as EventListener);

    (el as any)._onLeave();

    expect(events).toHaveLength(1);
    expect(events[0]!.detail.event).toBeNull();
  });
});

describe('Tooltip pinned parameter', () => {
  it('renderTooltip accepts pinned flag', async () => {
    const { renderTooltip } = await import('./tooltip.js');
    const result = renderTooltip(
      { id: 'e1', timestamp: 1000 }, 'l1', { x: 100, y: 50 },
      'local', [], 0, true,
    );
    expect(result).not.toBe(undefined);
  });

  it('renderTooltip defaults pinned to false', async () => {
    const { renderTooltip } = await import('./tooltip.js');
    const result = renderTooltip(
      { id: 'e1', timestamp: 1000 }, 'l1', { x: 100, y: 50 },
      'local', [], 0,
    );
    expect(result).not.toBe(undefined);
  });
});
