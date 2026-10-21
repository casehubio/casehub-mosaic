import type { AgentRef, FailurePolicy, AggregationSpec, TerminationSpec } from '../orchestration.js';

export type OrchestrationPatternType =
  'supervisor' | 'choreography' | 'saga' | 'decomposition';

export interface OrchestrationPatternCategory {
  category: 'orchestration';
  type: OrchestrationPatternType;
  name?: string;
  description?: string;
  agents?: AgentRef[];
  routing?: { type: string; guard?: string };
  decomposition?: { strategy: string };
  aggregation?: AggregationSpec;
  termination?: TerminationSpec[];
  failurePolicy?: FailurePolicy;
}
