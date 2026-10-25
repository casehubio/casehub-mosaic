import type {
  AgentRefSpec, FailurePolicySpec, AggregationSpec, TerminationSpec,
  RoutingSpec, DecompositionSpec, ActivationSpec, GovernanceSpec,
  JudgmentSpecDef,
} from '../orchestration.js';

export type DeliberationPatternType =
  'voting' | 'debate' | 'negotiation' | 'coalition' | 'normative';

export interface DeliberationPatternCategory {
  category: 'deliberation';
  type: DeliberationPatternType;
  name?: string;
  description?: string;
  task?: string;
  agents?: AgentRefSpec[];
  judgment?: JudgmentSpecDef;
  maxRounds?: number;
  judge?: AgentRefSpec;
  routing?: RoutingSpec;
  decomposition?: DecompositionSpec;
  activation?: ActivationSpec;
  aggregation?: AggregationSpec;
  termination?: TerminationSpec[];
  governance?: GovernanceSpec;
  failurePolicy?: FailurePolicySpec;
}
