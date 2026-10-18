export type ExpressionType = 'from' | 'param' | 'literal';

export interface ExpressionValue {
  raw: string;
  type: ExpressionType;
}

export interface CoordinationStepParams {
  [key: string]: string;
}

export interface CoordinationStep {
  action: string;
  target?: string;
  model?: string;
  outputFormat?: string;
  drillDown?: boolean;
  params?: CoordinationStepParams;
  icon?: string;
  iconColor?: string;
  channel?: string;
}

export interface SignalBarrier {
  type: 'signal';
  name: string;
  description?: string;
}

export interface QuorumBarrier {
  type: 'quorum';
  name: string;
  required: number;
  of: number;
}

export type Barrier = SignalBarrier | QuorumBarrier;

export type SwimLanes = Record<string, CoordinationStep[]>;

export interface MatchCase {
  pattern: string;
  step: CoordinationStep;
}

export interface MatchRouting {
  type: 'match';
  expression: string;
  cases: MatchCase[];
}

export type PhaseItem =
  | { type: 'step'; step: CoordinationStep; routing?: MatchRouting }
  | { type: 'signal'; barrier: SignalBarrier }
  | { type: 'quorum'; barrier: QuorumBarrier }
  | { type: 'parallel'; lanes: SwimLanes };

export interface CoordinationPipeline {
  name: string;
  description?: string;
  agentCount?: number;
  barrierCount?: number;
  channelCount?: number;
  phases: PhaseItem[];
}

export function parseExpression(raw: string): ExpressionValue {
  if (raw.startsWith('${params.'))
    return { raw, type: 'param' };
  if (raw.startsWith('${from.') || raw.match(/^\$\{[a-z][\w-]*\.\w/))
    return { raw, type: 'from' };
  return { raw, type: 'literal' };
}
