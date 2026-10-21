import type { PatternCategoryName } from './patterns/categories.js';

export type ExecutionState =
  | 'idle' | 'running' | 'waiting-for-agent'
  | 'waiting-for-event' | 'complete' | 'faulted' | 'cancelled';

export type ExecutionResult = 'completed' | 'failed' | 'escalated' | 'cancelled';

export type AgentRefType = 'worker' | 'channel' | 'human' | 'external' | 'composed';
export type AgentResultStatus = 'success' | 'failure' | 'timeout' | 'declined';

export interface AgentRef {
  readonly id?: string;
  readonly type: AgentRefType;
  readonly name?: string;
  readonly description?: string;
  readonly capabilities?: string[];
  readonly model?: string;
}

export interface AgentResult {
  readonly agentRef: AgentRef;
  readonly status: AgentResultStatus;
  readonly detail?: string;
  readonly error?: string;
  readonly duration?: number;
}

export interface AggregationSpec {
  type: string;
}

export interface TerminationSpec {
  type: string;
  iterations?: number;
  resolvedStatuses?: string[];
  maxDisputeRounds?: number;
  when?: string;
}

export type RoutingFailureAction = 'fail' | 'retry-broader' | 'escalate';
export type AggregationFailureAction = 'fail' | 'escalate' | 'retry-different';
export type BackoffStrategy = 'fixed' | 'linear' | 'exponential';

export interface AgentRetryPolicy {
  readonly maxRetries: number;
  readonly backoffStrategy: BackoffStrategy;
  readonly initialDelayMs?: number;
}

export interface FailurePolicy {
  readonly routingFailureAction: RoutingFailureAction;
  readonly aggregationFailureAction: AggregationFailureAction;
  readonly agentRetryPolicy?: AgentRetryPolicy;
}

export interface ExecutionModel {
  readonly pattern: PatternCategoryName;
  readonly routingStrategy?: string;
  readonly decompositionStrategy?: string;
  readonly activationStrategy?: string;
  readonly aggregationStrategy?: string;
  readonly terminationStrategy?: string;
  readonly failurePolicy: FailurePolicy;
}

export type OrchestrationEventType =
  | 'execution-started' | 'routing-decision' | 'activation-evaluated'
  | 'agent-dispatched' | 'agent-result' | 'agent-failed'
  | 'aggregation-completed' | 'termination-evaluated' | 'execution-completed';

export type RoutingOutcome = 'selected' | 'unresolvable' | 'escalate';
export type AggregationOutcome = 'resolved' | 'partial' | 'deadlocked';
export type TerminationOutcome = 'continue' | 'complete' | 'failed' | 'escalate';

export interface ExecutionStartedPayload {
  readonly type: 'execution-started';
  readonly model: ExecutionModel;
}

export interface RoutingDecisionPayload {
  readonly type: 'routing-decision';
  readonly outcome: RoutingOutcome;
  readonly selectedAgents?: readonly AgentRef[];
  readonly reason?: string;
}

export interface ActivationPayload {
  readonly type: 'activation-evaluated';
  readonly conditionMet: boolean;
  readonly conditionExpression?: string;
}

export interface AgentDispatchPayload {
  readonly type: 'agent-dispatched';
  readonly agentRef: AgentRef;
}

export interface AgentResultPayload {
  readonly type: 'agent-result' | 'agent-failed';
  readonly agentRef: AgentRef;
  readonly status: AgentResultStatus;
  readonly detail?: string;
  readonly error?: string;
  readonly duration?: number;
}

export interface AggregationPayload {
  readonly type: 'aggregation-completed';
  readonly outcome: AggregationOutcome;
  readonly remainingCount?: number;
}

export interface TerminationPayload {
  readonly type: 'termination-evaluated';
  readonly outcome: TerminationOutcome;
  readonly reason?: string;
}

export interface ExecutionCompletedPayload {
  readonly type: 'execution-completed';
  readonly result: ExecutionResult;
  readonly reason?: string;
}

export type OrchestrationPayload =
  | ExecutionStartedPayload
  | RoutingDecisionPayload
  | ActivationPayload
  | AgentDispatchPayload
  | AgentResultPayload
  | AggregationPayload
  | TerminationPayload
  | ExecutionCompletedPayload;

export interface OrchestrationAuditEvent {
  readonly id: string;
  readonly eventType: OrchestrationEventType;
  readonly executionId: string;
  readonly timestamp: string;
  readonly iteration?: number;
  readonly payload: OrchestrationPayload;
}

export interface ExecutionSnapshot {
  readonly executionId: string;
  readonly state: ExecutionState;
  readonly model: ExecutionModel;
  readonly result?: ExecutionResult;
  readonly activeAgents: readonly AgentRef[];
  readonly completedAgents: readonly AgentResult[];
  readonly iteration?: number;
  readonly startedAt?: string;
  readonly completedAt?: string;
}
