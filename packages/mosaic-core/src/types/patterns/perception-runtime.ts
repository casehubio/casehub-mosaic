export interface TimeRange {
  from: number;
  to: number;
}

export interface RawEvent {
  id: string;
  timestamp: number;
  classification: string;
  payload: Record<string, unknown>;
  lineageRefs: string[];
}

export interface SummarisedEvent {
  id: string;
  from: number;
  to: number;
  label: string;
  classification: string;
  payload: Record<string, unknown>;
  sourceRefs: string[];
  lineageRefs: string[];
}

export interface PhaseSummary {
  id: string;
  from: number;
  to: number;
  label: string;
  classification: string;
  payload: Record<string, unknown>;
  sourceRefs: string[];
  windowPolicy?: WindowPolicy;
}

export interface WindowPolicy {
  maxCount?: number;
  maxAge?: number;
}

export interface SignalDigest {
  type: string;
  summary: string;
  confidence?: number;
  keyFacts?: string[];
}

export interface TimePositionedStep {
  caseId: string;
  stepName: string;
  signals: readonly SignalDigest[];
  from: number;
  to: number;
}

export interface DecisionNarrative {
  explanation: string;
}

export interface SummarisationSnapshot {
  snapshotId: string;
  caseExecutionId: string;
  pipelineName: string;
  timeRange: TimeRange;
  rawEvents: RawEvent[];
  summarisedEvents: SummarisedEvent[];
  phaseSummaries: PhaseSummary[];
  steps: TimePositionedStep[];
  narrative?: DecisionNarrative;
}

export interface LineageIndex {
  upward: ReadonlyMap<string, readonly string[]>;
  downward: ReadonlyMap<string, readonly string[]>;
}

export function buildLineageIndex(
  _rawEvents: readonly RawEvent[],
  summarisedEvents: readonly SummarisedEvent[],
  phaseSummaries: readonly PhaseSummary[],
): LineageIndex {
  const upward = new Map<string, string[]>();
  const downward = new Map<string, string[]>();

  const addLink = (sourceId: string, targetId: string) => {
    const up = upward.get(sourceId);
    if (up) up.push(targetId);
    else upward.set(sourceId, [targetId]);

    const down = downward.get(targetId);
    if (down) down.push(sourceId);
    else downward.set(targetId, [sourceId]);
  };

  for (const ev of summarisedEvents) {
    for (const srcId of ev.sourceRefs) addLink(srcId, ev.id);
  }
  for (const phase of phaseSummaries) {
    for (const srcId of phase.sourceRefs) addLink(srcId, phase.id);
  }

  return { upward, downward };
}

export function toTimePositionedStep(step: {
  caseId: string;
  stepName: string;
  signals: readonly SignalDigest[];
  from: string;
  to: string;
}): TimePositionedStep {
  return {
    caseId: step.caseId,
    stepName: step.stepName,
    signals: step.signals,
    from: new Date(step.from).getTime(),
    to: new Date(step.to).getTime(),
  };
}

export function computeEffectiveTimeRange(snapshot: SummarisationSnapshot): TimeRange {
  let min = snapshot.timeRange.from;
  let max = snapshot.timeRange.to;

  for (const e of snapshot.rawEvents) {
    if (e.timestamp < min) min = e.timestamp;
    if (e.timestamp > max) max = e.timestamp;
  }
  for (const e of snapshot.summarisedEvents) {
    if (e.from < min) min = e.from;
    if (e.to > max) max = e.to;
  }
  for (const p of snapshot.phaseSummaries) {
    if (p.from < min) min = p.from;
    if (p.to > max) max = p.to;
  }
  for (const s of snapshot.steps) {
    if (s.from < min) min = s.from;
    if (s.to > max) max = s.to;
  }

  return { from: min, to: max };
}
