import type { AgentRef, FailurePolicy, AggregationSpec, TerminationSpec } from '../orchestration.js';

export type DeliberationPatternType =
  'voting' | 'debate' | 'negotiation' | 'coalition' | 'normative';

export interface JudgmentTrigger {
  type: string;
  threshold?: number;
  extractor?: string;
  every?: number;
}

export interface JudgmentCaller {
  type: string;
  callerName?: string;
  callerNames?: string[];
  agreement?: { type: string };
}

export interface JudgmentSpec {
  trigger: JudgmentTrigger;
  caller: JudgmentCaller;
}

export interface DeliberationPatternCategory {
  category: 'deliberation';
  type: DeliberationPatternType;
  name?: string;
  description?: string;
  agents?: AgentRef[];
  judgment?: JudgmentSpec;
  maxRounds?: number;
  judge?: AgentRef;
  aggregation?: AggregationSpec;
  termination?: TerminationSpec[];
  failurePolicy?: FailurePolicy;
}
