export { EidosView } from './eidos-view.js';
export type {
  AgentDescriptor,
  Capability,
  Constraint,
  Disposition,
  DispositionValue,
  Goal,
  HealthStatus,
  GoalPriority,
  GoalVisibility,
  ConstraintSeverity,
} from './agent-types.js';

export { AgentCard } from './agent-card.js';
export { VotingView } from './voting-view.js';
export { DebateView } from './debate-view.js';
export type {
  PatternCategory,
  PatternCategoryName,
  AgencyCategoryName,
  OrchestrationPatternCategory,
  OrchestrationPatternType,
  DeliberationPatternCategory,
  DeliberationPatternType,
  AgentRef,
  AgentRefType,
  AggregationSpec,
  TerminationSpec,
  JudgmentSpec,
  FailurePolicy,
} from '@casehubio/blocks-ui-core';

export { AgentViewer } from './agent-viewer.js';
export type { AgentTab, AgentViewerData, BreadcrumbBackDetail } from './agent-viewer.js';

export { CoordinationPipelineView } from './coordination-pipeline-view.js';
export type {
  CoordinationPipeline,
  CoordinationStep,
  CoordinationStepParams,
  SwimLanes,
  MatchCase,
  MatchRouting,
  PhaseItem,
  ExpressionValue,
  ExpressionType,
  DrillDownDetail,
} from './coordination-types.js';

export { assignTiers, detectPreferredView } from './coordination-graph-model.js';
export type { GraphNode, GraphTier, GraphConnector, TierElement } from './coordination-graph-model.js';

export { CoordinationDiffView } from './coordination-diff-view.js';
export { computeCoordinationDiff } from './coordination-diff-model.js';
export type {
  DiffStatus,
  FieldChange,
  DiffAnnotation,
  AnnotatedPhaseItem,
  DiffSummary,
  DiffResult,
} from './coordination-diff-types.js';
